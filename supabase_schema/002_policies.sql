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
