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
