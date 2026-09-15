-- Add tempat_tanggal_raport to settings_lembaga
ALTER TABLE settings_lembaga
ADD COLUMN IF NOT EXISTS tempat_tanggal_raport TEXT;
