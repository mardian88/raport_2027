-- Migration: Remove legacy halaqah column from students table

-- Drop the old halaqah text column (we now use halaqah_id foreign key)
alter table public.students drop column if exists halaqah;
