-- Personal study roadmaps with canvas layout and subject importance

CREATE TABLE IF NOT EXISTS public.user_study_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Roadmap personal',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_study_roadmap_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.user_study_roadmaps (id) ON DELETE CASCADE,
  subject_part smallint NOT NULL,
  importance_grade smallint NOT NULL DEFAULT 3,
  position_x integer NOT NULL DEFAULT 80,
  position_y integer NOT NULL DEFAULT 80,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_study_roadmap_subjects_subject_part_check CHECK (subject_part IN (1, 2, 3)),
  CONSTRAINT user_study_roadmap_subjects_importance_check CHECK (importance_grade BETWEEN 1 AND 5),
  CONSTRAINT user_study_roadmap_subjects_unique UNIQUE (roadmap_id, subject_part)
);

CREATE INDEX IF NOT EXISTS user_study_roadmaps_user_idx
  ON public.user_study_roadmaps (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS user_study_roadmap_subjects_roadmap_idx
  ON public.user_study_roadmap_subjects (roadmap_id, subject_part);

ALTER TABLE public.user_study_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_roadmap_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_study_roadmaps_select_own ON public.user_study_roadmaps;
CREATE POLICY user_study_roadmaps_select_own
  ON public.user_study_roadmaps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_study_roadmaps_insert_own ON public.user_study_roadmaps;
CREATE POLICY user_study_roadmaps_insert_own
  ON public.user_study_roadmaps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_active_premium());

DROP POLICY IF EXISTS user_study_roadmaps_update_own ON public.user_study_roadmaps;
CREATE POLICY user_study_roadmaps_update_own
  ON public.user_study_roadmaps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_active_premium());

DROP POLICY IF EXISTS user_study_roadmaps_delete_own ON public.user_study_roadmaps;
CREATE POLICY user_study_roadmaps_delete_own
  ON public.user_study_roadmaps FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.has_active_premium());

DROP POLICY IF EXISTS user_study_roadmap_subjects_select_own ON public.user_study_roadmap_subjects;
CREATE POLICY user_study_roadmap_subjects_select_own
  ON public.user_study_roadmap_subjects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_study_roadmaps r
      WHERE r.id = user_study_roadmap_subjects.roadmap_id
        AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS user_study_roadmap_subjects_write_own ON public.user_study_roadmap_subjects;
CREATE POLICY user_study_roadmap_subjects_write_own
  ON public.user_study_roadmap_subjects FOR ALL TO authenticated
  USING (
    public.has_active_premium()
    AND EXISTS (
      SELECT 1
      FROM public.user_study_roadmaps r
      WHERE r.id = user_study_roadmap_subjects.roadmap_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_active_premium()
    AND EXISTS (
      SELECT 1
      FROM public.user_study_roadmaps r
      WHERE r.id = user_study_roadmap_subjects.roadmap_id
        AND r.user_id = auth.uid()
    )
  );
