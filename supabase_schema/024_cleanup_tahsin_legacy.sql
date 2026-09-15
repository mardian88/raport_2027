-- Remove legacy combined Tahsin item
-- This item was previously used as a group header or combined item but is now replaced by individual items.
-- We use ILIKE to match closely, assuming the name in DB is "Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)"

DELETE FROM tahsin_master 
WHERE nama_item = 'Tahsin Dasar (Pengenalan Huruf, Panjang-Pendek, Tasydid)';
