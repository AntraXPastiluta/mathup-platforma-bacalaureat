-- MathUP production baseline schema (public)
-- Captured from linked project dhphstiemdzfglncqyev
-- Enables fresh local supabase db reset without Dashboard DDL


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auth_user_email_exists"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  IF NOT public.is_curriculum_admin() THEN
  RAISE EXCEPTION 'Nu ai permisiunea s─â verifici acest email.';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(trim(email)) = lower(trim(coalesce(p_email, '')))
  );
END;
$$;


ALTER FUNCTION "public"."auth_user_email_exists"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_bac_exam_date"() RETURNS "date"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when make_date(extract(year from current_date)::int, 6, 30) >= current_date
      then make_date(extract(year from current_date)::int, 6, 30)
    else make_date(extract(year from current_date)::int + 1, 6, 30)
  end;
$$;


ALTER FUNCTION "public"."default_bac_exam_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bac_exam_date"() RETURNS "date"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select ps.bac_exam_date from public.platform_settings ps where ps.id = 1 limit 1),
    public.default_bac_exam_date()
  );
$$;


ALTER FUNCTION "public"."get_bac_exam_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_first_curriculum_admin_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.normalize_db_email(cae.email)
  from public.curriculum_admin_emails cae
  order by cae.created_at asc
  limit 1;
$$;


ALTER FUNCTION "public"."get_first_curriculum_admin_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_maintenance_mode"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select maintenance_enabled from public.platform_settings where id = 1 limit 1),
    false
  );
$$;


ALTER FUNCTION "public"."get_maintenance_mode"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_primary_admin_email"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_curriculum_admin() then
    return null;
  end if;
  return public.get_primary_admin_email_value();
end;
$$;


ALTER FUNCTION "public"."get_primary_admin_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_primary_admin_email_value"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    nullif(public.normalize_db_email(ps.primary_admin_email), ''),
    public.get_first_curriculum_admin_email()
  )
  from public.platform_settings ps
  where ps.id = 1
  limit 1;
$$;


ALTER FUNCTION "public"."get_primary_admin_email_value"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_active_premium"("target_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
    (
      SELECT public.is_curriculum_admin()
      WHERE target_user_id IS NOT DISTINCT FROM auth.uid()
      LIMIT 1
    ),
    false
  );
$$;


ALTER FUNCTION "public"."has_active_premium"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_curriculum_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.curriculum_admin_emails
    WHERE lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;


ALTER FUNCTION "public"."is_curriculum_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_primary_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.get_primary_admin_email_value() <> ''
    and public.get_primary_admin_email_value() = public.normalize_db_email(auth.jwt() ->> 'email');
$$;


ALTER FUNCTION "public"."is_primary_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_primary_curriculum_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'cruceanu.cristian3004@gmail.com';
$$;


ALTER FUNCTION "public"."is_primary_curriculum_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_primary_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    lower(nullif(trim(auth.jwt() ->> 'email'), '')) = lower(
      nullif(trim((select primary_admin_email from public.platform_settings where id = 1 limit 1)), '')
    ),
    false
  );
$$;


ALTER FUNCTION "public"."is_primary_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_premium_entitlements_for_admin"() RETURNS TABLE("user_id" "uuid", "email" "text", "status" "text", "expires_at" timestamp with time zone, "purchased_at" timestamp with time zone, "cancel_at_period_end" boolean, "stripe_subscription_id" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or not public.is_curriculum_admin() then
    raise exception 'Neautorizat';
  end if;

  return query
  select
    pe.user_id,
    au.email::text,
    pe.status,
    pe.expires_at,
    pe.purchased_at,
    coalesce(pe.cancel_at_period_end, false),
    pe.stripe_subscription_id
  from public.premium_entitlements pe
  join auth.users au on au.id = pe.user_id
  where pe.status = 'active'
    and pe.expires_at > now()
  order by pe.expires_at desc, au.email asc;
end;
$$;


ALTER FUNCTION "public"."list_premium_entitlements_for_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_db_email"("p_email" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select lower(trim(coalesce(p_email, '')));
$$;


ALTER FUNCTION "public"."normalize_db_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_premium_entitlement"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or not public.is_curriculum_admin() then
    raise exception 'Neautorizat';
  end if;

  if not public.is_primary_curriculum_admin() then
    raise exception 'Doar administratorul principal poate elimina statusul Premium.';
  end if;

  update public.premium_entitlements
  set
    status = 'refunded',
    expires_at = now(),
    cancel_at_period_end = false,
    stripe_subscription_id = null,
    updated_at = now()
  where user_id = p_user_id
    and status = 'active';

  if not found then
    raise exception 'Utilizatorul nu are un abonament Premium activ.';
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_premium_entitlement"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_bac_exam_date"("p_date" "date") RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_bac_exam_date"("p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_maintenance_mode"("p_enabled" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  actor_email text := nullif(trim(auth.jwt() ->> 'email'), '');
  configured_primary text;
begin
  if actor_email is null then
    raise exception 'Autentificare necesar─â.';
  end if;

  configured_primary := nullif(
    trim((select primary_admin_email from public.platform_settings where id = 1 limit 1)),
    ''
  );

  if configured_primary is null then
    raise exception 'Seteaz─â primary_admin_email ├«n platform_settings (Supabase) ├«nainte de a folosi toggle-ul.';
  end if;

  if lower(actor_email) <> lower(configured_primary) then
    raise exception 'Doar administratorul principal poate modifica modul de mentenan╚¢─â.';
  end if;

  update public.platform_settings
  set
    maintenance_enabled = coalesce(p_enabled, false),
    updated_at = now(),
    updated_by = actor_email
  where id = 1;

  return coalesce(p_enabled, false);
end;
$$;


ALTER FUNCTION "public"."set_maintenance_mode"("p_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_quiz_answer"("p_question_id" "uuid", "p_selected_index" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_correct integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select correct_option_index
  into v_correct
  from public.quiz_questions
  where id = p_question_id;

  if not found then
    raise exception 'Question not found';
  end if;

  return jsonb_build_object('correct', p_selected_index = v_correct);
end;
$$;


ALTER FUNCTION "public"."submit_quiz_answer"("p_question_id" "uuid", "p_selected_index" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_deletion_tokens" (
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."account_deletion_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_admin_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."curriculum_admin_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gdpr_export_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gdpr_export_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_solved_content" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."lesson_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "video_url" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."lesson_parts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "video_url" "text",
    "difficulty" "text" DEFAULT 'mediu'::"text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "profile" "text" DEFAULT 'mate_info'::"text" NOT NULL,
    "subject_part" smallint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_premium" boolean DEFAULT false NOT NULL,
    "preview_part_count" smallint DEFAULT 1 NOT NULL,
    CONSTRAINT "lessons_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['usor'::"text", 'mediu'::"text", 'greu'::"text"]))),
    CONSTRAINT "lessons_profile_check" CHECK (("profile" = ANY (ARRAY['mate_info'::"text", 'tehnologic'::"text", 'stiintele_naturii'::"text", 'pedagogic'::"text"]))),
    CONSTRAINT "lessons_subject_part_check" CHECK (("subject_part" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "email" "text" NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."platform_admins" IS 'Emailuri care pot modifica curriculum-ul ╚Öi storage-ul materials. Trebuie s─â coincid─â cu logica isAdmin din aplica╚¢ie sau o ├«nlocuie╚Öti doar cu RLS.';



CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" smallint DEFAULT 1 NOT NULL,
    "maintenance_enabled" boolean DEFAULT false NOT NULL,
    "primary_admin_email" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "text",
    "bac_exam_date" "date",
    CONSTRAINT "platform_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."premium_entitlements" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "purchased_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "amount_paid" numeric,
    "currency" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    CONSTRAINT "premium_entitlements_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."premium_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."premium_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "status" "text" NOT NULL,
    "amount_paid" numeric,
    "currency" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."premium_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_solved_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."program_solved_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "options" "jsonb" NOT NULL,
    "correct_option_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_roadmap_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roadmap_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "lesson_id" "uuid",
    "order_index" integer DEFAULT 0 NOT NULL,
    "requires_premium" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."study_roadmap_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_roadmaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "canvas_layout" "jsonb" DEFAULT '{"edges": [], "nodes": []}'::"jsonb" NOT NULL,
    CONSTRAINT "study_roadmaps_profile_check" CHECK (("profile" = ANY (ARRAY['mate_info'::"text", 'tehnologic'::"text", 'stiintele_naturii'::"text", 'pedagogic'::"text"])))
);


ALTER TABLE "public"."study_roadmaps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "score" numeric,
    "last_accessed" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "is_correct" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_study_roadmap_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roadmap_id" "uuid" NOT NULL,
    "subject_part" smallint NOT NULL,
    "importance_grade" smallint DEFAULT 3 NOT NULL,
    "position_x" integer DEFAULT 80 NOT NULL,
    "position_y" integer DEFAULT 80 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "user_study_roadmap_subjects_importance_check" CHECK ((("importance_grade" >= 1) AND ("importance_grade" <= 5))),
    CONSTRAINT "user_study_roadmap_subjects_subject_part_check" CHECK (("subject_part" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."user_study_roadmap_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_study_roadmaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'Roadmap personal'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_study_roadmaps" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_deletion_tokens"
    ADD CONSTRAINT "account_deletion_tokens_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."curriculum_admin_emails"
    ADD CONSTRAINT "curriculum_admin_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gdpr_export_logs"
    ADD CONSTRAINT "gdpr_export_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_files"
    ADD CONSTRAINT "lesson_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_parts"
    ADD CONSTRAINT "lesson_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."premium_entitlements"
    ADD CONSTRAINT "premium_entitlements_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."premium_entitlements"
    ADD CONSTRAINT "premium_entitlements_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."premium_orders"
    ADD CONSTRAINT "premium_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."premium_orders"
    ADD CONSTRAINT "premium_orders_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."program_solved_variants"
    ADD CONSTRAINT "program_solved_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_roadmap_steps"
    ADD CONSTRAINT "study_roadmap_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_roadmaps"
    ADD CONSTRAINT "study_roadmaps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_quiz_attempts"
    ADD CONSTRAINT "user_quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_study_roadmap_subjects"
    ADD CONSTRAINT "user_study_roadmap_subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_study_roadmap_subjects"
    ADD CONSTRAINT "user_study_roadmap_subjects_unique" UNIQUE ("roadmap_id", "subject_part");



ALTER TABLE ONLY "public"."user_study_roadmaps"
    ADD CONSTRAINT "user_study_roadmaps_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "curriculum_admin_emails_email_lower_key" ON "public"."curriculum_admin_emails" USING "btree" ("lower"(TRIM(BOTH FROM "email")));



CREATE INDEX "gdpr_export_logs_user_created_idx" ON "public"."gdpr_export_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "lesson_files_lesson_idx" ON "public"."lesson_files" USING "btree" ("lesson_id", "created_at");



CREATE INDEX "lesson_parts_lesson_order_idx" ON "public"."lesson_parts" USING "btree" ("lesson_id", "order_index");



CREATE INDEX "lessons_profile_subject_order_idx" ON "public"."lessons" USING "btree" ("profile", "subject_part", "order_index");



CREATE INDEX "premium_entitlements_status_idx" ON "public"."premium_entitlements" USING "btree" ("status", "expires_at");



CREATE UNIQUE INDEX "premium_entitlements_stripe_subscription_id_key" ON "public"."premium_entitlements" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "program_solved_variants_profile_created_idx" ON "public"."program_solved_variants" USING "btree" ("profile", "created_at" DESC);



CREATE INDEX "quiz_questions_lesson_idx" ON "public"."quiz_questions" USING "btree" ("lesson_id", "created_at");



CREATE INDEX "study_roadmap_steps_roadmap_order_idx" ON "public"."study_roadmap_steps" USING "btree" ("roadmap_id", "order_index");



CREATE INDEX "study_roadmaps_profile_order_idx" ON "public"."study_roadmaps" USING "btree" ("profile", "order_index");



CREATE INDEX "user_progress_user_idx" ON "public"."user_progress" USING "btree" ("user_id");



CREATE UNIQUE INDEX "user_progress_user_lesson_uidx" ON "public"."user_progress" USING "btree" ("user_id", "lesson_id");



CREATE INDEX "user_quiz_attempts_user_wrong_idx" ON "public"."user_quiz_attempts" USING "btree" ("user_id", "is_correct", "created_at" DESC);



CREATE INDEX "user_study_roadmap_subjects_roadmap_idx" ON "public"."user_study_roadmap_subjects" USING "btree" ("roadmap_id", "subject_part");



CREATE INDEX "user_study_roadmaps_user_idx" ON "public"."user_study_roadmaps" USING "btree" ("user_id", "updated_at" DESC);



ALTER TABLE ONLY "public"."account_deletion_tokens"
    ADD CONSTRAINT "account_deletion_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gdpr_export_logs"
    ADD CONSTRAINT "gdpr_export_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_files"
    ADD CONSTRAINT "lesson_files_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_parts"
    ADD CONSTRAINT "lesson_parts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."premium_entitlements"
    ADD CONSTRAINT "premium_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."premium_orders"
    ADD CONSTRAINT "premium_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_roadmap_steps"
    ADD CONSTRAINT "study_roadmap_steps_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."study_roadmap_steps"
    ADD CONSTRAINT "study_roadmap_steps_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "public"."study_roadmaps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quiz_attempts"
    ADD CONSTRAINT "user_quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_study_roadmap_subjects"
    ADD CONSTRAINT "user_study_roadmap_subjects_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "public"."user_study_roadmaps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_study_roadmaps"
    ADD CONSTRAINT "user_study_roadmaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Curriculum admins add admin emails" ON "public"."curriculum_admin_emails" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "Curriculum admins manage program solved variants" ON "public"."program_solved_variants" TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "Curriculum admins read admin emails" ON "public"."curriculum_admin_emails" FOR SELECT TO "authenticated" USING ("public"."is_curriculum_admin"());



CREATE POLICY "Curriculum admins remove admin emails" ON "public"."curriculum_admin_emails" FOR DELETE TO "authenticated" USING ((("lower"(TRIM(BOTH FROM COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))) = 'cruceanu.cristian3004@gmail.com'::"text") AND ("lower"(TRIM(BOTH FROM "email")) <> 'cruceanu.cristian3004@gmail.com'::"text")));



CREATE POLICY "Premium users can read program solved variants" ON "public"."program_solved_variants" FOR SELECT TO "authenticated" USING ("public"."has_active_premium"());



CREATE POLICY "Premium users insert own quiz attempts" ON "public"."user_quiz_attempts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."has_active_premium"()));



CREATE POLICY "Users read own quiz attempts" ON "public"."user_quiz_attempts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."account_deletion_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_admin_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "curriculum_admin_emails_delete_restrict_primary" ON "public"."curriculum_admin_emails" AS RESTRICTIVE FOR DELETE TO "authenticated" USING (("public"."is_primary_admin"() AND ("public"."normalize_db_email"("email") <> "public"."get_primary_admin_email_value"())));



CREATE POLICY "curriculum_admin_emails_insert_restrict_primary" ON "public"."curriculum_admin_emails" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ("public"."is_primary_admin"());



ALTER TABLE "public"."gdpr_export_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_files_delete_admin" ON "public"."lesson_files" FOR DELETE TO "authenticated" USING ("public"."is_curriculum_admin"());



CREATE POLICY "lesson_files_insert_admin" ON "public"."lesson_files" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "lesson_files_select_authenticated" ON "public"."lesson_files" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "lesson_files_select_premium" ON "public"."lesson_files" FOR SELECT TO "authenticated" USING ((("public"."has_active_premium"() OR (NOT "is_solved_content")) AND ("public"."has_active_premium"() OR (NOT (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "lesson_files"."lesson_id") AND ("l"."is_premium" OR ("l"."subject_part" = 3) OR ("l"."profile" <> 'mate_info'::"text")))))))));



ALTER TABLE "public"."lesson_parts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_parts_delete_admin" ON "public"."lesson_parts" FOR DELETE TO "authenticated" USING ("public"."is_curriculum_admin"());



CREATE POLICY "lesson_parts_insert_admin" ON "public"."lesson_parts" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "lesson_parts_select_authenticated" ON "public"."lesson_parts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "lesson_parts_update_admin" ON "public"."lesson_parts" FOR UPDATE TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons_delete_admin" ON "public"."lessons" FOR DELETE TO "authenticated" USING ("public"."is_curriculum_admin"());



CREATE POLICY "lessons_insert_admin" ON "public"."lessons" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "lessons_select_authenticated" ON "public"."lessons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "lessons_update_admin" ON "public"."lessons" FOR UPDATE TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins_deny_all" ON "public"."platform_admins" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_settings_select_public" ON "public"."platform_settings" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."premium_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "premium_entitlements_select_own" ON "public"."premium_entitlements" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."premium_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "premium_orders_select_own" ON "public"."premium_orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."program_solved_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_questions_delete_admin" ON "public"."quiz_questions" FOR DELETE TO "authenticated" USING ("public"."is_curriculum_admin"());



CREATE POLICY "quiz_questions_insert_admin" ON "public"."quiz_questions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "quiz_questions_select_authenticated" ON "public"."quiz_questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "quiz_questions_select_premium" ON "public"."quiz_questions" FOR SELECT TO "authenticated" USING (("public"."has_active_premium"() OR (NOT (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "quiz_questions"."lesson_id") AND ("l"."is_premium" OR ("l"."subject_part" = 3) OR ("l"."profile" <> 'mate_info'::"text"))))))));



ALTER TABLE "public"."study_roadmap_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "study_roadmap_steps_admin_all" ON "public"."study_roadmap_steps" TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "study_roadmap_steps_select_premium" ON "public"."study_roadmap_steps" FOR SELECT TO "authenticated" USING (("public"."has_active_premium"() OR "public"."is_curriculum_admin"()));



ALTER TABLE "public"."study_roadmaps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "study_roadmaps_admin_all" ON "public"."study_roadmaps" TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "study_roadmaps_select_premium" ON "public"."study_roadmaps" FOR SELECT TO "authenticated" USING (("public"."has_active_premium"() OR "public"."is_curriculum_admin"()));



ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_progress_delete_own" ON "public"."user_progress" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress_insert_own" ON "public"."user_progress" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress_insert_premium" ON "public"."user_progress" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("public"."has_active_premium"() OR (NOT (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "user_progress"."lesson_id") AND ("l"."is_premium" OR ("l"."subject_part" = 3) OR ("l"."profile" <> 'mate_info'::"text")))))))));



CREATE POLICY "user_progress_select_own" ON "public"."user_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress_update_own" ON "public"."user_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress_update_premium" ON "public"."user_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("public"."has_active_premium"() OR (NOT (EXISTS ( SELECT 1
   FROM "public"."lessons" "l"
  WHERE (("l"."id" = "user_progress"."lesson_id") AND ("l"."is_premium" OR ("l"."subject_part" = 3) OR ("l"."profile" <> 'mate_info'::"text")))))))));



ALTER TABLE "public"."user_quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_study_roadmap_subjects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_study_roadmap_subjects_admin_all" ON "public"."user_study_roadmap_subjects" TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "user_study_roadmap_subjects_select_own" ON "public"."user_study_roadmap_subjects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_study_roadmaps" "r"
  WHERE (("r"."id" = "user_study_roadmap_subjects"."roadmap_id") AND ("r"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."user_study_roadmaps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_study_roadmaps_admin_all" ON "public"."user_study_roadmaps" TO "authenticated" USING ("public"."is_curriculum_admin"()) WITH CHECK ("public"."is_curriculum_admin"());



CREATE POLICY "user_study_roadmaps_select_own" ON "public"."user_study_roadmaps" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_user_email_exists"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."default_bac_exam_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."default_bac_exam_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."default_bac_exam_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bac_exam_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_bac_exam_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bac_exam_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_first_curriculum_admin_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_first_curriculum_admin_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_first_curriculum_admin_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_maintenance_mode"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_maintenance_mode"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_maintenance_mode"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_primary_admin_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_primary_admin_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_primary_admin_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_primary_admin_email_value"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_primary_admin_email_value"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_primary_admin_email_value"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_active_premium"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_active_premium"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_active_premium"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_active_premium"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_curriculum_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_curriculum_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_curriculum_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_curriculum_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_primary_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_primary_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_primary_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_primary_curriculum_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_primary_curriculum_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_primary_curriculum_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_primary_platform_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_primary_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_primary_platform_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_premium_entitlements_for_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_premium_entitlements_for_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_premium_entitlements_for_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_db_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_db_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_db_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_premium_entitlement"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_premium_entitlement"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_premium_entitlement"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_bac_exam_date"("p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."set_bac_exam_date"("p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_bac_exam_date"("p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_maintenance_mode"("p_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_maintenance_mode"("p_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_maintenance_mode"("p_enabled" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" "uuid", "p_selected_index" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" "uuid", "p_selected_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" "uuid", "p_selected_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" "uuid", "p_selected_index" integer) TO "service_role";



GRANT ALL ON TABLE "public"."account_deletion_tokens" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_admin_emails" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_admin_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_admin_emails" TO "service_role";



GRANT ALL ON TABLE "public"."gdpr_export_logs" TO "anon";
GRANT ALL ON TABLE "public"."gdpr_export_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."gdpr_export_logs" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_files" TO "anon";
GRANT ALL ON TABLE "public"."lesson_files" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_files" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_parts" TO "anon";
GRANT ALL ON TABLE "public"."lesson_parts" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_parts" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "anon";
GRANT ALL ON TABLE "public"."platform_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."platform_settings" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."premium_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."premium_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."premium_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."premium_orders" TO "anon";
GRANT ALL ON TABLE "public"."premium_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."premium_orders" TO "service_role";



GRANT ALL ON TABLE "public"."program_solved_variants" TO "anon";
GRANT ALL ON TABLE "public"."program_solved_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."program_solved_variants" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."study_roadmap_steps" TO "anon";
GRANT ALL ON TABLE "public"."study_roadmap_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."study_roadmap_steps" TO "service_role";



GRANT ALL ON TABLE "public"."study_roadmaps" TO "anon";
GRANT ALL ON TABLE "public"."study_roadmaps" TO "authenticated";
GRANT ALL ON TABLE "public"."study_roadmaps" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."user_quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."user_study_roadmap_subjects" TO "anon";
GRANT ALL ON TABLE "public"."user_study_roadmap_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."user_study_roadmap_subjects" TO "service_role";



GRANT ALL ON TABLE "public"."user_study_roadmaps" TO "anon";
GRANT ALL ON TABLE "public"."user_study_roadmaps" TO "authenticated";
GRANT ALL ON TABLE "public"."user_study_roadmaps" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







