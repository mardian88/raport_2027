-- Migration 033: Migrasi typo dan legacy keys di jsonb
-- Date: 2026-09-10
-- Reason: Migration logic di RaportInput.tsx handle legacy key
--         "Sholat Berjamaah" → "Shalat Berjamaah". Ini pertanda data
--         lama masih pakai ejaan lama. Beberapa di antaranya mungkin
--         masih ada di database produksi.
--
-- Setelah dijalankan, migration logic di aplikasi bisa dihapus/sederhanakan.

-- ============================================================================
-- 1. Rename "Sholat Berjamaah" → "Shalat Berjamaah" di akhlak dan kedisiplinan
-- ============================================================================
UPDATE public.report_cards
SET
    akhlak = (
        SELECT jsonb_object_agg(
            CASE WHEN key = 'Sholat Berjamaah' THEN 'Shalat Berjamaah' ELSE key END,
            value
        )
        FROM jsonb_each(akhlak)
    ),
    updated_at = now()
WHERE akhlak ? 'Sholat Berjamaah';

UPDATE public.report_cards
SET
    kedisiplinan = (
        SELECT jsonb_object_agg(
            CASE WHEN key = 'Sholat Berjamaah' THEN 'Shalat Berjamaah' ELSE key END,
            value
        )
        FROM jsonb_each(kedisiplinan)
    ),
    updated_at = now()
WHERE kedisiplinan ? 'Sholat Berjamaah';

-- ============================================================================
-- 2. Rename "Tilawah Mandiri" → "Tilawah & Hafalan Mandiri" (kognitif)
-- ============================================================================
UPDATE public.report_cards
SET
    kognitif = (
        SELECT jsonb_object_agg(
            CASE
                WHEN key = 'Tilawah Mandiri' THEN 'Tilawah & Hafalan Mandiri'
                ELSE key
            END,
            value
        )
        FROM jsonb_each(kognitif)
    ),
    updated_at = now()
WHERE kognitif ? 'Tilawah Mandiri';

-- ============================================================================
-- 3. Hapus legacy keys yang sudah obsolete
-- ============================================================================
-- Hapus dari akhlak: "Adab Kepada Allah & Rasul", "Adab Kepada Orang Tua",
--                     "Adab Terhadap Guru", "Adab Terhadap Teman",
--                     "Adab Terhadap" (varian), "Panjang Pendek"
UPDATE public.report_cards
SET
    akhlak = akhlak - ARRAY['Adab Kepada Allah & Rasul', 'Adab Kepada Orang Tua',
                            'Adab Terhadap Guru', 'Adab Terhadap Teman',
                            'Adab Terhadap', 'Panjang Pendek'],
    updated_at = now()
WHERE akhlak ?| ARRAY['Adab Kepada Allah & Rasul', 'Adab Kepada Orang Tua',
                       'Adab Terhadap Guru', 'Adab Terhadap Teman',
                       'Adab Terhadap', 'Panjang Pendek'];

-- Hapus dari kedisiplinan: key obsolete yang sama
UPDATE public.report_cards
SET
    kedisiplinan = kedisiplinan - ARRAY['Adab Kepada Allah & Rasul', 'Adab Kepada Orang Tua',
                                         'Adab Terhadap Guru', 'Adab Terhadap Teman',
                                         'Adab Terhadap', 'Panjang Pendek'],
    updated_at = now()
WHERE kedisiplinan ?| ARRAY['Adab Kepada Allah & Rasul', 'Adab Kepada Orang Tua',
                            'Adab Terhadap Guru', 'Adab Terhadap Teman',
                            'Adab Terhadap', 'Panjang Pendek'];

-- ============================================================================
-- 4. Verifikasi (jalankan manual setelah migration)
-- ============================================================================
-- SELECT id, akhlak, kedisiplinan FROM report_cards
-- WHERE akhlak ? 'Sholat Berjamaah'
--    OR kedisiplinan ? 'Sholat Berjamaah'
--    OR kognitif ? 'Tilawah Mandiri'
--    OR akhlak ?| ARRAY['Adab Terhadap', 'Panjang Pendek'];
--
-- Harusnya return 0 rows. Kalau masih ada, cek lagi.

-- Catatan: backup dulu sebelum menjalankan migration ini di production.
--         Gunakan: CREATE TABLE report_cards_backup_20260910 AS SELECT * FROM report_cards;