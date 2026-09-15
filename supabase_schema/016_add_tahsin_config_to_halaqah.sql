-- Migration: Add Tahsin Config to Halaqah
alter table public.halaqah
add column if not exists tahsin_items jsonb default '["Makhroj Huruf", "Mad", "Hukum Nun Sukun", "Hukum Mim Sukun", "Hukum Alif Lam", "Qolqolah", "Lafdzul Jalalah", "Hukum Gunnah", "Waqof-Washol", "Idghom Lanjutan"]'::jsonb;

-- Update existing rows to have the default if they are null (though default handles new rows)
update public.halaqah set tahsin_items = '["Makhroj Huruf", "Mad", "Hukum Nun Sukun", "Hukum Mim Sukun", "Hukum Alif Lam", "Qolqolah", "Lafdzul Jalalah", "Hukum Gunnah", "Waqof-Washol", "Idghom Lanjutan"]'::jsonb where tahsin_items is null;
