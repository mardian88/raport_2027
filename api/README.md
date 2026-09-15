# Backend API — Sistem Raport RQM

Backend API berbasis **Hono** untuk Sistem Informasi Raport RQM. Menyediakan REST API di atas database **Turso** (SQLite cloud) dengan custom auth (session cookie + Argon2id).

## 🚀 Quick Start

```bash
# Install deps
npm install

# Copy env
cp .env.example .env
# Edit .env — isi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN

# Push schema ke Turso
npm run db:push

# Jalankan dev server
npm run dev
```

API akan jalan di `http://localhost:8787`.

## 📡 Endpoints

### Auth

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/auth/login` | - | Login (email + password) |
| POST | `/auth/logout` | session | Logout |
| GET | `/auth/me` | session | Cek session aktif |
| POST | `/auth/setup-password` | setup token | Set password pertama untuk admin bypass |

### Students

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/students` | session | List (filter: `halaqah_id`, `is_active`, `q`) |
| GET | `/students/:id` | session | Detail |
| POST | `/students` | admin | Tambah |
| PATCH | `/students/:id` | admin/guru | Update |
| DELETE | `/students/:id` | admin | Soft delete |

### Report Cards (Raport)

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/report-cards` | session | List (filter: `student_id`, `semester_id`) |
| GET | `/report-cards/leger` | session | Leger nilai + predikat (weighted) |
| GET | `/report-cards/peringkat` | session | Top N siswa (default 10) |
| POST | `/report-cards` | admin/guru/pembimbing | Upsert raport |

### Halaqah, Semesters, Settings, Users, Assignments

Lihat `src/routes/index.ts` untuk detail.

## 🔐 Auth

Session disimpan di **httpOnly cookie** (`rqm_session`). Cookie ditandatangani dengan HMAC SHA-256 (jose library).

Setiap request otomatis menyertakan cookie (pastikan frontend pakai `credentials: 'include'`).

Default duration: **24 jam** (override via `SESSION_DURATION_HOURS`).

### Password Hashing

Gunakan **Argon2id** dengan parameter:

```ts
argon2.hash(password, { type: argon2.argon2id })
```

## 🗄️ Database

Turso (libSQL) — SQLite cloud. Schema di folder `../turso_migrations/`.

### Scripts

```bash
npm run db:push       # Push schema ke Turso
npm run db:seed       # Seed data (master tahsin, surah)
npm run db:verify     # Cek koneksi + tampilkan isi tabel
npm run db:reset      # ⚠️ Drop semua tabel + push ulang
```

### Env

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJhbGc...
JWT_SECRET=<openssl rand -base64 32>
SESSION_SECRET=<openssl rand -base64 32>
ALLOWED_ORIGINS=http://localhost:5173
PORT=8787
NODE_ENV=development
COOKIE_SECURE=false
```

## 🛠️ Development

```bash
npm run dev       # tsx watch — hot reload
```

TypeScript strict mode. Linting mengikuti config root project.

## 🚢 Production Build

```bash
npm run build     # Compile ke dist/
npm start         # Jalankan dist/index.js
```

### Deploy ke Railway/Fly.io/Render

```bash
# Railway
railway up

# Fly.io
fly launch
fly deploy
```

Set environment variables di platform.

## 📁 Struktur

```
api/
├── src/
│   ├── index.ts              ← Hono app
│   ├── auth.ts               ← JWT/session
│   ├── db.ts                 ← Turso client + helpers
│   ├── middleware.ts         ← requireAuth, requireRole, error
│   └── routes/
│       ├── auth.ts
│       ├── students.ts
│       ├── report_cards.ts
│       └── index.ts          ← halaqah/semesters/settings/users/assignments
├── scripts/
│   ├── db-push.ts
│   ├── db-seed.ts
│   ├── db-verify.ts
│   └── db-reset.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## 🧪 Testing

```bash
# Manual
curl http://localhost:8787/health

# Login
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@rqm.com","password":"your-password"}'

# Pakai session
curl http://localhost:8787/auth/me -b cookies.txt
```

## 🔧 Troubleshooting

### "TURSO_DATABASE_URL harus diisi"

Pastikan file `.env` ada di folder `api/` (bukan di root project).

### "401 Unauthorized"

- Cek cookie `rqm_session` ada
- Pastikan JWT_SECRET sama antara server yang sign dan verify

### "CORS error"

Tambahkan origin frontend ke `ALLOWED_ORIGINS` di `.env`.

---

*Lihat [../README.md](../README.md) untuk dokumentasi lengkap sistem.*
