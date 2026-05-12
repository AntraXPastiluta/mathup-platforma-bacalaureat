-- Canvas layout for admin-managed roadmaps and premium-only viewing

ALTER TABLE public.study_roadmaps
  ADD COLUMN IF NOT EXISTS canvas_layout jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb;

DROP POLICY IF EXISTS study_roadmaps_select_authenticated ON public.study_roadmaps;
CREATE POLICY study_roadmaps_select_premium
  ON public.study_roadmaps FOR SELECT TO authenticated
  USING (public.has_active_premium() OR public.is_curriculum_admin());

DROP POLICY IF EXISTS study_roadmap_steps_select_authenticated ON public.study_roadmap_steps;
CREATE POLICY study_roadmap_steps_select_premium
  ON public.study_roadmap_steps FOR SELECT TO authenticated
  USING (public.has_active_premium() OR public.is_curriculum_admin());

DROP POLICY IF EXISTS user_study_roadmaps_insert_own ON public.user_study_roadmaps;
DROP POLICY IF EXISTS user_study_roadmaps_update_own ON public.user_study_roadmaps;
DROP POLICY IF EXISTS user_study_roadmaps_delete_own ON public.user_study_roadmaps;
DROP POLICY IF EXISTS user_study_roadmap_subjects_write_own ON public.user_study_roadmap_subjects;

DROP POLICY IF EXISTS user_study_roadmaps_admin_all ON public.user_study_roadmaps;
CREATE POLICY user_study_roadmaps_admin_all
  ON public.user_study_roadmaps FOR ALL TO authenticated
  USING (public.is_curriculum_admin())
  WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS user_study_roadmap_subjects_admin_all ON public.user_study_roadmap_subjects;
CREATE POLICY user_study_roadmap_subjects_admin_all
  ON public.user_study_roadmap_subjects FOR ALL TO authenticated
  USING (public.is_curriculum_admin())
  WITH CHECK (public.is_curriculum_admin());
