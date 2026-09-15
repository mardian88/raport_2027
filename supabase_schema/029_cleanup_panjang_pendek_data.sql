-- Cleanup "Panjang Pendek" from all existing report_cards data
-- This removes the obsolete item from kognitif.Tahsin in all saved reports

UPDATE report_cards
SET kognitif = jsonb_set(
    kognitif,
    '{Tahsin}',
    (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(kognitif->'Tahsin')
        WHERE key NOT IN ('Panjang Pendek', 'Panjang-Pendek')
    )
)
WHERE kognitif ? 'Tahsin' 
  AND (
    kognitif->'Tahsin' ? 'Panjang Pendek' 
    OR kognitif->'Tahsin' ? 'Panjang-Pendek'
  );

COMMENT ON TABLE report_cards IS 'Migration 029: Cleaned up obsolete "Panjang Pendek" from all existing report data';
