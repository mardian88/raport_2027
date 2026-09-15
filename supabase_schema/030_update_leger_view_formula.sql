-- Update view_leger_nilai to use simple average instead of weighted average
-- New formula: (Akhlak + Kedisiplinan + Kognitif) / 3

DROP VIEW IF EXISTS public.view_leger_nilai;

CREATE OR REPLACE VIEW public.view_leger_nilai AS
SELECT 
  s.id as student_id,
  s.nama as student_name,
  s.nis,
  s.halaqah_id,
  h.nama as halaqah_name,
  rc.semester_id,
  rc.nilai_akhir_akhlak,
  rc.nilai_akhir_kedisiplinan,
  rc.nilai_akhir_kognitif,
  -- Simple average: (Akhlak + Kedisiplinan + Kognitif) / 3
  (rc.nilai_akhir_akhlak + rc.nilai_akhir_kedisiplinan + rc.nilai_akhir_kognitif) / 3 as nilai_akhir_total
FROM public.students s
LEFT JOIN public.halaqah h ON s.halaqah_id = h.id
JOIN public.report_cards rc ON s.id = rc.student_id;

COMMENT ON VIEW public.view_leger_nilai IS 'Migration 030: Updated to use simple average formula instead of weighted average';
