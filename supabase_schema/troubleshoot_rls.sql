-- Troubleshooting Script: Fix RLS Issues

-- 1. Check if current user exists in public.users
SELECT 
    auth.uid() as current_user_id,
    EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid()) as user_exists_in_public_users;

-- 2. Check current user's role
SELECT 
    id,
    email,
    role,
    created_at
FROM public.users 
WHERE id = auth.uid();

-- 3. If user doesn't exist, create entry (replace with your actual email)
-- IMPORTANT: Run this ONLY if step 2 returns no rows
-- Replace 'your-email@example.com' with the email you used to login

/*
INSERT INTO public.users (id, email, role)
VALUES (
    auth.uid(),
    'your-email@example.com',  -- CHANGE THIS
    'admin'  -- or 'guru'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
*/

-- 4. Verify RLS policies are enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'settings_lembaga', 'students', 'report_cards', 'surah_master', 'tahfidz_progress');

-- 5. Test get_my_role() function
SELECT public.get_my_role() as my_role;

-- 6. Test report_cards access
SELECT COUNT(*) as total_report_cards
FROM public.report_cards;

-- 7. If still having issues, temporarily disable RLS on report_cards (NOT RECOMMENDED FOR PRODUCTION)
-- ALTER TABLE public.report_cards DISABLE ROW LEVEL SECURITY;

-- 8. Re-enable RLS after testing
-- ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
