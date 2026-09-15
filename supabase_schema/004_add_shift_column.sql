-- Migration: Add shift column to existing students table

-- Add shift column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='students' AND column_name='shift') THEN
        ALTER TABLE public.students 
        ADD COLUMN shift text CHECK (shift IN ('Siang', 'Sore')) DEFAULT 'Sore';
    END IF;
END $$;

-- Update existing students to have default shift 'Sore'
UPDATE public.students SET shift = 'Sore' WHERE shift IS NULL;
