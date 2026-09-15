-- Standardize Tahsin Master Items
-- First, ensure we have a clean slate or update existing ones. 
-- Since we want a specific order, we'll update 'urutan' and insert missing ones.

-- 1. Pengenalan Huruf
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Pengenalan Huruf', 1, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 1, is_active = true;

-- 2. Panjang-Pendek
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Panjang-Pendek', 2, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 2, is_active = true;

-- 3. Tasydid
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Tasydid', 3, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 3, is_active = true;

-- 4. Makhroj Huruf
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Makhroj Huruf', 4, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 4, is_active = true;

-- 5. Mad
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Mad', 5, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 5, is_active = true;

-- 6. Hukum Nun Sukun
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Nun Sukun', 6, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 6, is_active = true;

-- 7. Hukum Mim Sukun
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Mim Sukun', 7, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 7, is_active = true;

-- 8. Hukum Alif Lam
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Alif Lam', 8, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 8, is_active = true;

-- 9. Qolqolah
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Qolqolah', 9, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 9, is_active = true;

-- 10. Lafdzul Jalalah
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Lafdzul Jalalah', 10, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 10, is_active = true;

-- 11. Hukum Gunnah
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Hukum Gunnah', 11, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 11, is_active = true;

-- 12. Waqof-Washol
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Waqof-Washol', 12, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 12, is_active = true;

-- 13. Idghom Lanjutan (Standardizing name if needed)
INSERT INTO tahsin_master (nama_item, urutan, is_active)
VALUES ('Idghom Lanjutan', 13, true)
ON CONFLICT (nama_item) DO UPDATE SET urutan = 13, is_active = true;

-- Handle potential duplicates or legacy names if necessary
-- For example 'Idzhar, Idghom, Ikhfa lanjutan' might be the old name for 'Idghom Lanjutan' or similar.
-- We'll keep both if they are different, but user can deactivate the old one.
-- Let's deactivate 'Idzhar, Idghom, Ikhfa lanjutan' if it exists and is different from 'Idghom Lanjutan'
UPDATE tahsin_master SET is_active = false WHERE nama_item = 'Idzhar, Idghom, Ikhfa lanjutan';
