-- Fix Supabase Auth signup failures caused by a legacy trigger that inserts
-- into public.profiles after auth.users is created. The app stores profile
-- data in auth user metadata, and the profiles table is not exposed anymore.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
