-- Rework complet al sistemului de roadmaps.
--
-- Graful unui roadmap (noduri + săgeți) se mută din coloana JSONB `canvas_layout` în
-- tabele normalizate cu chei străine reale: legătura nod → lecție devine FK cu
-- `on delete set null` (dispare problema lecțiilor șterse care rămâneau referite în JSON),
-- iar muchiile nu pot lega noduri din roadmap-uri diferite datorită FK-urilor compuse.
-- Salvarea întregului graf este atomică prin RPC-ul `save_roadmap_graph` (security definer,
-- verificare de admin în interior). Tot aici se elimină sistemele moarte:
-- `study_roadmap_steps` (abandonat de aplicație în favoarea canvas-ului) și roadmap-urile
-- personale `user_study_roadmaps` + `user_study_roadmap_subjects` (tabele fără niciun UI).

-- 1) Tabelul-părinte rămâne `study_roadmaps` (coloane, RLS și index deja corecte);
--    primește doar `updated_at`, actualizat de RPC la fiecare salvare.
alter table public.study_roadmaps
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- 2) Nodurile grafului. `unique (roadmap_id, id)` există doar ca țintă pentru FK-urile
--    compuse din `roadmap_edges` — garantează la nivel de bază că o muchie nu poate lega
--    noduri din roadmap-uri diferite.
create table if not exists public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.study_roadmaps(id) on delete cascade,
  node_type text not null default 'subject',
  subject_part smallint,
  label text not null default '',
  importance_grade smallint not null default 3,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  color text not null default '#6366f1',
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint roadmap_nodes_type_check check (node_type in ('subject', 'note')),
  constraint roadmap_nodes_subject_part_check check (subject_part is null or subject_part between 1 and 3),
  constraint roadmap_nodes_subject_part_presence check (
    (node_type = 'note' and subject_part is null)
    or (node_type = 'subject' and subject_part is not null)
  ),
  constraint roadmap_nodes_importance_check check (importance_grade between 1 and 5),
  constraint roadmap_nodes_color_check check (color ~ '^#[0-9a-fA-F]{6}$'),
  constraint roadmap_nodes_roadmap_id_id_unique unique (roadmap_id, id)
);

create index if not exists roadmap_nodes_roadmap_idx on public.roadmap_nodes (roadmap_id);
create index if not exists roadmap_nodes_lesson_idx on public.roadmap_nodes (lesson_id) where lesson_id is not null;

-- 3) Muchiile grafului. Un singur FK simplu către `study_roadmaps` (embed PostgREST
--    neambiguu); capetele referă noduri prin FK-uri compuse `(roadmap_id, id)`.
create table if not exists public.roadmap_edges (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.study_roadmaps(id) on delete cascade,
  source_node_id uuid not null,
  target_node_id uuid not null,
  label text not null default '',
  color text not null default '#6366f1',
  created_at timestamptz not null default timezone('utc', now()),
  constraint roadmap_edges_color_check check (color ~ '^#[0-9a-fA-F]{6}$'),
  constraint roadmap_edges_no_self_loop check (source_node_id <> target_node_id),
  constraint roadmap_edges_unique_pair unique (roadmap_id, source_node_id, target_node_id),
  constraint roadmap_edges_source_fkey foreign key (roadmap_id, source_node_id)
    references public.roadmap_nodes (roadmap_id, id) on delete cascade,
  constraint roadmap_edges_target_fkey foreign key (roadmap_id, target_node_id)
    references public.roadmap_nodes (roadmap_id, id) on delete cascade
);

create index if not exists roadmap_edges_roadmap_idx on public.roadmap_edges (roadmap_id);
create index if not exists roadmap_edges_source_idx on public.roadmap_edges (roadmap_id, source_node_id);
create index if not exists roadmap_edges_target_idx on public.roadmap_edges (roadmap_id, target_node_id);

-- 4) RLS — aceeași paritate ca pe tabelul-părinte: citire pentru orice utilizator
--    autentificat (select-ul imbricat al elevilor ar întoarce altfel un graf gol),
--    scriere doar pentru adminii de curriculum.
alter table public.roadmap_nodes enable row level security;
alter table public.roadmap_edges enable row level security;

drop policy if exists roadmap_nodes_select on public.roadmap_nodes;
create policy roadmap_nodes_select on public.roadmap_nodes
  for select to authenticated
  using (true);

drop policy if exists roadmap_nodes_write_admin on public.roadmap_nodes;
create policy roadmap_nodes_write_admin on public.roadmap_nodes
  for all to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

drop policy if exists roadmap_edges_select on public.roadmap_edges;
create policy roadmap_edges_select on public.roadmap_edges
  for select to authenticated
  using (true);

drop policy if exists roadmap_edges_write_admin on public.roadmap_edges;
create policy roadmap_edges_write_admin on public.roadmap_edges
  for all to authenticated
  using (public.is_curriculum_admin())
  with check (public.is_curriculum_admin());

-- 5) Salvarea atomică a unui roadmap: metadate + înlocuirea completă a grafului într-o
--    singură tranzacție. Apelată doar din editorul de admin; verificarea de rol este în
--    interior, iar mesajele de eroare sunt cele afișate utilizatorului (vezi allowlist-ul
--    din userFacingError.js).
create or replace function public.save_roadmap_graph(
  p_roadmap_id uuid,
  p_title text,
  p_description text,
  p_profile text,
  p_order_index integer,
  p_nodes jsonb,
  p_edges jsonb
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_curriculum_admin() then
    raise exception 'Acces neautorizat.';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Titlul roadmap-ului este obligatoriu.';
  end if;

  if p_profile is null or p_profile not in ('mate_info', 'tehnologic', 'stiintele_naturii', 'pedagogic') then
    raise exception 'Program invalid.';
  end if;

  if jsonb_typeof(coalesce(p_nodes, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_edges, '[]'::jsonb)) <> 'array' then
    raise exception 'Date invalide.';
  end if;

  if p_roadmap_id is null then
    insert into public.study_roadmaps (profile, title, description, order_index)
    values (p_profile, trim(p_title), coalesce(p_description, ''), coalesce(p_order_index, 0))
    returning id into v_id;
  else
    update public.study_roadmaps
       set profile = p_profile,
           title = trim(p_title),
           description = coalesce(p_description, ''),
           order_index = coalesce(p_order_index, 0),
           updated_at = timezone('utc', now())
     where id = p_roadmap_id
     returning id into v_id;
    if v_id is null then
      raise exception 'Roadmap inexistent.';
    end if;
  end if;

  -- Înlocuire completă a grafului. Valorile sunt normalizate defensiv (clamp pe importanță
  -- și subiect, culori validate); un lesson_id care nu mai există devine null în loc să
  -- blocheze salvarea.
  delete from public.roadmap_edges where roadmap_id = v_id;
  delete from public.roadmap_nodes where roadmap_id = v_id;

  insert into public.roadmap_nodes
    (id, roadmap_id, node_type, subject_part, label, importance_grade, position_x, position_y, color, lesson_id)
  select
    coalesce(n.id, gen_random_uuid()),
    v_id,
    case when n.node_type = 'note' then 'note' else 'subject' end,
    case when n.node_type = 'note' then null
         else least(greatest(coalesce(n.subject_part, 1), 1), 3) end,
    coalesce(n.label, ''),
    least(greatest(coalesce(n.importance_grade, 3), 1), 5),
    coalesce(n.position_x, 0),
    coalesce(n.position_y, 0),
    case when n.color ~ '^#[0-9a-fA-F]{6}$' then n.color else '#6366f1' end,
    (select l.id from public.lessons l where l.id = n.lesson_id)
  from jsonb_to_recordset(coalesce(p_nodes, '[]'::jsonb)) as n(
    id uuid,
    node_type text,
    subject_part smallint,
    label text,
    importance_grade smallint,
    position_x double precision,
    position_y double precision,
    color text,
    lesson_id uuid
  );

  -- Muchiile „orfane” (capete inexistente) și duplicatele sunt filtrate în loc să provoace
  -- erori de FK/unicitate — același comportament îngăduitor ca vechiul normalizeLayout.
  insert into public.roadmap_edges (id, roadmap_id, source_node_id, target_node_id, label, color)
  select distinct on (e.source_node_id, e.target_node_id)
    coalesce(e.id, gen_random_uuid()),
    v_id,
    e.source_node_id,
    e.target_node_id,
    coalesce(e.label, ''),
    case when e.color ~ '^#[0-9a-fA-F]{6}$' then e.color else '#6366f1' end
  from jsonb_to_recordset(coalesce(p_edges, '[]'::jsonb)) as e(
    id uuid,
    source_node_id uuid,
    target_node_id uuid,
    label text,
    color text
  )
  where e.source_node_id is not null
    and e.target_node_id is not null
    and e.source_node_id <> e.target_node_id
    and exists (select 1 from public.roadmap_nodes rn where rn.roadmap_id = v_id and rn.id = e.source_node_id)
    and exists (select 1 from public.roadmap_nodes rn where rn.roadmap_id = v_id and rn.id = e.target_node_id);

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function public.save_roadmap_graph(uuid, text, text, text, integer, jsonb, jsonb) from public;
revoke all on function public.save_roadmap_graph(uuid, text, text, text, integer, jsonb, jsonb) from anon;
grant execute on function public.save_roadmap_graph(uuid, text, text, text, integer, jsonb, jsonb) to authenticated;

-- 6) Migrarea datelor existente din `canvas_layout` în tabelele noi. ID-urile vechi de
--    noduri pot fi non-UUID (fallback-ul `node-<timestamp>-<rand>` din vechiul frontend),
--    așa că se generează UUID-uri noi și se remapează muchiile. Blocul este idempotent:
--    după ștergerea coloanei, condiția de gardă nu mai este îndeplinită.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'study_roadmaps' and column_name = 'canvas_layout'
  ) then
    create temporary table _roadmap_node_map (roadmap_id uuid, old_id text, new_id uuid) on commit drop;

    insert into _roadmap_node_map (roadmap_id, old_id, new_id)
    select r.id, n->>'id', gen_random_uuid()
    from public.study_roadmaps r
    cross join jsonb_array_elements(coalesce(r.canvas_layout->'nodes', '[]'::jsonb)) n
    where n->>'id' is not null
      and not exists (select 1 from public.roadmap_nodes rn where rn.roadmap_id = r.id);

    insert into public.roadmap_nodes
      (id, roadmap_id, node_type, subject_part, label, importance_grade, position_x, position_y, color, lesson_id)
    select
      m.new_id,
      r.id,
      case when n->>'type' = 'note' then 'note' else 'subject' end,
      case when n->>'type' = 'note' then null
           else least(greatest(coalesce(round(nullif(n->>'subject_part', '')::numeric)::smallint, 1), 1), 3) end,
      coalesce(n->>'label', ''),
      least(greatest(coalesce(round(nullif(n->>'importance_grade', '')::numeric)::smallint, 3), 1), 5),
      coalesce(nullif(n->>'x', '')::double precision, 0),
      coalesce(nullif(n->>'y', '')::double precision, 0),
      case when n->>'color' ~ '^#[0-9a-fA-F]{6}$' then n->>'color' else '#6366f1' end,
      (select l.id from public.lessons l where l.id::text = n->>'lesson_id')
    from public.study_roadmaps r
    cross join jsonb_array_elements(coalesce(r.canvas_layout->'nodes', '[]'::jsonb)) n
    join _roadmap_node_map m on m.roadmap_id = r.id and m.old_id = n->>'id';

    insert into public.roadmap_edges (roadmap_id, source_node_id, target_node_id, label, color)
    select distinct on (r.id, ms.new_id, mt.new_id)
      r.id,
      ms.new_id,
      mt.new_id,
      coalesce(e->>'label', ''),
      case when e->>'color' ~ '^#[0-9a-fA-F]{6}$' then e->>'color' else '#6366f1' end
    from public.study_roadmaps r
    cross join jsonb_array_elements(coalesce(r.canvas_layout->'edges', '[]'::jsonb)) e
    join _roadmap_node_map ms on ms.roadmap_id = r.id and ms.old_id = e->>'from'
    join _roadmap_node_map mt on mt.roadmap_id = r.id and mt.old_id = e->>'to'
    where ms.new_id <> mt.new_id;
  end if;
end $$;

alter table public.study_roadmaps drop column if exists canvas_layout;

-- 7) Eliminarea sistemelor moarte. Ștergerea contului nu este afectată: aceste tabele
--    cascadau din auth.users, iar după drop pur și simplu nu mai există nimic de șters.
drop table if exists public.study_roadmap_steps cascade;
drop table if exists public.user_study_roadmap_subjects cascade;
drop table if exists public.user_study_roadmaps cascade;
