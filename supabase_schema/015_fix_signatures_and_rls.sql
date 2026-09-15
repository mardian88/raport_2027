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
