-- Treat curriculum admins as Premium for API and RLS checks

CREATE OR REPLACE FUNCTION public.is_curriculum_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT true
      FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = lower('cruceanu.cristian3004@gmail.com')
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_curriculum_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_curriculum_admin() TO anon, authenticated, service_role;

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
    (
      SELECT public.is_curriculum_admin()
      WHERE target_user_id IS NOT DISTINCT FROM auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_premium(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO anon, authenticated, service_role;
