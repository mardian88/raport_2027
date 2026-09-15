-- Migration: Teacher-Subject-Halaqah Assignment System
-- This migration creates a junction table to support teachers teaching specific subjects in specific halaqahs

-- 1. Create teacher_assignments table
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  halaqah_id UUID REFERENCES public.halaqah(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('Tahfidz', 'Tahsin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, halaqah_id, subject)
);

-- 2. Enable RLS
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Everyone can view teacher assignments
CREATE POLICY "Authenticated can view teacher_assignments"
  ON public.teacher_assignments FOR SELECT
  TO authenticated USING (true);

-- Admin can manage teacher assignments
CREATE POLICY "Admin can manage teacher_assignments"
  ON public.teacher_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher 
  ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_halaqah 
  ON public.teacher_assignments(halaqah_id);

-- Verification
SELECT 
  'Migration 023 completed' as status,
  (SELECT count(*) FROM pg_tables WHERE tablename = 'teacher_assignments') as table_created,
  (SELECT count(*) FROM pg_policies WHERE tablename = 'teacher_assignments') as policies_created;
