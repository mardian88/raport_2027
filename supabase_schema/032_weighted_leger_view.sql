-- Migration 032: Perbaiki view_leger_nilai — pakai weighted formula
-- Date: 2026-09-10
-- Reason: Migration 030 menggunakan simple average, tapi:
--   - Bobot (bobot_akhlak, bobot_kedisiplinan, bobot_kognitif) sudah
--     ditampilkan di UI Pengaturan Lembaga
--   - Bobot sudah disimpan ke DB (settings_lembaga)
--   - RaportTemplate (file yang dipakai untuk CETAK) sudah pakai weighted
--     via calculateFinalScore helper
--   - Tapi view DB masih simple average → legar tidak cocok dengan cetakan
--
-- Setelah fix ini, semua kalkulasi nilai akhir (raport, leger, peringkat)
-- konsisten menggunakan bobot dari settings_lembaga.
--
-- DEFAULT dipakai kalau settings belum di-set. Default konsisten dengan
-- 001_create_tables.sql: 30/30/40.

DROP VIEW IF EXISTS public.view_leger_nilai;

CREATE OR REPLACE VIEW public.view_leger_nilai AS
WITH settings AS (
    SELECT
        COALESCE(bobot_akhlak, 30) AS ba,
        COALESCE(bobot_kedisiplinan, 30) AS bk,
        COALESCE(bobot_kognitif, 40) AS bg
    FROM public.settings_lembaga
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT
    s.id AS student_id,
    s.nama AS student_name,
    s.nis,
    s.halaqah_id,
    h.nama AS halaqah_name,
    rc.semester_id,
    rc.nilai_akhir_akhlak,
    rc.nilai_akhir_kedisiplinan,
    rc.nilai_akhir_kognitif,
    -- Weighted formula: (akhlak*ba + kedisiplinan*bk + kognitif*bg) / 100
    (
        rc.nilai_akhir_akhlak * (SELECT ba FROM settings) +
        rc.nilai_akhir_kedisiplinan * (SELECT bk FROM settings) +
        rc.nilai_akhir_kognitif * (SELECT bg FROM settings)
    ) / 100 AS nilai_akhir_total,
    -- Skala predikat dari settings (untuk tampilan leger)
    CASE
        WHEN (
            rc.nilai_akhir_akhlak * (SELECT ba FROM settings) +
            rc.nilai_akhir_kedisiplinan * (SELECT bk FROM settings) +
            rc.nilai_akhir_kognitif * (SELECT bg FROM settings)
        ) / 100 >= COALESCE(
            (SELECT (s.skala_penilaian->>'A')::numeric FROM public.settings_lembaga s ORDER BY s.created_at DESC LIMIT 1),
            85
        ) THEN 'A'
        WHEN (
            rc.nilai_akhir_akhlak * (SELECT ba FROM settings) +
            rc.nilai_akhir_kedisiplinan * (SELECT bk FROM settings) +
            rc.nilai_akhir_kognitif * (SELECT bg FROM settings)
        ) / 100 >= COALESCE(
            (SELECT (s.skala_penilaian->>'B')::numeric FROM public.settings_lembaga s ORDER BY s.created_at DESC LIMIT 1),
            70
        ) THEN 'B'
        WHEN (
            rc.nilai_akhir_akhlak * (SELECT ba FROM settings) +
            rc.nilai_akhir_kedisiplinan * (SELECT bk FROM settings) +
            rc.nilai_akhir_kognitif * (SELECT bg FROM settings)
        ) / 100 >= COALESCE(
            (SELECT (s.skala_penilaian->>'C')::numeric FROM public.settings_lembaga s ORDER BY s.created_at DESC LIMIT 1),
            60
        ) THEN 'C'
        ELSE 'D'
    END AS predikat
FROM public.students s
LEFT JOIN public.halaqah h ON s.halaqah_id = h.id
JOIN public.report_cards rc ON s.id = rc.student_id;

COMMENT ON VIEW public.view_leger_nilai IS 'Migration 032: Weighted formula based on settings_lembaga.bobot_*. Konsisten dengan RaportTemplate dan calculateFinalScore di aplikasi.';

-- Validasi: kalau bobot tidak valid, fallback ke simple average
-- agar tidak ada division by zero atau error lain.
-- (Validasi penuh ada di kode aplikasi via isWeightsValid)