-- Migration: Add UAS Lisan Toggle
-- Add show_uas_lisan field to settings_lembaga table

ALTER TABLE public.settings_lembaga
ADD COLUMN IF NOT EXISTS show_uas_lisan BOOLEAN DEFAULT TRUE;

-- Update existing row to show UAS Lisan by default
UPDATE public.settings_lembaga
SET show_uas_lisan = TRUE
WHERE show_uas_lisan IS NULL;

-- Verification
SELECT 
  'Migration 024 completed' as status,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name = 'settings_lembaga' AND column_name = 'show_uas_lisan') as column_added;
