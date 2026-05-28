-- Data examenului BAC la matematică (vizibilă tuturor, editabilă de admin principal).

alter table public.platform_settings
  add column if not exists bac_exam_date date;

update public.platform_settings
set bac_exam_date = coalesce(
  bac_exam_date,
  case
    when make_date(extract(year from current_date)::int, 6, 30) >= current_date
      then make_date(extract(year from current_date)::int, 6, 30)
    else make_date(extract(year from current_date)::int + 1, 6, 30)
  end
)
where id = 1;

create or replace function public.default_bac_exam_date()
returns date
language sql
immutable
as $$
  select case
    when make_date(extract(year from current_date)::int, 6, 30) >= current_date
      then make_date(extract(year from current_date)::int, 6, 30)
    else make_date(extract(year from current_date)::int + 1, 6, 30)
  end;
$$;

create or replace function public.get_bac_exam_date()
returns date
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select ps.bac_exam_date from public.platform_settings ps where ps.id = 1 limit 1),
    public.default_bac_exam_date()
  );
$$;

grant execute on function public.get_bac_exam_date() to anon, authenticated;

create or replace function public.set_bac_exam_date(p_date date)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
begin
  if not public.is_primary_admin() then
    raise exception 'Doar administratorul principal poate modifica data examenului.';
  end if;

  if p_date is null then
    raise exception 'Data examenului este obligatorie.';
  end if;

  v_date := p_date;

  insert into public.platform_settings (id, bac_exam_date, updated_at, updated_by)
  values (
    1,
    v_date,
    now(),
    public.normalize_db_email(auth.jwt() ->> 'email')
  )
  on conflict (id) do update
  set
    bac_exam_date = excluded.bac_exam_date,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;

  return v_date;
end;
$$;

grant execute on function public.set_bac_exam_date(date) to authenticated;
