-- Update skala_penilaian in settings_lembaga to new scale
-- New scale: A: 90-100, B: 80-89, C: 70-79, D: <70

UPDATE settings_lembaga
SET skala_penilaian = jsonb_build_object(
    'A', 90,
    'B', 80,
    'C', 70,
    'D', 0
);

COMMENT ON TABLE settings_lembaga IS 'Migration 031: Updated skala_penilaian to new grading scale (A:90+, B:80-89, C:70-79, D:<70)';
