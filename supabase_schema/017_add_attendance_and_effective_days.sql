-- Add attendance columns to report_cards
ALTER TABLE report_cards 
ADD COLUMN IF NOT EXISTS sakit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS izin INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS alpa INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jumlah_hari_efektif INTEGER;

-- Add effective days to semesters
ALTER TABLE semesters
ADD COLUMN IF NOT EXISTS jumlah_hari_efektif INTEGER DEFAULT 120;
