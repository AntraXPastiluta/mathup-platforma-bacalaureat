-- Fix: "nu s-a putut încărca lecția" (HTTP 403 / "permission denied for table quiz_questions").
--
-- Regresie introdusă de 20260701000000_security_consolidation.sql:
--   * `revoke select on public.quiz_questions from authenticated` — adminii citesc
--     tabelul direct (au nevoie de correct_option_index în panoul de administrare),
--     dar GRANT-ul de tabel e verificat ÎNAINTE de RLS, deci primeau permission denied.
--   * view-ul `quiz_questions_student` a rămas `security_invoker = true` — elevii
--     citeau astfel tabelul de bază sub propriul rol (fără SELECT + RLS doar-admin),
--     deci tot permission denied.
--
-- Intenția corectă (vezi comentariul „admins on base table; students use view only”):
--   - Adminii citesc `quiz_questions` direct, limitați la rândurile lor de politica
--     RLS `quiz_questions_select_admin` (= is_curriculum_admin()).
--   - Elevii citesc DOAR prin view-ul sanitizat (fără correct_option_index), care
--     trebuie să ruleze ca proprietar (SECURITY DEFINER) ca să treacă de RLS-ul
--     doar-admin al tabelului de bază, cu poarta de acces în clauza WHERE.

-- 1) Adminii citesc tabelul de bază. Re-acordăm SELECT rolului `authenticated`;
--    RLS (`quiz_questions_select_admin`) păstrează rândurile vizibile doar pentru
--    admini, deci un elev care interoghează direct tabelul primește 0 rânduri
--    (nu se scurge correct_option_index).
grant select on public.quiz_questions to authenticated;

-- 2) View-ul de elev redevine SECURITY DEFINER (rulează ca proprietarul `postgres`),
--    ca să poată servi întrebările sanitizate, gardat de user_may_read_lesson_quiz().
--    Nu expune niciodată correct_option_index.
create or replace view public.quiz_questions_student
with (security_invoker = false)
as
select
  q.id,
  q.lesson_id,
  q.question_text,
  q.options,
  q.image_url,
  q.created_at
from public.quiz_questions q
where public.user_may_read_lesson_quiz(q.lesson_id);

grant select on public.quiz_questions_student to authenticated;
