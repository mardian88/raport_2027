# Sistem Informasi Raport RQM

Sistem manajemen raport digital untuk **Rumah Qur'an Muharrik**. Dibangun dengan React + TypeScript + Vite, backend Hono + Turso (SQLite), dengan mode fallback ke localStorage untuk development.

## ✨ Fitur

- **Manajemen Santri & Halaqah** — CRUD lengkap dengan filter dan pencarian
- **Input Nilai** — Akhlak, Kedisiplinan, Kognitif, Tahfidz, Tahsin, UAS
- **Cetak Raport** — Multi-tema (Hitam, Biru, Hijau, Merah), ukuran A4/F4
- **Leger Nilai** — Tabel agregat dengan weighted formula (bobot dari settings)
- **Peringkat** — Top performers per semester
- **Manajemen User Multi-role** — admin, guru, pembimbing, viewer
- **Pengaturan Lembaga** — Kop, logo, TTD, bobot penilaian, footer
- **Auth Custom** — Session cookie + Argon2id password hashing

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────┐
│  Frontend (Vite + React 19 + TypeScript)    │
│  src/                                        │
│  ├─ pages/raport/     ← Halaman raport      │
│  ├─ components/raport/ ← Komponen reusable  │
│  ├─ hooks/            ← Custom hooks        │
│  ├─ lib/supabase.ts   ← Smart client        │
│  └─ lib/api-client.ts ← Hono API client     │
└──────────────────┬──────────────────────────┘
                   │ HTTP (cookie session)
                   ▼
┌─────────────────────────────────────────────┐
│  API Backend (Hono + Node)                  │
│  api/src/                                    │
│  ├─ index.ts          ← Entry point          │
│  ├─ auth.ts           ← Session + JWT       │
│  ├─ db.ts             ← Turso connection    │
│  ├─ routes/           ← Endpoints           │
│  └─ middleware.ts     ← Auth + error        │
└──────────────────┬──────────────────────────┘
                   │ libSQL
                   ▼
┌─────────────────────────────────────────────┐
│  Database (Turso — SQLite Cloud)            │
│  turso_migrations/                          │
│  ├─ 001_init.sql                           │
│  └─ 002_seed.sql                           │
└─────────────────────────────────────────────┘
```

### Mode Aplikasi

Frontend bisa berjalan dalam 3 mode:

| Mode | Backend | Use case |
|------|---------|----------|
| `local` (default) | localStorage | Development, demo, single-user |
| `api` | Hono + Turso | Production, multi-user |
| `supabase` (legacy) | Supabase | Migrasi bertahap |

## 🚀 Quick Start

### Prasyarat

- Node.js 20+
- Akun [Turso](https://turso.tech) (gratis)
- npm atau pnpm

### 1. Clone & Install

```bash
git clone https://github.com/rqm-online/raportrqmupdate.git
cd raportrqmupdate
npm install
```

### 2. Setup Database Turso

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Buat database (atau pakai yang sudah ada)
turso db create raport-rqm

# Dapatkan URL dan token
turso db show raport-rqm --url
turso db tokens create raport-rqm
```

### 3. Konfigurasi Environment

Buat file `.env` di root:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_AUTH_MODE=api
VITE_TURSO_DATABASE_URL=libsql://your-db.turso.io
VITE_TURSO_AUTH_TOKEN=your-token-here
VITE_API_BASE_URL=http://localhost:8787
```

### 4. Push Schema ke Turso

```bash
npm run db:push
```

Output yang diharapkan:

```
🔌 Connecting to Turso...
📦 Found 2 migration files:
   - 001_init.sql
   - 002_seed.sql

▶ Running 001_init.sql...
   ✓ [1/15] CREATE TABLE...
   ...
✅ All migrations applied!

📋 Tables in database (15):
   users                          1 rows
   settings_lembaga               1 rows
   tahsin_master                  9 rows
   surah_master                   37 rows
   ...
```

Verifikasi:

```bash
npm run db:verify
```

### 5. Jalankan Backend API

Terminal 1:

```bash
cd api
npm install
cp .env.example .env
# Edit api/.env — pastikan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN sama
npm run dev
```

Output:

```
🚀 raportrqm-api running on http://localhost:8787
   Database: libsql://your-db.turso.io...
   CORS:     http://localhost:5173
   Mode:     development
```

Test koneksi:

```bash
curl http://localhost:8787/
# {"service":"raportrqm-api","status":"ok","database":"connected",...}
```

### 6. Jalankan Frontend

Terminal 2:

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173).

Login pertama kali:

1. Buka [http://localhost:5173/login](http://localhost:5173/login)
2. Email: `admin@rqm.com`
3. Password: (kosongkan — bypass untuk setup awal)
4. Setelah masuk, langsung **atur password baru** di halaman User Management

## 📁 Struktur Folder

```
raportrqmupdate/
├── api/                          ← Backend Hono
│   ├── src/
│   │   ├── index.ts              ← Entry point
│   │   ├── auth.ts               ← JWT/session
│   │   ├── db.ts                 ← Turso client
│   │   ├── middleware.ts         ← Auth/CORS/error
│   │   └── routes/               ← Endpoint
│   │       ├── auth.ts           ← /auth/*
│   │       ├── students.ts       ← /students/*
│   │       ├── report_cards.ts   ← /report-cards/*
│   │       └── index.ts          ← halaqah/semesters/settings/users
│   ├── scripts/                  ← db-push, db-verify, db-reset
│   ├── package.json
│   └── .env.example
│
├── turso_migrations/             ← SQL schema
│   ├── 001_init.sql              ← Tabel + index
│   └── 002_seed.sql              ← Data awal
│
├── src/                          ← Frontend React
│   ├── components/
│   │   ├── ui/                   ← shadcn primitives
│   │   └── raport/               ← Komponen domain
│   │       ├── PageHeader.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Skeleton.tsx
│   │       ├── ScoreCell.tsx
│   │       ├── SectionStepper.tsx
│   │       ├── ScoreInput.tsx
│   │       ├── TahfidzInput.tsx
│   │       ├── RaportTemplate.tsx
│   │       └── PrintSettings.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   └── useUnsavedChangesWarning.ts
│   ├── lib/
│   │   ├── supabase.ts           ← Smart client (priority: api > local-db)
│   │   ├── api-client.ts         ← Hono API client
│   │   ├── local-db.ts           ← localStorage fallback
│   │   └── utils/
│   ├── pages/
│   │   └── raport/
│   │       ├── RaportInput.tsx
│   │       ├── GuruInput.tsx
│   │       ├── LegerNilai.tsx
│   │       ├── Peringkat.tsx
│   │       └── RaportPrint.tsx
│   ├── types/
│   ├── utils/
│   │   └── grading.ts            ← calculateFinalScore (weighted)
│   ├── App.tsx
│   └── main.tsx
│
├── supabase_schema/              ← Migrasi Supabase (legacy, untuk DB lama)
│   ├── 001_create_tables.sql
│   ├── 002_policies.sql
│   ├── 030_update_leger_view_formula.sql
│   ├── 031_add_pembimbing_role.sql
│   ├── 032_weighted_leger_view.sql
│   └── 033_legacy_data_migration.sql
│
├── scripts/
│   ├── turso-setup.mjs           ← Push schema ke Turso
│   └── turso-verify.mjs          ← Verifikasi DB
│
├── .env.example
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── README.md
```

## 🔐 Auth & Roles

Sistem punya 4 role:

| Role | Akses |
|------|-------|
| `admin` | Full access — semua halaqah, semua semester, semua user |
| `guru` | Halaqah yang di-assign via `teacher_assignments` |
| `pembimbing` | Input akhlak/kedisiplinan untuk halaqah yang di-assign |
| `viewer` | Baca data agregat (leger), tidak boleh raw scores |

Setup user baru:

```bash
# Via API (setelah login admin)
curl -X POST http://localhost:8787/users \
  -H "Content-Type: application/json" \
  -b "rqm_session=your-session-cookie" \
  -d '{
    "email": "guru1@rqm.com",
    "password": "password123",
    "role": "guru",
    "full_name": "Ustadz Ahmad"
  }'
```

## 🧮 Rumus Nilai

Nilai akhir dihitung dengan **weighted formula** dari `settings_lembaga`:

```
nilai_akhir_total = (
  nilai_akhir_akhlak * bobot_akhlak +
  nilai_akhir_kedisiplinan * bobot_kedisiplinan +
  nilai_akhir_kognitif * bobot_kognitif
) / 100
```

Default bobot: **30/30/40**. Bisa diubah di halaman Pengaturan Lembaga.

Predikat ditentukan oleh `skala_penilaian` (default: A=85, B=70, C=60, D=0).

## 🚢 Deployment

### Backend (Hono) di Railway/Fly.io/Render

```bash
cd api
# Railway
railway up

# Fly.io
fly launch
fly deploy
```

Set environment variables di platform:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET` (generate dengan `openssl rand -base64 32`)
- `SESSION_SECRET`
- `ALLOWED_ORIGINS=https://your-frontend.com`
- `COOKIE_SECURE=true`
- `NODE_ENV=production`

### Frontend di Vercel/Netlify/Cloudflare Pages

```bash
npm run build
# Upload folder dist/ ke platform pilihan
```

Set environment variables:
- `VITE_AUTH_MODE=api`
- `VITE_API_BASE_URL=https://your-api.com`

## 🔧 Troubleshooting

### "TURSO_DATABASE_URL harus diisi di .env"

Buat file `.env` di root project dan isi:

```env
VITE_TURSO_DATABASE_URL=...
VITE_TURSO_AUTH_TOKEN=...
```

### "Failed to connect to Turso"

Cek:
1. URL benar (`libsql://...`)
2. Token masih valid (cek Turso dashboard)
3. Database masih aktif

### "CORS error" saat frontend call API

Pastikan di `api/.env`:

```env
ALLOWED_ORIGINS=http://localhost:5173
```

Untuk production, tambahkan origin frontend:

```env
ALLOWED_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
```

### "Cannot find module @libsql/client"

Install dependencies di folder `api/`:

```bash
cd api && npm install
```

## 📝 Scripts

### Frontend

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview build
npm run db:push      # Push schema ke Turso
npm run db:verify    # Cek koneksi + tampilkan tabel
```

### Backend

```bash
cd api
npm run dev          # Dev server (hot reload)
npm run build        # Compile TypeScript
npm start            # Production server
npm run db:push      # Push schema
npm run db:seed      # Seed data tambahan
npm run db:verify    # Verifikasi DB
npm run db:reset     # ⚠️ Hapus semua data + push ulang
```

## 📚 Dokumentasi Tambahan

- [LAPORAN-ANALISIS-RAPORT.md](LAPORAN-ANALISIS-RAPORT.md) — Hasil analisis awal sistem
- [CHANGELOG-FIX-UI.md](CHANGELOG-FIX-UI.md) — Log bug fix & UI upgrade
- [MIGRATION-PLAN-SUPABASE-TO-TURSO.md](MIGRATION-PLAN-SUPABASE-TO-TURSO.md) — Plan migrasi lengkap
- [api/README.md](api/README.md) — Detail API backend
- [supabase_schema/](supabase_schema/) — Migration Supabase legacy

## 📄 License

Proprietary — internal use only by Rumah Qur'an Muharrik.

---

*Dibuat dengan ❤️ untuk pendidikan Al-Qur'an yang lebih baik.*
