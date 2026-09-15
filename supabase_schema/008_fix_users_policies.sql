-- Migration: Add missing policies for users table management

-- Allow admin to update all users (for managing teacher profiles)
create policy if not exists "Admin can update all users" on public.users
  for update using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Allow admin to insert users (though typically done via trigger)
create policy if not exists "Admin can insert users" on public.users
  for insert with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- Allow users to update their own profile
create policy if not exists "Users can update own profile" on public.users
  for update using (auth.uid() = id);
