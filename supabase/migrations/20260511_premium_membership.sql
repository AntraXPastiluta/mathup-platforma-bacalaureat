-- ScholarBAC premium membership, roadmaps, and content access helpers

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_part_count smallint NOT NULL DEFAULT 1;

ALTER TABLE public.lesson_files
  ADD COLUMN IF NOT EXISTS is_solved_content boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.premium_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  purchased_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamptz NOT NULL,
  amount_paid numeric,
  currency text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT premium_entitlements_status_check CHECK (
    status IN ('active', 'expired', 'refunded')
  )
);

CREATE TABLE IF NOT EXISTS public.premium_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL,
  amount_paid numeric,
  currency text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.study_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT study_roadmaps_profile_check CHECK (
    profile IN ('mate_info', 'tehnologic', 'stiintele_naturii', 'pedagogic')
  )
);

CREATE TABLE IF NOT EXISTS public.study_roadmap_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.study_roadmaps (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  lesson_id uuid REFERENCES public.lessons (id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  requires_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS premium_entitlements_status_idx
  ON public.premium_entitlements (status, expires_at);

CREATE INDEX IF NOT EXISTS study_roadmaps_profile_order_idx
  ON public.study_roadmaps (profile, order_index);

CREATE INDEX IF NOT EXISTS study_roadmap_steps_roadmap_order_idx
  ON public.study_roadmap_steps (roadmap_id, order_index);

CREATE OR REPLACE FUNCTION public.has_active_premium(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT true
      FROM public.premium_entitlements pe
      WHERE pe.user_id = target_user_id
        AND pe.status = 'active'
        AND pe.expires_at > timezone('utc'::text, now())
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO anon, authenticated, service_role;

ALTER TABLE public.premium_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_roadmap_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS premium_entitlements_select_own ON public.premium_entitlements;
CREATE POLICY premium_entitlements_select_own
  ON public.premium_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS premium_orders_select_own ON public.premium_orders;
CREATE POLICY premium_orders_select_own
  ON public.premium_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS study_roadmaps_select_authenticated ON public.study_roadmaps;
CREATE POLICY study_roadmaps_select_authenticated
  ON public.study_roadmaps FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS study_roadmap_steps_select_authenticated ON public.study_roadmap_steps;
CREATE POLICY study_roadmap_steps_select_authenticated
  ON public.study_roadmap_steps FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS study_roadmaps_admin_all ON public.study_roadmaps;
CREATE POLICY study_roadmaps_admin_all
  ON public.study_roadmaps FOR ALL TO authenticated
  USING (public.is_curriculum_admin())
  WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS study_roadmap_steps_admin_all ON public.study_roadmap_steps;
CREATE POLICY study_roadmap_steps_admin_all
  ON public.study_roadmap_steps FOR ALL TO authenticated
  USING (public.is_curriculum_admin())
  WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS quiz_questions_select_premium ON public.quiz_questions;
CREATE POLICY quiz_questions_select_premium
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    public.has_active_premium()
    OR NOT EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = quiz_questions.lesson_id
        AND (
          l.is_premium
          OR l.subject_part = 3
          OR l.profile <> 'mate_info'
        )
    )
  );

DROP POLICY IF EXISTS lesson_files_select_premium ON public.lesson_files;
CREATE POLICY lesson_files_select_premium
  ON public.lesson_files FOR SELECT TO authenticated
  USING (
    (
      public.has_active_premium()
      OR NOT lesson_files.is_solved_content
    )
    AND (
      public.has_active_premium()
      OR NOT EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = lesson_files.lesson_id
          AND (
            l.is_premium
            OR l.subject_part = 3
            OR l.profile <> 'mate_info'
          )
      )
    )
  );

DROP POLICY IF EXISTS user_progress_insert_premium ON public.user_progress;
CREATE POLICY user_progress_insert_premium
  ON public.user_progress FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_active_premium()
      OR NOT EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = user_progress.lesson_id
          AND (
            l.is_premium
            OR l.subject_part = 3
            OR l.profile <> 'mate_info'
          )
      )
    )
  );

DROP POLICY IF EXISTS user_progress_update_premium ON public.user_progress;
CREATE POLICY user_progress_update_premium
  ON public.user_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_active_premium()
      OR NOT EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = user_progress.lesson_id
          AND (
            l.is_premium
            OR l.subject_part = 3
            OR l.profile <> 'mate_info'
          )
      )
    )
  );

UPDATE public.lessons
SET is_premium = true
WHERE subject_part = 3 OR profile <> 'mate_info';
