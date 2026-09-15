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
