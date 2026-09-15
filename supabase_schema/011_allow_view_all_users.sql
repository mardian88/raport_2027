-- Allow all authenticated users to view users (needed for report card printing to show teacher names)
drop policy if exists "Users can view own data" on public.users;
create policy "Authenticated can view all users" on public.users
  for select to authenticated using (true);
