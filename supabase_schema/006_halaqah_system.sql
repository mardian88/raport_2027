-- Migration: Halaqah System
-- 1. Add profile fields to users table
alter table public.users 
add column if not exists full_name text,
add column if not exists signature_url text;

-- 2. Create halaqah table
create table if not exists public.halaqah (
  id uuid default uuid_generate_v4() primary key,
  nama text not null,
  guru_id uuid references public.users(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Add halaqah_id to students table
alter table public.students
add column if not exists halaqah_id uuid references public.halaqah(id) on delete set null;

-- 4. Enable RLS
alter table public.halaqah enable row level security;

-- 5. RLS Policies for halaqah
-- Everyone can read
create policy "Authenticated can view halaqah" on public.halaqah
  for select to authenticated using (true);

-- Admin can manage
create policy "Admin can manage halaqah" on public.halaqah
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- 6. Helper view for Leger Nilai (Optional but helpful)
-- This view joins students, report_cards, and halaqah for easier querying
create or replace view public.view_leger_nilai as
select 
  s.id as student_id,
  s.nama as student_name,
  s.nis,
  s.halaqah_id,
  h.nama as halaqah_name,
  rc.semester_id,
  rc.nilai_akhir_akhlak,
  rc.nilai_akhir_kedisiplinan,
  rc.nilai_akhir_kognitif,
  (rc.nilai_akhir_akhlak * sl.bobot_akhlak / 100) + 
  (rc.nilai_akhir_kedisiplinan * sl.bobot_kedisiplinan / 100) + 
  (rc.nilai_akhir_kognitif * sl.bobot_kognitif / 100) as nilai_akhir_total
from public.students s
left join public.halaqah h on s.halaqah_id = h.id
join public.report_cards rc on s.id = rc.student_id
cross join public.settings_lembaga sl;

-- Verification
select 
  'Migration 006 completed' as status,
  (select count(*) from information_schema.columns where table_name = 'users' and column_name = 'full_name') as users_updated,
  (select count(*) from pg_tables where tablename = 'halaqah') as halaqah_created,
  (select count(*) from information_schema.columns where table_name = 'students' and column_name = 'halaqah_id') as students_updated;
