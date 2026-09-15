-- Remove individual Tahsin items as requested
-- User requested to remove "Pengenalan Huruf" and "Tasydid" from the input.

DELETE FROM tahsin_master 
WHERE nama_item IN ('Pengenalan Huruf', 'Tasydid');

-- Optional: If there is a combined item that matches unexpectedly, attempting to delete it too just in case.
-- (Though 024 should have handled the main legacy one).
DELETE FROM tahsin_master 
WHERE nama_item ILIKE '%Pengenalan Huruf%Tasydid%';
