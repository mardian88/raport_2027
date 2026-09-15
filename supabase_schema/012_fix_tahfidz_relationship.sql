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
