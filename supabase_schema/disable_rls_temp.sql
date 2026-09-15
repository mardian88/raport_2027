-- Quick Fix: Temporarily disable RLS for testing
-- Run this to allow the app to work while we debug

ALTER TABLE public.report_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_lembaga DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.surah_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tahfidz_progress DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('report_cards', 'students', 'semesters', 'academic_years', 'settings_lembaga', 'surah_master', 'tahfidz_progress');
