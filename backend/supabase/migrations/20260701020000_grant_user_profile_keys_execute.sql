-- Fix 403 on lessons?select=...,lesson_parts(*) after security_consolidation RPC lockdown.
-- lesson_parts_select calls user_profile_keys() directly in RLS; authenticated lost EXECUTE.

grant execute on function public.user_profile_keys() to authenticated;
