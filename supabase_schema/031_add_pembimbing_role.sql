-- Migration 031: Tambah role 'pembimbing' ke enum user_role
-- Date: 2026-09-10
-- Reason: Pembimbing adalah role yang dipakai di GuruInput.tsx untuk input
--         akhlak/kedisiplinan, tapi enum di DB tidak punya nilai ini.
--         Tanpa migration ini, insert user dengan role 'pembimbing' dari
--         aplikasi akan error atau dicek tanpa enforcement DB.
--
-- IMPORTANT: PostgreSQL ALTER TYPE ... ADD VALUE tidak boleh dijalankan
-- dalam transaction block yang sama dengan perintah lain. Jalankan file
-- ini SENDIRI.

-- 1. Tambah 'pembimbing' ke enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pembimbing';

-- 2. Update RLS policy untuk role pembimbing (lihat 002_policies.sql)
--    Pembimbing hanya boleh insert/update data akhlak & kedisiplinan
--    untuk halaqah yang di-assign. Implementasi detail ada di 002.

-- Catatan: PostgreSQL tidak bisa menambah enum value di dalam
-- transaction yang sama. Jika menjalankan sebagai migration biasa,
-- pisahkan dengan file terpisah atau set --single-transaction off.