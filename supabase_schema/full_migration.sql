-- file: 001_create_core_tables.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS
create type user_role as enum ('admin', 'guru', 'viewer');

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  role user_role default 'viewer',
  created_at timestamptz default now()
);

-- 2. SETTINGS LEMBAGA
create table public.settings_lembaga (
  id uuid default uuid_generate_v4() primary key,
  nama_lembaga text not null,
  alamat text,
  kota text,
  nomor_kontak text,
  nama_kepala_lembaga text,
  nip_kepala_lembaga text,
  logo_url text,
  bobot_akhlak numeric default 30,
  bobot_kedisiplinan numeric default 20,
  bobot_kognitif numeric default 50,
  skala_penilaian jsonb default '{"A": 85, "B": 70, "C": 60}'::jsonb,
  footer_raport text,
  created_at timestamptz default now()
);

-- 3. ACADEMIC YEARS
create table public.academic_years (
  id uuid default uuid_generate_v4() primary key,
  tahun_ajaran text not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- 4. SEMESTERS
create table public.semesters (
  id uuid default uuid_generate_v4() primary key,
  academic_year_id uuid references public.academic_years(id) on delete cascade not null,
  nama text not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- 5. STUDENTS
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  nama text not null,
  nis text unique,
  halaqah text,
  jenis_kelamin text,
  tanggal_lahir date,
  nama_orang_tua text,
  shift text check (shift in ('Siang', 'Sore')) default 'Sore',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 6. REPORT CARDS
create table public.report_cards (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  semester_id uuid references public.semesters(id) on delete cascade not null,
  akhlak jsonb default '{}'::jsonb,
  kedisiplinan jsonb default '{}'::jsonb,
  kognitif jsonb default '{}'::jsonb,
  uas_tulis numeric default 0,
  uas_lisan numeric default 0,
  nilai_akhir_akhlak numeric default 0,
  nilai_akhir_kedisiplinan numeric default 0,
  nilai_akhir_kognitif numeric default 0,
  catatan text,
  created_at timestamptz default now(),
  unique(student_id, semester_id)
);

-- Insert default settings
insert into settings_lembaga (
    nama_lembaga,
    alamat,
    kota,
    nomor_kontak,
    nama_kepala_lembaga,
    bobot_akhlak,
    bobot_kedisiplinan,
    bobot_kognitif,
    skala_penilaian
) values (
    'Rumah Qur''an Muharrik',
    'Jl. Contoh No. 123',
    'Jakarta',
    '021-12345678',
    'Nama Kepala Lembaga',
    30,
    30,
    40,
    '{"A": 85, "B": 70, "C": 60, "D": 0}'::jsonb
) on conflict do nothing;
-- file: 002_policies.sql

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.settings_lembaga enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.students enable row level security;
alter table public.report_cards enable row level security;

-- Helper function to get current user role
create or replace function public.get_my_role()
returns user_role as $$
declare
  _role user_role;
begin
  select role into _role from public.users where id = auth.uid();
  return _role;
end;
$$ language plpgsql security definer;

-- POLICIES

-- 1. USERS
-- Users can read their own data
create policy "Users can view own data" on public.users
  for select using (auth.uid() = id);
-- Admin can view all users (optional, for user management)
create policy "Admin can view all users" on public.users
  for select using (get_my_role() = 'admin');

-- 2. SETTINGS LEMBAGA
-- Everyone (authenticated) can view settings
create policy "Authenticated can view settings" on public.settings_lembaga
  for select to authenticated using (true);
-- Only Admin can update settings
create policy "Admin can update settings" on public.settings_lembaga
  for update using (get_my_role() = 'admin');
-- Only Admin can insert settings (usually done once)
create policy "Admin can insert settings" on public.settings_lembaga
  for insert with check (get_my_role() = 'admin');

-- 3. ACADEMIC YEARS & SEMESTERS
-- Authenticated can view
create policy "Authenticated can view academic years" on public.academic_years
  for select to authenticated using (true);
create policy "Authenticated can view semesters" on public.semesters
  for select to authenticated using (true);
-- Admin can manage
create policy "Admin can manage academic years" on public.academic_years
  for all using (get_my_role() = 'admin');
create policy "Admin can manage semesters" on public.semesters
  for all using (get_my_role() = 'admin');

-- 4. STUDENTS
-- Authenticated (Guru/Admin) can view students
create policy "Authenticated can view students" on public.students
  for select to authenticated using (true);
-- Admin and Guru can manage students
create policy "Admin and Guru can manage students" on public.students
  for all using (get_my_role() in ('admin', 'guru'));

-- 5. REPORT CARDS
-- Authenticated can view report cards (Guru sees all, Viewer might be restricted but for now allow read)
create policy "Authenticated can view report cards" on public.report_cards
  for select to authenticated using (true);
-- Admin and Guru can insert/update/delete
create policy "Admin and Guru can manage report cards" on public.report_cards
  for all using (get_my_role() in ('admin', 'guru'));
-- file: 003_triggers.sql

-- Trigger to create public.users entry when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'viewer'); -- Default role viewer, change manually to admin/guru
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- Migration: Add shift column to existing students table

-- Add shift column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='students' AND column_name='shift') THEN
        ALTER TABLE public.students 
        ADD COLUMN shift text CHECK (shift IN ('Siang', 'Sore')) DEFAULT 'Sore';
    END IF;
END $$;

-- Update existing students to have default shift 'Sore'
UPDATE public.students SET shift = 'Sore' WHERE shift IS NULL;
-- Migration: Grading Scale 10-100 & Tahfidz Management System
-- Safe to re-run (idempotent)

-- 1. Create surah_master table
create table if not exists public.surah_master (
  id uuid default uuid_generate_v4() primary key,
  juz integer not null check (juz between 1 and 30),
  nama_surah text not null,
  nomor_surah integer not null,
  urutan_dalam_juz integer not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(juz, nama_surah)
);

-- 2. Create tahfidz_progress table
create table if not exists public.tahfidz_progress (
  id uuid default uuid_generate_v4() primary key,
  report_card_id uuid references public.report_cards(id) on delete cascade not null,
  surah_id uuid references public.surah_master(id) on delete cascade not null,
  kb numeric(5,2) check (kb between 10 and 100) default 10,
  kh numeric(5,2) check (kh between 10 and 100) default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(report_card_id, surah_id)
);

-- 3. Insert Surah data for Juz 30
insert into public.surah_master (juz, nama_surah, nomor_surah, urutan_dalam_juz) values
(30, 'An-Naba''', 78, 1),
(30, 'An-Nazi''at', 79, 2),
(30, '''Abasa', 80, 3),
(30, 'At-Takwir', 81, 4),
(30, 'Al-Infitar', 82, 5),
(30, 'Al-Mutaffifin', 83, 6),
(30, 'Al-Inshiqaq', 84, 7),
(30, 'Al-Buruj', 85, 8),
(30, 'At-Tariq', 86, 9),
(30, 'Al-A''la', 87, 10),
(30, 'Al-Ghashiyah', 88, 11),
(30, 'Al-Fajr', 89, 12),
(30, 'Al-Balad', 90, 13),
(30, 'Ash-Shams', 91, 14),
(30, 'Al-Lail', 92, 15),
(30, 'Ad-Duha', 93, 16),
(30, 'Ash-Sharh', 94, 17),
(30, 'At-Tin', 95, 18),
(30, 'Al-''Alaq', 96, 19),
(30, 'Al-Qadr', 97, 20),
(30, 'Al-Bayyinah', 98, 21),
(30, 'Az-Zalzalah', 99, 22),
(30, 'Al-''Adiyat', 100, 23),
(30, 'Al-Qari''ah', 101, 24),
(30, 'At-Takathur', 102, 25),
(30, 'Al-''Asr', 103, 26),
(30, 'Al-Humazah', 104, 27),
(30, 'Al-Fil', 105, 28),
(30, 'Quraish', 106, 29),
(30, 'Al-Ma''un', 107, 30),
(30, 'Al-Kauthar', 108, 31),
(30, 'Al-Kafirun', 109, 32),
(30, 'An-Nasr', 110, 33),
(30, 'Al-Masad', 111, 34),
(30, 'Al-Ikhlas', 112, 35),
(30, 'Al-Falaq', 113, 36),
(30, 'An-Nas', 114, 37)
on conflict (juz, nama_surah) do nothing;

-- 4. Insert Surah data for Juz 29
insert into public.surah_master (juz, nama_surah, nomor_surah, urutan_dalam_juz) values
(29, 'Al-Mulk', 67, 1),
(29, 'Al-Qalam', 68, 2),
(29, 'Al-Haqqah', 69, 3),
(29, 'Al-Ma''arij', 70, 4),
(29, 'Nuh', 71, 5),
(29, 'Al-Jinn', 72, 6),
(29, 'Al-Muzzammil', 73, 7),
(29, 'Al-Muddaththir', 74, 8),
(29, 'Al-Qiyamah', 75, 9),
(29, 'Al-Insan', 76, 10),
(29, 'Al-Mursalat', 77, 11)
on conflict (juz, nama_surah) do nothing;

-- 5. Insert Surah data for Juz 28
insert into public.surah_master (juz, nama_surah, nomor_surah, urutan_dalam_juz) values
(28, 'Al-Mujadilah', 58, 1),
(28, 'Al-Hashr', 59, 2),
(28, 'Al-Mumtahanah', 60, 3),
(28, 'As-Saff', 61, 4),
(28, 'Al-Jumu''ah', 62, 5),
(28, 'Al-Munafiqun', 63, 6),
(28, 'At-Taghabun', 64, 7),
(28, 'At-Talaq', 65, 8),
(28, 'At-Tahrim', 66, 9)
on conflict (juz, nama_surah) do nothing;

-- 6. Insert Surah data for Juz 27
insert into public.surah_master (juz, nama_surah, nomor_surah, urutan_dalam_juz) values
(27, 'Adh-Dhariyat', 51, 1),
(27, 'At-Tur', 52, 2),
(27, 'An-Najm', 53, 3),
(27, 'Al-Qamar', 54, 4),
(27, 'Ar-Rahman', 55, 5),
(27, 'Al-Waqi''ah', 56, 6),
(27, 'Al-Hadid', 57, 7)
on conflict (juz, nama_surah) do nothing;

-- 7. Enable RLS on tables
alter table public.surah_master enable row level security;
alter table public.tahfidz_progress enable row level security;

-- 8. Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Allow authenticated users to read surah_master" on public.surah_master;
drop policy if exists "Allow admin and guru to manage surah_master" on public.surah_master;
drop policy if exists "Allow authenticated users to read tahfidz_progress" on public.tahfidz_progress;
drop policy if exists "Allow admin and guru to manage tahfidz_progress" on public.tahfidz_progress;

-- 9. Create RLS policies for surah_master
create policy "Allow authenticated users to read surah_master"
  on public.surah_master for select
  to authenticated
  using (true);

create policy "Allow admin and guru to manage surah_master"
  on public.surah_master for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'guru')
    )
  );

-- 10. Create RLS policies for tahfidz_progress
create policy "Allow authenticated users to read tahfidz_progress"
  on public.tahfidz_progress for select
  to authenticated
  using (true);

create policy "Allow admin and guru to manage tahfidz_progress"
  on public.tahfidz_progress for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'guru')
    )
  );

-- 11. Create or replace function for updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 12. Drop existing trigger if exists
drop trigger if exists set_updated_at on public.tahfidz_progress;

-- 13. Create trigger for updated_at on tahfidz_progress
create trigger set_updated_at
  before update on public.tahfidz_progress
  for each row
  execute function public.handle_updated_at();

-- Verification query
select 
  'Migration completed successfully!' as status,
  (select count(*) from public.surah_master) as total_surah,
  (select count(*) from public.surah_master where juz = 30) as juz_30,
  (select count(*) from public.surah_master where juz = 29) as juz_29,
  (select count(*) from public.surah_master where juz = 28) as juz_28,
  (select count(*) from public.surah_master where juz = 27) as juz_27;
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
-- Migration: Add full_name and signature_url to users table

alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists signature_url text;
-- Migration: Add missing policies for users table management

-- Allow admin to update all users (for managing teacher profiles)
drop policy if exists "Admin can update all users" on public.users;
create policy "Admin can update all users" on public.users
  for update using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Allow admin to insert users (though typically done via trigger)
drop policy if exists "Admin can insert users" on public.users;
create policy "Admin can insert users" on public.users
  for insert with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Allow users to update their own profile
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
-- Migration: Remove legacy halaqah column from students table

-- Drop the old halaqah text column (we now use halaqah_id foreign key)
alter table public.students drop column if exists halaqah;
-- Migration: Dynamic Surah Assignment per Student
-- Allows each student to have different active surah based on their hafalan progress

-- 1. Create student_surah_assignment table
create table if not exists public.student_surah_assignment (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  surah_id uuid references public.surah_master(id) on delete cascade not null,
  is_active boolean default true,
  assigned_at timestamptz default now(),
  unique(student_id, surah_id)
);

-- 2. Enable RLS
alter table public.student_surah_assignment enable row level security;

-- 3. RLS Policies
-- Authenticated users can read
create policy "Authenticated can view student surah assignments" 
  on public.student_surah_assignment
  for select to authenticated using (true);

-- Admin and Guru can manage
create policy "Admin and Guru can manage student surah assignments" 
  on public.student_surah_assignment
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role in ('admin', 'guru')
    )
  );

-- 4. Helper function to get active surah for a student
create or replace function public.get_student_active_surah(p_student_id uuid)
returns table (
  surah_id uuid,
  juz integer,
  nama_surah text,
  nomor_surah integer,
  urutan_dalam_juz integer
) as $$
begin
  return query
  select 
    sm.id as surah_id,
    sm.juz,
    sm.nama_surah,
    sm.nomor_surah,
    sm.urutan_dalam_juz
  from public.surah_master sm
  inner join public.student_surah_assignment ssa 
    on sm.id = ssa.surah_id
  where ssa.student_id = p_student_id
    and ssa.is_active = true
    and sm.is_active = true
  order by sm.juz, sm.urutan_dalam_juz;
end;
$$ language plpgsql security definer;

-- 5. Helper function to bulk assign surah by Juz
create or replace function public.assign_juz_to_student(
  p_student_id uuid,
  p_juz integer
)
returns void as $$
begin
  -- Insert all surah from the specified Juz for the student
  insert into public.student_surah_assignment (student_id, surah_id, is_active)
  select p_student_id, id, true
  from public.surah_master
  where juz = p_juz
  on conflict (student_id, surah_id) 
  do update set is_active = true;
end;
$$ language plpgsql security definer;

-- 6. Helper function to bulk unassign surah by Juz
create or replace function public.unassign_juz_from_student(
  p_student_id uuid,
  p_juz integer
)
returns void as $$
begin
  -- Deactivate all surah from the specified Juz for the student
  update public.student_surah_assignment
  set is_active = false
  where student_id = p_student_id
    and surah_id in (
      select id from public.surah_master where juz = p_juz
    );
end;
$$ language plpgsql security definer;

-- Verification
select 
  'Migration 010 completed' as status,
  (select count(*) from pg_tables where tablename = 'student_surah_assignment') as table_created,
  (select count(*) from pg_proc where proname = 'get_student_active_surah') as function_created;
-- Allow all authenticated users to view users (needed for report card printing to show teacher names)
drop policy if exists "Users can view own data" on public.users;
create policy "Authenticated can view all users" on public.users
  for select to authenticated using (true);
-- Fix missing relationship between tahfidz_progress and surah_master

-- 1. Ensure surah_master exists and has a primary key
create table if not exists public.surah_master (
  id uuid default uuid_generate_v4() primary key,
  juz integer not null check (juz between 1 and 30),
  nama_surah text not null,
  nomor_surah integer not null,
  urutan_dalam_juz integer not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(juz, nama_surah)
);

-- 2. Ensure tahfidz_progress exists
create table if not exists public.tahfidz_progress (
  id uuid default uuid_generate_v4() primary key,
  report_card_id uuid references public.report_cards(id) on delete cascade not null,
  surah_id uuid not null, -- FK added below
  kb numeric(5,2) check (kb between 10 and 100) default 10,
  kh numeric(5,2) check (kh between 10 and 100) default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(report_card_id, surah_id)
);

-- 3. Re-create the foreign key explicitly
do $$
begin
  -- Drop constraint if it exists with a different name or to be safe
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'tahfidz_progress_surah_id_fkey') then
    alter table public.tahfidz_progress drop constraint tahfidz_progress_surah_id_fkey;
  end if;

  -- Add the constraint
  alter table public.tahfidz_progress
    add constraint tahfidz_progress_surah_id_fkey
    foreign key (surah_id)
    references public.surah_master(id)
    on delete cascade;
end $$;

-- 4. Force schema cache reload (usually automatic with DDL, but good to be sure)
notify pgrst, 'reload config';
-- Add signature_url to settings_lembaga for Headmaster signature
alter table public.settings_lembaga add column if not exists signature_url text;
-- Create storage bucket for raport assets
insert into storage.buckets (id, name, public)
values ('raport-assets', 'raport-assets', true)
on conflict (id) do nothing;

-- Policy: Allow authenticated users to upload files
create policy "Authenticated can upload assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'raport-assets' );

-- Policy: Allow authenticated users to update their own files (or all files for simplicity in this context)
create policy "Authenticated can update assets"
on storage.objects for update
to authenticated
using ( bucket_id = 'raport-assets' );

-- Policy: Allow public access to view assets (needed for printing)
create policy "Public can view assets"
on storage.objects for select
to public
using ( bucket_id = 'raport-assets' );
-- Ensure signature_url column exists in settings_lembaga
alter table public.settings_lembaga add column if not exists signature_url text;

-- Ensure signature_url column exists in users
alter table public.users add column if not exists signature_url text;

-- Fix RLS for settings_lembaga to allow updates by admin (if not already set)
drop policy if exists "Admin can update settings" on public.settings_lembaga;
create policy "Admin can update settings" on public.settings_lembaga
  for update using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Allow authenticated users to view settings (needed for everyone)
drop policy if exists "Authenticated can view settings" on public.settings_lembaga;
create policy "Authenticated can view settings" on public.settings_lembaga
  for select to authenticated using (true);

-- Fix RLS for users to allow Admin to update ANY user (including teachers)
drop policy if exists "Admin can update all users" on public.users;
create policy "Admin can update all users" on public.users
  for update using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Allow users to update their own profile (for teachers uploading their own sig)
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Reload schema cache
notify pgrst, 'reload config';
-- Migration: Add Tahsin Config to Halaqah
alter table public.halaqah
add column if not exists tahsin_items jsonb default '["Makhroj Huruf", "Mad", "Hukum Nun Sukun", "Hukum Mim Sukun", "Hukum Alif Lam", "Qolqolah", "Lafdzul Jalalah", "Hukum Gunnah", "Waqof-Washol", "Idghom Lanjutan"]'::jsonb;

-- Update existing rows to have the default if they are null (though default handles new rows)
update public.halaqah set tahsin_items = '["Makhroj Huruf", "Mad", "Hukum Nun Sukun", "Hukum Mim Sukun", "Hukum Alif Lam", "Qolqolah", "Lafdzul Jalalah", "Hukum Gunnah", "Waqof-Washol", "Idghom Lanjutan"]'::jsonb where tahsin_items is null;
-- Add attendance columns to report_cards
ALTER TABLE report_cards 
ADD COLUMN IF NOT EXISTS sakit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS izin INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS alpa INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jumlah_hari_efektif INTEGER;

-- Add effective days to semesters
ALTER TABLE semesters
ADD COLUMN IF NOT EXISTS jumlah_hari_efektif INTEGER DEFAULT 120;
-- Add tempat_tanggal_raport to settings_lembaga
ALTER TABLE settings_lembaga
ADD COLUMN IF NOT EXISTS tempat_tanggal_raport TEXT;
-- Create Tahsin Master Table
CREATE TABLE IF NOT EXISTS tahsin_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_item TEXT NOT NULL UNIQUE,
    urutan INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default Tahsin items
INSERT INTO tahsin_master (nama_item, urutan, is_active) VALUES
    ('Makhroj Huruf', 1, true),
    ('Mad', 2, true),
    ('Hukum Nun Sukun', 3, true),
    ('Hukum Mim Sukun', 4, true),
    ('Hukum Alif Lam', 5, true),
    ('Qolqolah', 6, true),
    ('Lafdzul Jalalah', 7, true),
    ('Hukum Gunnah', 8, true),
    ('Waqof-Washol', 9, true),
    ('Idzhar, Idghom, Ikhfa lanjutan', 10, true)
ON CONFLICT (nama_item) DO NOTHING;

-- Add RLS policies
ALTER TABLE tahsin_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to tahsin_master for authenticated users"
    ON tahsin_master FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to tahsin_master for authenticated users"
    ON tahsin_master FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to tahsin_master for authenticated users"
    ON tahsin_master FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow delete access to tahsin_master for authenticated users"
    ON tahsin_master FOR DELETE
    TO authenticated
    USING (true);
-- Add halaqah_id to tahsin_master for per-halaqah configuration
-- NULL halaqah_id means global/default for all halaqah

ALTER TABLE tahsin_master 
ADD COLUMN halaqah_id UUID REFERENCES halaqah(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_tahsin_master_halaqah ON tahsin_master(halaqah_id);

-- Update RLS policies to allow filtering by halaqah
DROP POLICY IF EXISTS "Allow read access to tahsin_master for authenticated users" ON tahsin_master;
DROP POLICY IF EXISTS "Allow insert access to tahsin_master for authenticated users" ON tahsin_master;
DROP POLICY IF EXISTS "Allow update access to tahsin_master for authenticated users" ON tahsin_master;
DROP POLICY IF EXISTS "Allow delete access to tahsin_master for authenticated users" ON tahsin_master;

CREATE POLICY "Allow read access to tahsin_master for authenticated users"
    ON tahsin_master FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow insert access to tahsin_master for authenticated users"
    ON tahsin_master FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow update access to tahsin_master for authenticated users"
    ON tahsin_master FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow delete access to tahsin_master for authenticated users"
    ON tahsin_master FOR DELETE
    TO authenticated
    USING (true);

-- Add comment
COMMENT ON COLUMN tahsin_master.halaqah_id IS 'NULL = global/default for all halaqah, specific UUID = only for that halaqah';
-- Standardize Tahsin Master Items
-- First, ensure we have a clean slate or update existing ones. 
-- Since we want a specific order, we'll update 'urutan' and insert missing ones.

-- 1. Pengenalan Huruf
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Pengenalan Huruf', 1, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 1, is_active = true;

-- 2. Panjang-Pendek
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Panjang-Pendek', 2, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 2, is_active = true;

-- 3. Tasydid
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Tasydid', 3, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 3, is_active = true;

-- 4. Makhroj Huruf
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Makhroj Huruf', 4, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 4, is_active = true;

-- 5. Mad
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Mad', 5, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 5, is_active = true;

-- 6. Hukum Nun Sukun
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Nun Sukun', 6, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 6, is_active = true;

-- 7. Hukum Mim Sukun
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Mim Sukun', 7, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 7, is_active = true;

-- 8. Hukum Alif Lam
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Alif Lam', 8, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 8, is_active = true;

-- 9. Qolqolah
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Qolqolah', 9, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 9, is_active = true;

-- 10. Lafdzul Jalalah
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Lafdzul Jalalah', 10, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 10, is_active = true;

-- 11. Hukum Gunnah
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Gunnah', 11, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 11, is_active = true;

-- 12. Waqof-Washol
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Waqof-Washol', 12, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 12, is_active = true;

-- 13. Idghom Lanjutan (Standardizing name if needed)
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Idghom Lanjutan', 13, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 13, is_active = true;

-- Handle potential duplicates or legacy names if necessary
-- For example 'Idzhar, Idghom, Ikhfa lanjutan' might be the old name for 'Idghom Lanjutan' or similar.
-- We'll keep both if they are different, but user can deactivate the old one.
-- Let's deactivate 'Idzhar, Idghom, Ikhfa lanjutan' if it exists and is different from 'Idghom Lanjutan'
UPDATE tahsin_master SET is_active = false WHERE nama_item = 'Idzhar, Idghom, Ikhfa lanjutan';
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

-- Add role column to teacher_assignments table
-- Default to 'guru' (ordinary teacher), can be 'pembimbing' (advisor)

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_assignments' AND column_name = 'role') THEN
        ALTER TABLE teacher_assignments ADD COLUMN role text DEFAULT 'guru';
    END IF;
END $$;

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
-- Migration: Add UAS Lisan Toggle
-- Add show_uas_lisan field to settings_lembaga table

ALTER TABLE public.settings_lembaga
ADD COLUMN IF NOT EXISTS show_uas_lisan BOOLEAN DEFAULT TRUE;

-- Update existing row to show UAS Lisan by default
UPDATE public.settings_lembaga
SET show_uas_lisan = TRUE
WHERE show_uas_lisan IS NULL;

-- Verification
SELECT 
  'Migration 024 completed' as status,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name = 'settings_lembaga' AND column_name = 'show_uas_lisan') as column_added;
-- Remove legacy combined Tahsin item
-- This item was previously used as a group header or combined item but is now replaced by individual items.
-- We use ILIKE to match closely, assuming the name in DB is "Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)"

DELETE FROM tahsin_master 
WHERE nama_item = 'Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)';
-- Remove individual Tahsin items as requested
-- User requested to remove "Pengenalan Huruf" and "Tasydid" from the input.

DELETE FROM tahsin_master 
WHERE nama_item IN ('Pengenalan Huruf', 'Tasydid');

-- Optional: If there is a combined item that matches unexpectedly, attempting to delete it too just in case.
-- (Though 024 should have handled the main legacy one).
DELETE FROM tahsin_master 
WHERE nama_item ILIKE '%Pengenalan Huruf%Tasydid%';
-- Remove deleted items from halaqah configurations (JSONB version)
-- The error prevents array_remove because the column is JSONB.
-- We use the '-' operator which removes a string element from a JSONB array.

-- Remove 'Pengenalan Huruf'
UPDATE halaqah 
SET tahsin_items = tahsin_items - 'Pengenalan Huruf'
WHERE tahsin_items @> '["Pengenalan Huruf"]';

-- Remove 'Tasydid'
UPDATE halaqah 
SET tahsin_items = tahsin_items - 'Tasydid'
WHERE tahsin_items @> '["Tasydid"]';

-- Remove the legacy combined item just in case
UPDATE halaqah 
SET tahsin_items = tahsin_items - 'Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)'
WHERE tahsin_items @> '["Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)"]';
-- Add shift column to halaqah table
ALTER TABLE halaqah 
ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('Siang', 'Sore'));

-- Comment for documentation
COMMENT ON COLUMN halaqah.shift IS 'Shift assignment for the entire halaqah (Siang/Sore)';
-- Remove "Panjang Pendek" item from tahsin_master
-- This item is no longer relevant as it's replaced by "Mad"

DELETE FROM tahsin_master 
WHERE nama_item = 'Panjang Pendek';

-- Also remove from any halaqah configurations (tahsin_items is JSONB array)
UPDATE halaqah 
SET tahsin_items = (
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements_text(tahsin_items) AS item
    WHERE item != 'Panjang Pendek'
)
WHERE tahsin_items ? 'Panjang Pendek';

COMMENT ON TABLE tahsin_master IS 'Migration 028: Removed obsolete "Panjang Pendek" item, replaced by "Mad"';
-- Cleanup "Panjang Pendek" from all existing report_cards data
-- This removes the obsolete item from kognitif.Tahsin in all saved reports

UPDATE report_cards
SET kognitif = jsonb_set(
    kognitif,
    '{Tahsin}',
    (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(kognitif->'Tahsin')
        WHERE key NOT IN ('Panjang Pendek', 'Panjang-Pendek')
    )
)
WHERE kognitif ? 'Tahsin' 
  AND (
    kognitif->'Tahsin' ? 'Panjang Pendek' 
    OR kognitif->'Tahsin' ? 'Panjang-Pendek'
  );

COMMENT ON TABLE report_cards IS 'Migration 029: Cleaned up obsolete "Panjang Pendek" from all existing report data';
-- Update view_leger_nilai to use simple average instead of weighted average
-- New formula: (Akhlak + Kedisiplinan + Kognitif) / 3

DROP VIEW IF EXISTS public.view_leger_nilai;

CREATE OR REPLACE VIEW public.view_leger_nilai AS
SELECT 
  s.id as student_id,
  s.nama as student_name,
  s.nis,
  s.halaqah_id,
  h.nama as halaqah_name,
  rc.semester_id,
  rc.nilai_akhir_akhlak,
  rc.nilai_akhir_kedisiplinan,
  rc.nilai_akhir_kognitif,
  -- Simple average: (Akhlak + Kedisiplinan + Kognitif) / 3
  (rc.nilai_akhir_akhlak + rc.nilai_akhir_kedisiplinan + rc.nilai_akhir_kognitif) / 3 as nilai_akhir_total
FROM public.students s
LEFT JOIN public.halaqah h ON s.halaqah_id = h.id
JOIN public.report_cards rc ON s.id = rc.student_id;

COMMENT ON VIEW public.view_leger_nilai IS 'Migration 030: Updated to use simple average formula instead of weighted average';
-- Update skala_penilaian in settings_lembaga to new scale
-- New scale: A: 90-100, B: 80-89, C: 70-79, D: <70

UPDATE settings_lembaga
SET skala_penilaian = jsonb_build_object(
    'A', 90,
    'B', 80,
    'C', 70,
    'D', 0
);

COMMENT ON TABLE settings_lembaga IS 'Migration 031: Updated skala_penilaian to new grading scale (A:90+, B:80-89, C:70-79, D:<70)';
