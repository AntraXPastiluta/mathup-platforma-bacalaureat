# MathUP Supabase Database Review

**Date:** 2026-05-31  
**Project:** `dhphstiemdzfglncqyev` (linked via Supabase CLI)  
**Reviewers:** supabase-backend + security-expert analysis (live DB queries, migration audit, Supabase advisors)

---

## Executive verdict

**The database is poorly governed.** The live production schema was built in the Supabase Dashboard and only partially captured in git migrations. Local migrations and remote production have **diverged badly** — most of the security hardening in git **is not deployed**. Production still runs permissive RLS policies that leak quiz answers and lesson content, while git contains a parallel policy set that was never applied.

This is not a “needs polish” situation. It is a **schema drift + security debt** situation. You cannot trust git to describe production, and you cannot trust production RLS to enforce your business rules.

---

## Methodology

| Source | Result |
|--------|--------|
| `npx supabase migration list --linked` | Remote/local history mismatch (see below) |
| `npx supabase db query --linked` | Live tables, columns, policies, functions |
| `npx supabase inspect db table-stats --linked` | 18 public tables, seq-scan hotspots |
| `npx supabase db advisors --linked` | 50+ security WARN findings |
| `backend/supabase/migrations/*.sql` | 9 local files; **no baseline CREATE TABLE migration** |

Docker was unavailable, so full `db dump` failed. Schema was reconstructed from live SQL introspection + migration files.

---

## Schema overview (18 public tables)

| Domain | Tables |
|--------|--------|
| **Curriculum** | `lessons`, `lesson_parts`, `lesson_files`, `quiz_questions`, `program_solved_variants` |
| **Study roadmaps** | `study_roadmaps`, `study_roadmap_steps`, `user_study_roadmaps`, `user_study_roadmap_subjects` |
| **User progress** | `user_progress`, `user_quiz_attempts` |
| **Billing / Premium** | `premium_entitlements`, `premium_orders` |
| **Admin / platform** | `curriculum_admin_emails`, `platform_settings`, `platform_admins` *(orphan)* |
| **Account lifecycle** | `account_deletion_tokens`, `gdpr_export_logs` |

**Relationships (simplified):**

```
lessons ─┬─ lesson_parts
         ├─ lesson_files
         ├─ quiz_questions
         └─ user_progress

study_roadmaps ── study_roadmap_steps ── (optional) lessons

user_study_roadmaps ── user_study_roadmap_subjects

auth.users ── premium_entitlements / premium_orders / user_progress / ...
```

---

## CRITICAL issues (fix before trusting production)

### 1. Migration history is broken — git ≠ production

```
Remote only:  20260525130000, 20260525140000  (not in repo)
Local only:   20260528140000 … 20260628120000  (not applied remotely)
```

**Impact:** Every developer assumes git is truth. Production runs a different schema, different RLS, different functions. `db push`, `db pull`, and fresh environments are all unreliable.

**Fix:**

1. Export production baseline: `npx supabase db pull --linked` (after repair) or manual `pg_dump --schema-only`.
2. Commit as `20260525000000_baseline_schema.sql` (or squash history intentionally).
3. Repair history (CLI suggested commands):

```bash
cd backend
npx supabase migration repair --status reverted 20260525130000
npx supabase migration repair --status reverted 20260525140000
# Then mark local migrations applied OR squash and push fresh baseline
npx supabase db push --linked
```

4. **Rule going forward:** no Dashboard DDL without a matching migration in git.

---

### 2. Premium bypass via client-writable JWT `user_metadata.profiles`

**Git migration logic** (`user_profile_keys()`, `user_has_lesson_full_access()`) reads enrolled programs from `auth.jwt() -> 'user_metadata' -> 'profiles'`. That metadata is **writable by the client** via `supabase.auth.updateUser()`.

**Exploit:** Inflate `profiles` to all program keys → query `lesson_parts`, `quiz_questions`, `lesson_files` for paywalled content in other programs without Premium.

**Fix:**

```sql
-- Server-controlled enrollments (signup/profile RPC only)
CREATE TABLE public.user_enrolled_profiles (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  profile_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, profile_key)
);
ALTER TABLE public.user_enrolled_profiles ENABLE ROW LEVEL SECURITY;
-- SELECT own rows only; INSERT/DELETE via SECURITY DEFINER RPC

CREATE OR REPLACE FUNCTION public.user_profile_keys()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(profile_key), array[]::text[])
  FROM public.user_enrolled_profiles
  WHERE user_id = auth.uid();
$$;
```

Also add an Auth hook or strip client updates to `user_metadata.profiles`.

---

### 3. Quiz answers are exposed in production (cheating vector)

**Live policy on `quiz_questions`:**

```sql
quiz_questions_select_authenticated  →  USING (true)
```

Any authenticated user can `SELECT *` from `quiz_questions`, including `correct_option_index`. The git migration adds `quiz_questions_student` view and tighter policies — **not deployed**.

**Exploit:** Open DevTools → Supabase client → `from('quiz_questions').select('*')` → full answer key.

**Fix migration:**

```sql
DROP POLICY IF EXISTS quiz_questions_select_authenticated ON public.quiz_questions;

-- Students use view only; admins read base table
CREATE POLICY quiz_questions_select_admin ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (public.is_curriculum_admin());

-- Ensure quiz_questions_student view exists (from 20260531140000_core_security_rls.sql)
REVOKE SELECT ON public.quiz_questions FROM authenticated;
GRANT SELECT ON public.quiz_questions TO service_role;
GRANT SELECT ON public.quiz_questions_student TO authenticated;
```

---

### 4. Permissive OR policies leak premium lesson content

PostgreSQL RLS is **permissive by default** (OR logic). Production has **stacked policies**:

| Table | Leaky policy | Effect |
|-------|--------------|--------|
| `lesson_parts` | `lesson_parts_select_authenticated USING (true)` | All parts readable |
| `lesson_files` | `lesson_files_select_authenticated USING (true)` | All files readable |
| `lessons` | `lessons_select_authenticated USING (true)` | All metadata readable |

Premium gating policies exist (`*_select_premium`) but **any `USING (true)` policy makes them irrelevant**.

**Fix:** Drop every `*_select_authenticated` / `USING (true)` policy on content tables. Replace with a single restrictive policy per command (as in `20260531140000_core_security_rls.sql`).

---

### 5. `has_active_premium(target_user_id)` — IDOR on any user's billing status

**Live function:** callable by `anon` and `authenticated`, `SECURITY DEFINER`, accepts arbitrary `target_user_id`.

**Exploit:** Enumerate UUIDs → learn who has Premium without authorization.

**Fix:**

```sql
DROP FUNCTION IF EXISTS public.has_active_premium(uuid);

-- Replace with auth.uid()-scoped helper (already in pending migration as user_has_active_premium)
REVOKE EXECUTE ON FUNCTION public.user_has_active_premium() FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_active_premium() TO authenticated;
```

Update all RLS policies still referencing `has_active_premium()` → `user_has_active_premium()` or `user_has_lesson_full_access(lesson_id)`.

---

### 6. Hardcoded admin email inside RLS policy

**Live policy on `curriculum_admin_emails`:**

```sql
"Curriculum admins remove admin emails"
USING (lower(trim(email_from_jwt)) = 'cruceanu.cristian3004@gmail.com' AND ...)
```

Admin authorization must never live in RLS as a literal email. It breaks portability, leaks PII in schema exports, and duplicates `platform_settings.primary_admin_email`.

**Fix:**

```sql
DROP POLICY IF EXISTS "Curriculum admins remove admin emails" ON public.curriculum_admin_emails;
DROP POLICY IF EXISTS "Curriculum admins add admin emails" ON public.curriculum_admin_emails;
DROP POLICY IF EXISTS "Curriculum admins read admin emails" ON public.curriculum_admin_emails;

-- Keep only normalize_db_email + is_primary_admin() policies from git migration
```

---

### 7. User study roadmaps are broken in production

**Live policies:** `user_study_roadmaps` and `user_study_roadmap_subjects` only allow `SELECT` for owners. **No INSERT/UPDATE/DELETE** for regular users.

**Git migration** (`user_study_roadmaps_own FOR ALL`) fixes this — **not deployed**.

**Impact:** `createUserRoadmap`, `saveUserRoadmapWorkspace`, etc. fail with RLS 42501 in production unless bypassed.

**Fix:** Apply `20260531140000_core_security_rls.sql` policies for user-owned roadmap tables.

---

### 8. `platform_settings` readable by anonymous users (admin email leak)

Git policy `platform_settings_select_public` grants SELECT to `anon` and `authenticated` on row `id = 1`, which includes `primary_admin_email`. `get_primary_admin_email()` has no admin guard.

**Fix:** Remove `anon` from SELECT; expose only `maintenance_enabled` and `bac_exam_date` via narrow RPC/view. Guard `get_primary_admin_email()` with `is_curriculum_admin()`.

---

### 9. Duplicate admin authorization model (three sources of truth)

| Mechanism | Location | In git? |
|-----------|----------|---------|
| `platform_settings.primary_admin_email` | Column | Referenced in migrations |
| `curriculum_admin_emails` | Table | Partially in migrations |
| `platform_admins` | Table + `platform_admins_deny_all` | **Not in git at all** |

**Live orphan functions:** `is_primary_platform_admin()`, `is_primary_curriculum_admin()`, `get_first_curriculum_admin_email()`, `get_primary_admin_email_value()` — dashboard cruft, not versioned.

**Fix:**

1. Pick **one** admin model: `platform_settings.primary_admin_email` + `curriculum_admin_emails`.
2. Drop `platform_admins` table and orphan RPCs.
3. Consolidate to: `is_curriculum_admin()`, `is_primary_admin()`, `get_primary_admin_email()`.

---

## HIGH severity issues

### 10. Account deletion OTP brute-forceable

Edge Function uses 6-digit `Math.random()` code, 15-minute window, no failed-attempt lockout on `confirm-account-deletion`.

**Fix:** Use `crypto.getRandomValues()` (≥128-bit token or OTP with max 5 attempts); invalidate token after lockout; constant-time compare.

---

### 11. SECURITY DEFINER RPCs granted to `anon`

Supabase advisors flagged **every** privileged RPC as callable without login, including:

- `set_maintenance_mode`, `set_bac_exam_date`, `revoke_premium_entitlement`
- `list_premium_entitlements_for_admin`
- `submit_quiz_answer`
- `auth_user_email_exists` (email enumeration)

Internal checks (`is_primary_admin()`) block some abuse, but **defense in depth is missing**. Anonymous callers should not reach write/admin RPCs at all.

**Fix template:**

```sql
REVOKE EXECUTE ON FUNCTION public.set_maintenance_mode(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_maintenance_mode(boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auth_user_email_exists(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_email_exists(text) TO authenticated;
-- Better: move to Edge Function with service role; never expose auth.users scan to clients
```

Repeat for all admin/write RPCs. Keep `get_maintenance_mode` / `get_bac_exam_date` on `anon` only if truly needed pre-login.

---

### 12. No baseline schema in git

All core tables (`lessons`, `premium_entitlements`, etc.) were created outside migrations. Local files only contain `ALTER TABLE IF EXISTS` and policy patches.

**Impact:** Impossible to bootstrap a fresh environment from git alone. Code review of schema changes is incomplete. This is the root cause of drift.

**Fix:** Add `20260525000000_baseline_schema.sql` with full `CREATE TABLE`, indexes, constraints, and initial RLS. Never rely on Dashboard DDL again.

---

### 13. Conflicting duplicate RLS policies (policy sprawl)

Production has **both** old human-named policies (`"Curriculum admins manage..."`) **and** newer snake_case policies from git — on the same tables, same commands. This is unmaintainable and makes security review error-prone.

**Fix migration pattern:**

```sql
-- For each table, drop ALL existing policies by name, then create canonical set
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='lessons'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.lessons', r.policyname); END LOOP;
END $$;
-- Then apply single canonical policy set from git
```

---

### 14. Support feature: migrations add, then drop; Edge Functions remain

Migrations `20260529120000`–`20260529140000` create support chat + notifications. `20260530120000_drop_support.sql` removes them. Edge Functions `submit-support-request`, `send-support-message` still exist in repo.

**Fix:** Delete orphaned Edge Functions and `_shared/support.ts`, or restore support intentionally with a coherent migration chain.

---

### 15. `auth_user_email_exists` enables email enumeration

Any authenticated (or anon, today) caller can probe whether an email is registered.

**Fix:** Restrict to `is_primary_admin()` inside the function, or perform lookup only in an Edge Function during admin invite flow.

---

### 16. Storage bucket `materials` allows public listing

Advisor: public bucket has broad SELECT on `storage.objects` → attackers can list all uploaded files.

**Fix:** Remove listing policy; keep object-level public URLs only if needed. Add path-prefix policies tied to `auth.uid()`.

---

## MEDIUM severity — structural / design smells

### 17. Text columns where enums belong

`premium_entitlements.status`, `lessons.difficulty`, `lessons.profile`, support status (removed) — all free-text. Typos become silent logic bugs.

**Fix:**

```sql
CREATE TYPE premium_status AS ENUM ('active', 'refunded', 'expired');
ALTER TABLE premium_entitlements ALTER COLUMN status TYPE premium_status USING status::premium_status;
```

### 18. Premium gating logic duplicated everywhere

RLS repeats the same subquery pattern:

```sql
has_active_premium() OR NOT EXISTS (SELECT 1 FROM lessons l WHERE l.id = ... AND (l.is_premium OR l.subject_part = 3 OR l.profile <> 'mate_info'))
```

This is copy-pasted across `lesson_files`, `quiz_questions`, `user_progress`, etc. Git migration introduces `user_has_lesson_full_access(lesson_id)` — **use it everywhere** and delete inline duplicates.

### 19. `lessons.content` column appears legacy

Table has both `lessons.content` and normalized `lesson_parts`. Unclear single source of truth. Likely dead column increasing row size.

**Fix:** Confirm usage in frontend; drop column or mark deprecated with migration.

### 20. `platform_settings` singleton without INSERT guard

Row `id = 1` is upserted by RPCs but INSERT policy may be missing. Accidental second row possible via service role mistakes.

**Fix:**

```sql
ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_singleton CHECK (id = 1);
-- Only RPCs may upsert; no direct client INSERT
```

### 21. Performance: `lesson_files` — 895 sequential scans

Live stats show heavy seq scans on `lesson_files` despite index on `lesson_id`. Review query patterns; consider composite indexes `(lesson_id, is_solved_content)`.

### 22. Unused indexes

`premium_entitlements_stripe_checkout_session_id_key`, `user_study_roadmap_subjects_unique`, `gdpr_export_logs_pkey` show 0 scans (small dataset — monitor at scale).

### 23. `user_quiz_attempts` dual write paths

Frontend `recordQuizAttempt()` writes directly to table **and** RPC `submit_quiz_answer` exists. Git adds trigger `guard_quiz_attempt_is_correct` — **not confirmed on production**. Direct client writes could forge `is_correct = true` without trigger.

**Fix:** Remove direct client INSERT/UPDATE; force all writes through `submit_quiz_answer` RPC. Revoke direct table writes:

```sql
DROP POLICY IF EXISTS "Premium users insert own quiz attempts" ON public.user_quiz_attempts;
-- SELECT-only for clients; writes via RPC only
```

### 24. GDPR export rate limit race (TOCTOU)

`reserve_gdpr_export_slot` COUNT-then-INSERT without serializable locking; edge fallback is two separate calls.

**Fix:** Single-statement `INSERT ... WHERE count < 3`, or `pg_advisory_xact_lock(hashtext(user_id::text))`.

---

## What is actually done well

- RLS is **enabled** on all 18 public tables (including deny-all on `platform_admins`).
- Sensitive tables (`gdpr_export_logs`, `account_deletion_tokens`) have RLS with **no client policies** (service role only) — correct pattern.
- Stripe webhook + checkout flows use Edge Functions with service role, not client writes.
- Git migration `20260531140000_core_security_rls.sql` shows **good intent**: quiz integrity trigger, `quiz_questions_student` view, atomic GDPR rate limit RPC, consolidated helpers with `search_path` set.
- Foreign keys on `user_id` columns appear present (live audit found no orphan `user_id` columns without FK).
- GDPR export rate limiting design (`reserve_gdpr_export_slot`) is sound — once deployed.

---

## Recommended fix roadmap (ordered)

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Stop trusting JWT `user_metadata.profiles` for lesson access; add `user_enrolled_profiles` | 4–8 hours |
| P0 | Repair migration history; establish baseline schema in git | 1–2 days |
| P0 | `db push` core security migration OR manual SQL to drop `USING (true)` policies | 2–4 hours |
| P0 | Lock down `platform_settings` (remove anon SELECT; guard admin email RPC) | 1 hour |
| P0 | Drop `has_active_premium(uuid)`; revoke anon on admin RPCs | 1 hour |
| P0 | Remove hardcoded email RLS policies | 30 min |
| P0 | Harden account deletion token (crypto + lockout) | 2 hours |
| P1 | Consolidate admin model; drop `platform_admins` + orphan functions | 2 hours |
| P1 | Deploy user roadmap write policies | 30 min |
| P1 | Quiz: RPC-only writes + student view | 2 hours |
| P1 | Fix storage bucket listing policy | 1 hour |
| P2 | Replace text status fields with enums | 2 hours |
| P2 | Remove support dead code or restore feature | 1–4 hours |
| P2 | Add CI check: `supabase db lint` + migration drift detection | 2 hours |

---

## Sample consolidation migration (sketch)

```sql
-- 20260701000000_schema_consolidation.sql

-- 1. Drop leaky permissive policies
DROP POLICY IF EXISTS quiz_questions_select_authenticated ON public.quiz_questions;
DROP POLICY IF EXISTS lesson_parts_select_authenticated ON public.lesson_parts;
DROP POLICY IF EXISTS lesson_files_select_authenticated ON public.lesson_files;
DROP POLICY IF EXISTS lessons_select_authenticated ON public.lessons;

-- 2. Drop hardcoded-email policies
DROP POLICY IF EXISTS "Curriculum admins remove admin emails" ON public.curriculum_admin_emails;
DROP POLICY IF EXISTS "Curriculum admins add admin emails" ON public.curriculum_admin_emails;
DROP POLICY IF EXISTS "Curriculum admins read admin emails" ON public.curriculum_admin_emails;

-- 3. Remove IDOR premium check
DROP FUNCTION IF EXISTS public.has_active_premium(uuid);

-- 4. Lock down RPC grants
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
-- Re-grant intentionally per function (authenticated-only for writes, anon for public reads)

-- 5. Drop orphan admin artifacts
DROP TABLE IF EXISTS public.platform_admins;
DROP FUNCTION IF EXISTS public.is_primary_platform_admin();
DROP FUNCTION IF EXISTS public.is_primary_curriculum_admin();
DROP FUNCTION IF EXISTS public.get_first_curriculum_admin_email();
DROP FUNCTION IF EXISTS public.get_primary_admin_email_value();

-- 6. Apply canonical policies from 20260531140000_core_security_rls.sql
-- (include full file contents or \i reference)
```

---

## Bottom line

The **domain model is reasonable** for an e-learning Bacalaureat platform — lessons, parts, quizzes, roadmaps, premium entitlements hang together logically. But **operational discipline is poor**: dashboard-first schema, broken migration sync, policy sprawl, and production RLS that contradicts git.

Until P0 items are fixed, treat production as **leaking quiz answers and premium content** to any logged-in student, with admin authorization partially hardcoded in SQL.

**Do not add new features on top of this schema until baseline + migration sync is resolved.**
