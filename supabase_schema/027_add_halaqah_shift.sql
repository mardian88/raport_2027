-- Add shift column to halaqah table
ALTER TABLE halaqah 
ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('Siang', 'Sore'));

-- Comment for documentation
COMMENT ON COLUMN halaqah.shift IS 'Shift assignment for the entire halaqah (Siang/Sore)';
