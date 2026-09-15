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
