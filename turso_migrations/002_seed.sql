-- ============================================================
-- Migration 002: Seed Data Default
-- ============================================================

-- Default settings lembaga
INSERT INTO settings_lembaga (
  id,
  nama_lembaga,
  alamat,
  kota,
  nomor_kontak,
  nama_kepala_lembaga,
  nip_kepala_lembaga,
  bobot_akhlak,
  bobot_kedisiplinan,
  bobot_kognitif,
  skala_penilaian,
  footer_raport
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Rumah Qur''an Muharrik',
  'Jl. Contoh No. 123',
  'Jakarta',
  '021-12345678',
  'Nama Kepala Lembaga',
  '-',
  30,
  30,
  40,
  '{"A":85,"B":70,"C":60,"D":0}',
  ''
);

-- Default admin user (password: admin123, akan di-hash di aplikasi)
-- Catatan: production harus langsung reset setelah first login
INSERT INTO users (
  id,
  email,
  password_hash,
  role,
  full_name,
  is_active
) VALUES (
  '00000000-0000-0000-0000-0000000000aa',
  'admin@rqm.com',
  NULL,                                     -- akan di-set via API dengan hash
  'admin',
  'Administrator',
  1
);

-- Tahsin master default (global, halaqah_id NULL)
INSERT INTO tahsin_master (id, nama_item, urutan, halaqah_id) VALUES
  ('tm-001', 'Mad', 1, NULL),
  ('tm-002', 'Ghunnah', 2, NULL),
  ('tm-003', 'Idgham', 4, NULL),
  ('tm-004', 'Ikhfa', 5, NULL),
  ('tm-005', 'Iqlab', 6, NULL),
  ('tm-006', 'Qalqalah', 7, NULL),
  ('tm-007', 'Tafkhim', 8, NULL),
  ('tm-008', 'Tarqiq', 9, NULL),
  ('tm-009', 'Waqaf & Ibtida', 10, NULL);

-- Surah master untuk Juz 30 (default yang sering dipakai)
INSERT INTO surah_master (id, nama_surah, juz, urutan_dalam_juz) VALUES
  ('s-001', 'An-Naba''', 30, 1),
  ('s-002', 'An-Naziat', 30, 2),
  ('s-003', 'Abasa', 30, 3),
  ('s-004', 'At-Takwir', 30, 4),
  ('s-005', 'Al-Infithar', 30, 5),
  ('s-006', 'Al-Muthaffifin', 30, 6),
  ('s-007', 'Al-Insyiqaq', 30, 7),
  ('s-008', 'Al-Buruj', 30, 8),
  ('s-009', 'At-Thariq', 30, 9),
  ('s-010', 'Al-A''la', 30, 10),
  ('s-011', 'Al-Ghasyiyah', 30, 11),
  ('s-012', 'Al-Fajr', 30, 12),
  ('s-013', 'Al-Balad', 30, 13),
  ('s-014', 'Asy-Syams', 30, 14),
  ('s-015', 'Al-Lail', 30, 15),
  ('s-016', 'Adh-Dhuha', 30, 16),
  ('s-017', 'Al-Insyirah', 30, 17),
  ('s-018', 'At-Tin', 30, 18),
  ('s-019', 'Al-Alaq', 30, 19),
  ('s-020', 'Al-Qadr', 30, 20),
  ('s-021', 'Al-Bayyinah', 30, 21),
  ('s-022', 'Az-Zalzalah', 30, 22),
  ('s-023', 'Al-Adiyat', 30, 23),
  ('s-024', 'Al-Qari''ah', 30, 24),
  ('s-025', 'At-Takatsur', 30, 25),
  ('s-026', 'Al-Ashr', 30, 26),
  ('s-027', 'Al-Humazah', 30, 27),
  ('s-028', 'Al-Fil', 30, 28),
  ('s-029', 'Quraisy', 30, 29),
  ('s-030', 'Al-Ma''un', 30, 30),
  ('s-031', 'Al-Kautsar', 30, 31),
  ('s-032', 'Al-Kafirun', 30, 32),
  ('s-033', 'An-Nashr', 30, 33),
  ('s-034', 'Al-Lahab', 30, 34),
  ('s-035', 'Al-Ikhlas', 30, 35),
  ('s-036', 'Al-Falaq', 30, 36),
  ('s-037', 'An-Nas', 30, 37);