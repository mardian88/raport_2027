-- Remove deleted items from halaqah configurations (JSONB version)
-- The error prevents array_remove because the column is JSONB.
-- We use the '-' operator which removes a string element from a JSONB array.

-- Remove 'Pengenalan Huruf'
UPDATE halaqah 
SET tahsin_items = tahsin_items - 'Pengenalan Huruf'
WHERE tahsin_items @> '["Pengenalan Huruf"]';

-- Remove 'Tasydid'
UPDATE halaqah 
SET tahsin_items = tahsin_items - 'Tasydid'
WHERE tahsin_items @> '["Tasydid"]';

-- Remove the legacy combined item just in case
UPDATE halaqah 
SET tahsin_items = tahsin_items - 'Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)'
WHERE tahsin_items @> '["Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)"]';
