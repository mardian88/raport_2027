-- Remove "Panjang Pendek" item from tahsin_master
-- This item is no longer relevant as it's replaced by "Mad"

DELETE FROM tahsin_master 
WHERE nama_item = 'Panjang Pendek';

-- Also remove from any halaqah configurations (tahsin_items is JSONB array)
UPDATE halaqah 
SET tahsin_items = (
    SELECT jsonb_agg(item)
    FROM jsonb_array_elements_text(tahsin_items) AS item
    WHERE item != 'Panjang Pendek'
)
WHERE tahsin_items ? 'Panjang Pendek';

COMMENT ON TABLE tahsin_master IS 'Migration 028: Removed obsolete "Panjang Pendek" item, replaced by "Mad"';
