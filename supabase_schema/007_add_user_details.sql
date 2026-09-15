-- Migration: Add full_name and signature_url to users table

alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists signature_url text;
