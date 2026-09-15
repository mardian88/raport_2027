-- Add signature_url to settings_lembaga for Headmaster signature
alter table public.settings_lembaga add column if not exists signature_url text;
