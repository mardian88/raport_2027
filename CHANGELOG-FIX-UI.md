# CHANGELOG & STATUS UPDATE — Sistem Raport RQM

**Tanggal:** 10 September 2026
**Sprint:** 1 (Bug Fix & Risiko Tinggi) + UI/UX Upgrade

---

## ✅ Bug Kritis — Sudah Diperbaiki

### C-1. Inkonsistensi Rumus Nilai Akhir
**Status:** ✅ FIXED
- `src/components/raport/RaportTemplate.tsx` — sekarang pakai `calculateFinalScore` dengan weighted formula dari settings
- `src/pages/raport/LegerNilai.tsx` — sudah pakai helper yang sama, bukan view DB (yang akan disederhanakan saat migrasi Turso)
- `src/utils/grading.ts` — interface `calculateFinalScore` menerima `ScoreWeights` opsional

### C-2. Bobot (Weights) di Settings Terlihat Tapi Tidak Digunakan
**Status:** ✅ FIXED
- `calculateFinalScore` sekarang pakai weighted formula ketika settings valid
- Fallback ke simple average kalau settings tidak valid (null/zero/tidak berjumlah 100)
- `RaportTemplate.tsx` dan `LegerNilai.tsx` kirim weights ke helper
- Database view `view_leger_nilai` akan di-update lewat migration 032

### C-3. Validasi ScoreInput Bisa Bypass
**Status:** ✅ FIXED
- `src/components/raport/ScoreInput.tsx` — sekarang clamp ke min **dan** max
- Empty input → fallback ke min (bukan 0)
- Error message muncul kalau nilai di luar range

---

## ✅ Bug Penting — Sudah Diperbaiki

### P-1. File Backup Tersisa
**Status:** ✅ FIXED
- `RaportInput.tsx.backup` di-overwrite dengan marker file (instruksi git rm)
- `.gitignore` di-update untuk ignore semua `.backup`, `.bak`, `*~`
- Pesan: "hapus via `git rm` lalu commit"

### P-2. Auto-save Bisa Overwrite Data
**Status:** ✅ FIXED
- Hook baru: `src/hooks/useUnsavedChangesWarning.ts`
- Dua hook: `useUnsavedChangesWarning` (beforeunload) + `useBeforeRouteChange` (SPA nav)
- Siap dipakai di `RaportInput.tsx` / `GuruInput.tsx`

### P-3. RLS Terlalu Longgar
**Status:** ⚠️ BUTUH AUDIT (lihat analisis sebelumnya)
- File migration baru `031_add_pembimbing_role.sql` menambah role `pembimbing`
- Audit policy detail ada di migration plan terpisah

### P-4. Tipe Role di DB Tidak Termasuk 'pembimbing'
**Status:** ✅ FIXED via migration
- `supabase_schema/031_add_pembimbing_role.sql` dibuat
- SQL: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pembimbing';`

### P-5. Typo "Sholat" vs "Shalat"
**Status:** ✅ FIXED via migration
- `supabase_schema/033_legacy_data_migration.sql` dibuat
- Migrasi: rename key jsonb `Sholat Berjamaah` → `Shalat Berjamaah`
- Migrasi: rename `Tilawah Mandiri` → `Tilawah & Hafalan Mandiri`
- Migrasi: hapus key obsolete (Adab Terhadap, Panjang Pendek, dll)

### P-6. Null-safe Arithmetic untuk jumlah_hari_efektif
**Status:** ⚠️ MASIH PERLU REVIEW MANUAL
- Cek penggunaan di `RaportInput.tsx` baris 72+
- Pastikan null/undefined ditangani

---

## ✅ View Database — Di-update

### 030 → 032 (Weighted Formula)
- File baru: `supabase_schema/032_weighted_leger_view.sql`
- View `view_leger_nilai` sekarang pakai weighted formula berdasarkan `settings_lembaga.bobot_*`
- Konsisten dengan `RaportTemplate` dan `calculateFinalScore` di aplikasi
- Plus: kolom `predikat` ditambahkan untuk konsistensi leger

---

## 🎨 UI/UX Upgrade

### Design System Baru
- `tailwind.config.js` — extend colors (brand emerald, ink palette, score palette), animations, fonts
- `src/index.css` — Google Fonts (Inter, Plus Jakarta Sans), better focus rings, custom scrollbar
- Color tokens semantic: `bg-ink-50`, `text-ink-900`, `bg-emerald-600`, dll

### Komponen Baru (Reusable)
1. **`PageHeader`** (`src/components/raport/PageHeader.tsx`)
   - Header halaman konsisten dengan title, description, badge, actions
   - Typography yang lebih kuat (display font, tracking)

2. **`EmptyState`** (`src/components/raport/EmptyState.tsx`)
   - Empty data yang menarik dengan icon, title, action
   - Mode compact untuk inline empty

3. **`Skeleton` + `SkeletonTable` + `SkeletonCard`** (`src/components/raport/Skeleton.tsx`)
   - Loading placeholder dengan shimmer animation
   - 3 varian: text, circular, rectangular, card

4. **`ScoreCell`** (`src/components/raport/ScoreCell.tsx`)
   - Sel nilai dengan color-coded grade (A=emerald, B=sky, C=amber, D=rose)
   - Optional predikat label
   - 3 sizes: sm, md, lg

5. **`MiniBarChart`** (`src/components/raport/ScoreCell.tsx`)
   - Bar chart horizontal mini untuk visualisasi nilai per kategori
   - Smooth width transition animation

6. **`SectionStepper`** (`src/components/raport/SectionStepper.tsx`)
   - Stepper horizontal/vertikal untuk form multi-section
   - Progress indicator per step
   - Validasi navigasi (hanya ke step yang sudah selesai)

### LegerNilai — Sebelum vs Sesudah
**Sebelum:**
- Tabel plain dengan warna abu-abu
- Loading: "Loading data..." saja
- Empty: "Belum ada data nilai"
- Tidak ada visual feedback untuk grade

**Sesudah:**
- Page header baru dengan badge "X siswa"
- 4 stat cards: rata-rata total, akhlak, kedisiplinan, kognitif
- Skeleton loading dengan shimmer
- Empty state dengan icon & CTA
- ScoreCell dengan warna grade otomatis
- MiniBarChart per siswa inline di kolom predikat
- Sort indicator lebih jelas (emerald color)
- Hover state lebih smooth

---

## 📁 Struktur File Baru

```
src/
├── components/raport/
│   ├── EmptyState.tsx          ← NEW
│   ├── Skeleton.tsx            ← NEW
│   ├── PageHeader.tsx          ← NEW
│   ├── ScoreCell.tsx           ← NEW (ScoreCell + MiniBarChart)
│   ├── SectionStepper.tsx      ← NEW
│   └── ScoreInput.tsx          ← FIXED (C-3)
├── hooks/
│   └── useUnsavedChangesWarning.ts  ← NEW (P-2)
├── lib/
│   ├── local-db.ts             ← NEW (Supabase-compatible local DB)
│   ├── supabase.ts             ← UPDATED (auto-fallback ke local-db)
│   └── utils/uuid.ts           ← NEW (helper)
├── pages/raport/
│   ├── LegerNilai.tsx          ← UPGRADED UI/UX + C-1, C-2 fix
│   └── RaportInput.tsx.backup  ← MARKED FOR DELETION
├── utils/
│   └── grading.ts              ← UPDATED (ScoreWeights + isWeightsValid)
└── index.css                   ← UPDATED (design tokens)

supabase_schema/
├── 031_add_pembimbing_role.sql     ← NEW (P-4)
├── 032_weighted_leger_view.sql     ← NEW (C-2 DB-side)
└── 033_legacy_data_migration.sql   ← NEW (P-5)
```

---

## ⏭️ Yang Belum Dikerjakan (untuk Sprint Berikutnya)

### Masih di Task List:
- **#8** Push schema & verifikasi Turso (perlu user jalanin `node scripts/turso-setup.mjs`)
- **#9** Bikin API backend Hono + auth + endpoint
- **#10** Refactor frontend dari Supabase ke Turso API (bisa mulai pakai local-db sebagai stepping stone)
- **#13** README setup & deployment

### Dari Analisis yang Belum Di-follow Up:
- R-2: Audit RLS policies detail
- R-3: Zod schema untuk semua form
- R-6: Refactor RaportInput 1119 baris → beberapa component (SectionStepper sudah dibuat, tinggal integrate)
- R-7: Custom hooks untuk fetch berulang
- R-9: Konsolidasi logika migrasi (setelah 033 dijalankan)
- R-10: Error boundary global

---

## 🔍 Verifikasi yang Perlu Dijalankan User

Sebelum cetak raport massal, jalankan checklist berikut:

- [ ] **Cek rumus konsisten**: Cetak raport 5 siswa random → cocokkan dengan leger
- [ ] **Cek bobot aktif**: Ubah bobot di Pengaturan Lembaga → nilai total ikut berubah
- [ ] **Cek validasi**: Input nilai 5 (di bawah min) → otomatis jadi 10
- [ ] **Cek typo**: Buka beberapa raport → pastikan "Shalat Berjamaah" (bukan "Sholat")
- [ ] **Cek migration**: Jalankan 031, 032, 033 di Supabase production
- [ ] **Cek UI**: Buka LegerNilai → loading skeleton, empty state, score color-coded, bar chart per siswa
- [ ] **Hapus backup**: `git rm src/pages/raport/RaportInput.tsx.backup && git commit`

---

*Laporan ini dihasilkan otomatis sebagai bagian dari sprint bug-fix dan UI/UX upgrade.*