# Migration Plan: Supabase → Turso

**Tanggal:** 10 September 2026
**Target DB:** Turso (`libsql://raportnew-mardian88.aws-ap-south-1.turso.io`)
**Strategi:** Pindah total — custom auth + custom storage API

---

## 1. Gambaran Migrasi

| Aspek | Saat Ini (Supabase) | Target (Turso) |
|-------|---------------------|----------------|
| Database | PostgreSQL | SQLite (libSQL) |
| Auth | Supabase Auth (email/password + magic link) | Custom — email/password + JWT session |
| Storage | Supabase Storage bucket `raport-assets` | API upload sendiri (host via Turso blob / external CDN) |
| RLS | Postgres RLS policies | App-level checks (di API layer) |
| Real-time | Supabase Realtime subscriptions | Hapus dulu (tidak dipakai) / Polling |
| Migrations | File SQL numbered di `supabase_schema/` | File SQL di `turso_migrations/` |

**Mengapa ini signifikan:**
- SQLite tidak punya `jsonb`, `uuid_generate_v4()`, `enum`, `RANK() OVER`, `generate_series()`, dll
- Postgres RLS hilang → authorization dipindah ke aplikasi
- Supabase Storage hilang → butuh hosting alternatif atau API
- Trigger DB hilang → logika yang dulunya di trigger harus pindah ke kode

---

## 2. Schema Mapping Detail

### 2.1 Tipe Data

| PostgreSQL | SQLite | Catatan |
|------------|--------|---------|
| `uuid` | `TEXT` | Generate via `lower(hex(randomblob(16)))` atau UUIDv7 di app |
| `text` | `TEXT` | Sama |
| `integer` | `INTEGER` | Sama |
| `numeric` | `REAL` | Hilang presisi >15, jarang masalah di sini |
| `boolean` | `INTEGER` (0/1) | Convention pakai CHECK (val IN (0,1)) |
| `date` | `TEXT` (ISO 8601) | Format `YYYY-MM-DD` |
| `timestamptz` | `TEXT` (ISO 8601) | Selalu simpan UTC |
| `jsonb` | `TEXT` (JSON.stringify) | Index GIN hilang, query JSON di app |
| `enum user_role` | `TEXT` + CHECK | `(role IN ('admin','guru','viewer','pembimbing'))` |
| `unique constraint` | `UNIQUE` clause | Sama |
| `check constraint` | `CHECK` clause | Sama |
| `default uuid_generate_v4()` | App-level | Generate di aplikasi, atau di trigger SQLite |
| `default now()` | `CURRENT_TIMESTAMP` | Built-in SQLite |

### 2.2 Fitur Hilang & Solusi

| Fitur Postgres | Solusi |
|----------------|--------|
| `gen_random_uuid()` | Pakai `crypto.randomUUID()` di JS atau `lower(hex(randomblob(4)) ||hex(randomblob(2)) ||...)` di SQL |
| `auth.users` (linked ke public.users via FK) | Buat tabel `users` mandiri, simpan password hash di tabel |
| `auth.uid()` di RLS | Custom: token JWT berisi `user_id`, dicek di setiap endpoint |
| Trigger `on_auth_user_created` | Pindah ke kode registrasi: setelah insert user → insert ke tabel users |
| View `view_leger_nilai` | Pindah ke app-level query atau materialized cache |
| Full-text search | Pakai FTS5 (built-in SQLite, supported di Turso) |
| `FOR UPDATE` locks | Turso libSQL mendukung transaksi, gunakan `BEGIN IMMEDIATE` |

---

## 3. Skema SQLite (Target)

Berikut skema baru dalam format SQLite. Saya buat sebagai 1 file monolitik `turso_migrations/001_init.sql`:

```sql
-- 001_init.sql
PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS (ganti auth.users + public.users)
-- ============================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,                       -- crypto.randomUUID()
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,               -- argon2id hash
  role TEXT NOT NULL CHECK(role IN ('admin','guru','viewer','pembimbing')),
  full_name TEXT,
  signature_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Sessions table untuk custom auth
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                       -- session token (random 32 bytes hex)
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE settings_lembaga (
  id TEXT PRIMARY KEY,
  nama_lembaga TEXT NOT NULL,
  alamat TEXT,
  kota TEXT,
  nomor_kontak TEXT,
  nama_kepala_lembaga TEXT,
  nip_kepala_lembaga TEXT,
  logo_url TEXT,
  signature_url TEXT,
  bobot_akhlak REAL NOT NULL DEFAULT 30,
  bobot_kedisiplinan REAL NOT NULL DEFAULT 30,
  bobot_kognitif REAL NOT NULL DEFAULT 40,
  skala_penilaian TEXT NOT NULL DEFAULT '{"A":85,"B":70,"C":60,"D":0}', -- TEXT (JSON)
  footer_raport TEXT,
  tempat_tanggal_raport TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ============================================================
-- ACADEMIC YEARS & SEMESTERS
-- ============================================================
CREATE TABLE academic_years (
  id TEXT PRIMARY KEY,
  tahun_ajaran TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE semesters (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL,
  nama TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  jumlah_hari_efektif INTEGER DEFAULT 120,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE INDEX idx_semesters_active ON semesters(is_active);

-- ============================================================
-- HALAQAH
-- ============================================================
CREATE TABLE halaqah (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  shift TEXT CHECK(shift IN ('Siang','Sore')) DEFAULT 'Sore',
  tahsin_items TEXT DEFAULT '[]',           -- JSON array
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  nis TEXT UNIQUE,
  halaqah_id TEXT,
  jenis_kelamin TEXT,
  tanggal_lahir TEXT,                        -- ISO date
  nama_orang_tua TEXT,
  shift TEXT CHECK(shift IN ('Siang','Sore')) DEFAULT 'Sore',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE SET NULL
);

CREATE INDEX idx_students_halaqah ON students(halaqah_id);
CREATE INDEX idx_students_active ON students(is_active);

-- ============================================================
-- TEACHER ASSIGNMENTS
-- ============================================================
CREATE TABLE teacher_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  halaqah_id TEXT NOT NULL,
  subject TEXT NOT NULL,                     -- 'Tahfidz', 'Tahsin', 'Akhlak', 'Kedisiplinan'
  role TEXT NOT NULL,                        -- 'guru' | 'pembimbing'
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, halaqah_id, subject)
);

CREATE INDEX idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_halaqah ON teacher_assignments(halaqah_id);

-- ============================================================
-- TAHSIN MASTER
-- ============================================================
CREATE TABLE tahsin_master (
  id TEXT PRIMARY KEY,
  nama_item TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0,
  halaqah_id TEXT,                           -- NULL = global
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE CASCADE
);

-- ============================================================
-- SURAH MASTER & ASSIGNMENT
-- ============================================================
CREATE TABLE surah_master (
  id TEXT PRIMARY KEY,
  nama_surah TEXT NOT NULL,
  juz INTEGER NOT NULL,
  urutan_dalam_juz INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE student_surah_assignment (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  surah_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (surah_id) REFERENCES surah_master(id) ON DELETE CASCADE,
  UNIQUE(student_id, surah_id)
);

-- ============================================================
-- TAHFIDZ PROGRESS
-- ============================================================
CREATE TABLE tahfidz_progress (
  id TEXT PRIMARY KEY,
  report_card_id TEXT,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  surah_id TEXT NOT NULL,
  kb REAL NOT NULL DEFAULT 0 CHECK(kb >= 0 AND kb <= 100),
  kh REAL NOT NULL DEFAULT 0 CHECK(kh >= 0 AND kh <= 100),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  FOREIGN KEY (surah_id) REFERENCES surah_master(id) ON DELETE CASCADE
);

CREATE INDEX idx_tahfidz_report ON tahfidz_progress(report_card_id);
CREATE INDEX idx_tahfidz_student_semester ON tahfidz_progress(student_id, semester_id);

-- ============================================================
-- REPORT CARDS
-- ============================================================
CREATE TABLE report_cards (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  akhlak TEXT DEFAULT '{}',                  -- {"Adab kepada Guru": 85, ...}
  kedisiplinan TEXT DEFAULT '{}',
  kognitif TEXT DEFAULT '{}',
  tahsin TEXT DEFAULT '{}',                  -- tambahan kalau perlu
  uas_tulis REAL DEFAULT 0,
  uas_lisan REAL DEFAULT 0,
  nilai_akhir_akhlak REAL DEFAULT 0,
  nilai_akhir_kedisiplinan REAL DEFAULT 0,
  nilai_akhir_kognitif REAL DEFAULT 0,
  sakit INTEGER DEFAULT 0,
  izin INTEGER DEFAULT 0,
  alpa INTEGER DEFAULT 0,
  catatan TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(student_id, semester_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_cards_student ON report_cards(student_id);
CREATE INDEX idx_report_cards_semester ON report_cards(semester_id);

-- ============================================================
-- FILES METADATA (untuk storage custom)
-- ============================================================
CREATE TABLE uploaded_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,                -- path di filesystem/CDN
  bucket TEXT NOT NULL,                       -- 'logo', 'signature', etc.
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_bucket ON uploaded_files(bucket);
```

---

## 4. Custom Auth Design

### 4.1 Schema & Library

Saya rekomendasikan pakai **Lucia** atau implementasi minimal sendiri dengan **argon2id** untuk password hashing. Pilihan paling ringan: `@node-rs/argon2` di backend, **jose** untuk JWT.

### 4.2 Endpoint API

Saya rekomendasikan BFF (Backend for Frontend) — API server kecil yang handle auth + business logic, dipanggil dari React app. Stack pilihan:

**Opsi A: Hono (recommended untuk Vercel/Cloudflare Workers)**
- Ringan, edge-compatible
- TypeScript-first
- 1 file untuk semua endpoint

**Opsi B: Express + Node**
- Familiar, banyak middleware
- Perlu deploy ke server (Railway/Fly.io/dst)

**Opsi C: Cloudflare Workers langsung**
- Paling cepat & murah
- Turso sudah di Cloudflare ecosystem
- Setup lebih advanced

### 4.3 Endpoint yang Diperlukan

```
POST   /api/auth/register         - Register user baru (admin only, atau first setup)
POST   /api/auth/login            - Email/password → set cookie session
POST   /api/auth/logout           - Invalidate session
GET    /api/auth/me               - Get current user
POST   /api/auth/refresh          - Refresh session

# CRUD Users (admin)
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

# CRUD Students
GET    /api/students
POST   /api/students
PATCH  /api/students/:id
DELETE /api/students/:id

# CRUD Halaqah
GET    /api/halaqah
POST   /api/halaqah
PATCH  /api/halaqah/:id
DELETE /api/halaqah/:id

# Report Cards
GET    /api/report-cards
GET    /api/report-cards/by-student/:studentId
POST   /api/report-cards
PATCH  /api/report-cards/:id
GET    /api/leger
GET    /api/peringkat

# Tahfidz Progress
GET    /api/tahfidz
POST   /api/tahfidz
PATCH  /api/tahfidz/:id
DELETE /api/tahfidz/:id

# Settings
GET    /api/settings
PATCH  /api/settings

# File Upload
POST   /api/upload               - Multipart upload → return URL
GET    /api/files/:id            - Serve file (with cache headers)
```

### 4.4 Session Strategy

Pakai **httpOnly cookie** dengan **session token** random (bukan JWT):

- Cookie name: `__session`
- Value: random 32 bytes hex (seperti `a3f8b9...`)
- HttpOnly, Secure (prod), SameSite=Lax
- Expires: 30 hari (sliding window — extend on activity)
- Server lookup ke tabel `sessions`

**Kenapa session cookie > JWT untuk kasus ini:**
- Bisa di-revoke (JWT tidak bisa)
- Tidak ada data sensitif di cookie
- Lebih aman untuk first-party apps
- Bypass masalah expiry & refresh token

---

## 5. Custom Storage API Design

### 5.1 Pilihan Hosting

| Opsi | Pro | Kontra |
|------|-----|--------|
| **Local FS + nginx (self-hosted)** | Gratis, full control | Harus manage server |
| **Cloudflare R2** | Murah ($0.015/GB/bulan), S3-compatible | Setup awal |
| **Bunny Storage** | Murah, edge CDN | Vendor lock-in |
| **Turso Embedded Replicas + blob** | Tidak perlu service lain | Butuh replicate |
| **Backblaze B2** | Sangat murah | Setup perlu S3-compatible client |

**Rekomendasi:** Cloudflare R2 — karena:
- S3-compatible (library banyak)
- Murah
- Edge-cache built-in
- Bisa dipakai dari Cloudflare Workers (kalau Opsi C di auth)

### 5.2 Flow Upload

```
[React] → POST /api/upload (multipart, dengan session cookie)
  → API verify session
  → API validate (size, mime type)
  → API upload ke R2 (atau storage pilihan)
  → API insert ke uploaded_files
  → Return: { url: 'https://files.example.com/...' }
[React] simpan URL ini ke field signature_url/logo_url
```

### 5.3 Setup R2 (kalau pilih opsi ini)

```bash
# Setup sekali
wrangler r2 bucket create raport-assets
wrangler r2 bucket cors put raport-assets --rules '[{"allowed":{"origins":["https://yourapp.com"],"methods":["GET","PUT"]}}]'
```

Generate R2 access key di dashboard Cloudflare, simpan di env vars API server.

---

## 6. Refactor Plan — File yang Berubah

**Total:** 17 file yang import `supabase`. Plus 1 file `src/lib/supabase.ts` dan beberapa halaman auth/utility.

### 6.1 File Baru (buat)

| File | Tujuan |
|------|--------|
| `api/` (folder) | Backend BFF — Hono server dengan semua endpoint |
| `api/src/index.ts` | Entry point Hono |
| `api/src/db.ts` | Turso client setup |
| `api/src/auth.ts` | Session middleware, login/logout logic |
| `api/src/routes/*.ts` | Per-resource routes (students, halaqah, dll) |
| `api/src/lib/crypto.ts` | argon2id wrapper, session token generator |
| `api/src/middleware/auth.ts` | `requireAuth`, `requireRole('admin')` |
| `api/Dockerfile` | Kalau deploy ke Fly/Railway |
| `api/wrangler.toml` | Kalau deploy ke Cloudflare Workers |
| `turso_migrations/001_init.sql` | Schema SQLite |
| `turso_migrations/002_seed.sql` | Data awal (settings default, dll) |
| `scripts/migrate-from-supabase.ts` | Script export data lama dari Supabase → import ke Turso |
| `src/lib/api-client.ts` | Replacement untuk `src/lib/supabase.ts` — typed fetch wrapper |
| `src/hooks/useSession.ts` | Replacement untuk `useAuth` |

### 6.2 File yang Diubah (17 file utama)

Setiap file yang punya `import { supabase } from '../../lib/supabase'` perlu di-refactor dari:

```ts
// SEBELUM
const { data } = await supabase.from('students').select('*');
await supabase.storage.from('raport-assets').upload(path, file);
await supabase.auth.signInWithPassword({ email, password });
```

Menjadi:

```ts
// SESUDAH
import { api } from '../../lib/api-client';
const students = await api.get('/api/students');
const upload = await api.upload('/api/upload', file);
await api.post('/api/auth/login', { email, password });
```

**Daftar file yang perlu diubah:**

1. `src/lib/supabase.ts` → dihapus/diganti
2. `src/components/raport/PrintSettings.tsx` — upload signature/logo
3. `src/pages/auth/Login.tsx` — sign in flow
4. `src/pages/dashboard/Dashboard.tsx`
5. `src/pages/master/Academic.tsx`
6. `src/pages/master/HalaqahManagement.tsx`
7. `src/pages/master/Students.tsx`
8. `src/pages/master/StudentSurahManagement.tsx`
9. `src/pages/master/SurahManagement.tsx`
10. `src/pages/master/TeacherManagement.tsx`
11. `src/pages/raport/GuruInput.tsx`
12. `src/pages/raport/LegerNilai.tsx`
13. `src/pages/raport/RaportInput.tsx`
14. `src/pages/raport/RaportPrint.tsx`
15. `src/pages/raport/RaportPrintBlank.tsx`
16. `src/pages/settings/Settings.tsx`
17. `src/pages/users/UserManagement.tsx`
18. `src/hooks/useAuth.ts` — pakai session cookie

### 6.3 File yang Dihapus

- `src/lib/supabase.ts` (atau rename jadi `src/lib/api-client.ts`)
- `src/pages/raport/RaportInput.tsx.backup`
- `supabase_schema/*.sql` (pindah ke `turso_migrations/`)

---

## 7. Strategi Migrasi Data

### 7.1 Pendekatan

**Sprint khusus migrasi data** — selesai backend & frontend baru, baru migrate data produksi.

### 7.2 Script Export dari Supabase

```ts
// scripts/migrate-from-supabase.ts
import { createClient } from '@supabase/supabase-js';
import { createClient as createTurso } from '@libsql/client';
import fs from 'fs';

const OLD_SUPABASE = createClient(OLD_URL, OLD_SERVICE_KEY); // service_role key!
const TURSO = createTurso({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function migrate() {
  // 1. Export users
  const { data: users } = await OLD_SUPABASE.from('users').select('*');
  for (const u of users) {
    await TURSO.execute({
      sql: `INSERT INTO users (id, email, role, full_name, signature_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [u.id, u.email, u.role, u.full_name, u.signature_url, u.created_at]
    });
  }

  // 2. Export settings, students, halaqah, dst...
  // 3. Convert jsonb fields → JSON.stringify di SQLite
  // 4. Skip auth.users — recreate dengan password baru atau seed admin
}

migrate();
```

### 7.3 Urutan Migrasi

1. **users** (dari public.users — `auth.users` di-skip, akan di-recreate)
2. **settings_lembaga**
3. **academic_years**
4. **semesters**
5. **halaqah**
6. **students**
7. **teacher_assignments**
8. **tahsin_master**
9. **surah_master**
10. **student_surah_assignment**
11. **tahfidz_progress**
12. **report_cards** (akhlak/kedisiplinan/kognitif di-JSON.stringify)

### 7.4 Risiko Migrasi

| Risiko | Mitigasi |
|--------|----------|
| Password hash tidak bisa di-migrate (Supabase pakai algoritma proprietary) | Kirim email reset ke semua user, atau seed 1 admin & minta user register ulang |
| jsonb field ada data corrupt | Validasi JSON.stringify di script, log & skip yang gagal |
| UUID format beda | Validasi format UUID di script, fallback ke UUID baru kalau invalid |
| Data integrity (FK) | Disable FK saat migrate, enable setelah selesai |
| Downtime | Migrate di off-peak; pertahankan Supabase read-only sebagai fallback 1-2 minggu |

---

## 8. Environment & Config Baru

### 8.1 Env Vars (Frontend)

```bash
# .env (frontend)
VITE_API_BASE_URL=https://api.yourapp.com    # Ganti VITE_SUPABASE_URL
# Hapus VITE_SUPABASE_ANON_KEY
```

### 8.2 Env Vars (API Backend)

```bash
# .env (api)
TURSO_DATABASE_URL=libsql://raportnew-mardian88.aws-ap-south-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...
SESSION_SECRET=<32-byte random hex>          # Untuk session token signing
COOKIE_DOMAIN=.yourapp.com
COOKIE_SECURE=true                           # Production
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=raport-assets
R2_PUBLIC_URL=https://files.yourapp.com     # Custom domain R2
ALLOWED_ORIGINS=https://app.yourapp.com
```

---

## 9. Roadmap Implementasi

| Sprint | Durasi | Fokus | Deliverable |
|--------|--------|-------|-----------|
| 0 | 1 hari | Setup Turso, R2 | Turso DB connected, R2 bucket ready |
| 1 | 2-3 hari | Schema SQLite + migrations | `turso_migrations/001_init.sql` berjalan |
| 2 | 3-4 hari | API Backend | Auth (login/logout/me) + CRUD 1 endpoint pertama |
| 3 | 4-5 hari | API semua endpoint | 17 endpoint siap dengan auth + authorization |
| 4 | 2-3 hari | Frontend api-client | `src/lib/api-client.ts` + typed wrapper |
| 5 | 5-7 hari | Refactor frontend | Semua 17 file di-refactor ke API baru |
| 6 | 2-3 hari | Testing end-to-end | Test semua flow utama: login, input, cetak, leger |
| 7 | 1-2 hari | Migration data | Script export → import, verify counts |
| 8 | 1-2 hari | Deploy & cutover | Backend deploy, DNS switch, monitoring |

**Total estimasi:** 3-4 minggu (1 developer full-time)

---

## 10. Risiko & Mitigasi

| Risiko | Severity | Mitigasi |
|--------|----------|----------|
| Turso downtime/limit | Medium | SQLite file lokal sebagai cache + auto-retry |
| Custom auth bug (session hijack, dll) | High | Pakai library成熟 (Lucia), security review, pakai httpOnly+Secure cookie |
| R2 biaya membengkak | Low | Set lifecycle policy, max file size 2MB di upload |
| Migration data gagal | High | Dry-run dulu di staging, backup Supabase DB sebelum cutover |
| Performance Turso vs Postgres | Medium | Index yang tepat, FTS5 untuk search, batch insert untuk bulk |
| Bug authorization (RLS hilang) | Critical | Comprehensive integration tests untuk role-based access |
| Session token bocor | Medium | Rotate session on privilege change, expire on inactivity |

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Crypto helpers (password hash, session token)
- Validators (Zod schemas)

### 11.2 Integration Tests (API)
- Login/logout flow
- CRUD per resource dengan berbagai role
- Authorization matrix (admin vs guru vs viewer vs pembimbing)
- File upload + retrieve

### 11.3 E2E Tests (Playwright)
- Login sebagai admin → input raport → cetak PDF
- Login sebagai guru → input nilai halaqah sendiri
- Login sebagai viewer → hanya bisa lihat leger
- Login sebagai pembimbing → hanya input akhlak/kedisiplinan

### 11.4 Data Migration Tests
- Verify row counts match sebelum & sesudah
- Spot-check 10 random records per tabel
- Test jsonb → TEXT conversion (verify structure)

---

## 12. Rollback Plan

Jika ada masalah besar setelah cutover:

1. **Keep Supabase read-only** selama 2 minggu setelah cutover
2. **DNS rollback** dalam 5 menit (kalau pakai DNS failover)
3. **Data sync mundur**: Turso → Supabase via reverse migration script
4. **Communication**: Notifikasi ke admin/guru 24 jam sebelum cutover

---

## 13. Keputusan Arsitektur yang Belum Diambil

Saya butuh keputusan Anda untuk lanjut:

- [ ] **API Stack**: Hono / Express / Cloudflare Workers langsung?
- [ ] **Storage Hosting**: Cloudflare R2 / Bunny / Local FS?
- [ ] **Deployment Target**: Vercel / Railway / Fly.io / Cloudflare?
- [ ] **Password Migration**: Kirim reset email / Seed admin + user register ulang?
- [ ] **Domain Strategy**: Pakai subdomain baru (`api.yourapp.com`) atau path (`yourapp.com/api`)?
- [ ] **Cutover Timing**: Weekend / Mid-semester break / Libur tertentu?

---

## 14. File Output

Setelah deal arsitektur, output yang akan saya hasilkan:

1. `turso_migrations/001_init.sql` — schema SQLite lengkap
2. `turso_migrations/002_seed.sql` — data awal (admin default, settings, surah master default)
4. `api/src/index.ts` + sub-files — Hono server lengkap
5. `src/lib/api-client.ts` — typed fetch wrapper untuk frontend
6. `src/hooks/useSession.ts` — replacement untuk useAuth
7. Refactor 17 file frontend ke API baru
8. `scripts/migrate-from-supabase.ts` — migration script
9. `vercel.json` atau `wrangler.toml` (tergantung deployment)
10. README baru dengan instruksi setup Turso

---

*Plan ini akan jadi living document — di-update seiring keputusan arsitektur diambil dan implementation jalan.*