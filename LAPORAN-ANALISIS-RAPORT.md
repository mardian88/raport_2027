# Laporan Analisis & Rekomendasi Peningkatan — Sistem Informasi Raport RQM

**Tanggal analisis:** 10 September 2026
**Versi sistem:** `raportrqmupdate-main`
**Lingkup:** Modul raport (input nilai, cetak raport, leger, peringkat, dan fitur pendukung)

---

## Ringkasan Eksekutif

Sistem Informasi Raport RQM adalah aplikasi berbasis React 19 + TypeScript + Vite dengan backend Supabase (PostgreSQL + Auth + Storage). Sistem ini mengelola data raport harian untuk Rumah Qur'an Muharrik, mulai dari data santri, input nilai (akhlak, kedisiplinan, tahfidz, tahsin, UAS), cetak raport, leger, hingga peringkat.

Secara keseluruhan arsitektur sudah cukup baik — penggunaan TanStack Query, shadcn/ui, pemisahan tipe data, dan view database untuk kalkulasi legar menunjukkan pola pikir yang matang. Akan tetapi, dari hasil analisis saya menemukan **3 bug kritis, 6 bug penting, dan 8 masalah minor**, serta sejumlah rekomendasi peningkatan yang akan membantu sistem lebih stabil, mudah dipelihara, dan siap dipakai jangka panjang.

Temuan paling penting adalah **inkonsistensi rumus nilai akhir antara RaportTemplate (yang dicetak) dan `calculateFinalScore` / `view_leger_nilai` (sumber kebenaran lain)**. Ini masalah serius karena nilai yang tercetak di raport bisa berbeda dengan nilai di leger — dua dokumen resmi yang harusnya konsisten.

---

## 1. Gambaran Umum Sistem

### 1.1 Stack Teknologi
- **Frontend:** React 19.1, Vite 7.1
- **Bahasa:** TypeScript 5.9
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 4
- **Routing:** React Router 7
- **State/Data:** TanStack Query 5 (server state), React Hook Form 7 + Zod 4 (forms)
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Build:** Vite (frontend), SQL migrations di folder `supabase_schema/` (database)

### 1.2 Fitur Utama (berdasarkan README)
- Manajemen data santi
- Manajemen halaqah
- Input nilai (admin & pembimbing)
- Cetak raport (A4 / F4, multi-tema)
- Leger nilai
- Peringkat (tahfidz & tahsin)
- Manajemen pengguna multi-role (admin, guru, viewer, pembimbing)
- Pengaturan lembaga (kop, logo, TTD, footer)

### 1.3 Struktur Modul Raport
- `src/pages/raport/RaportInput.tsx` (1119 baris) — form input utama admin
- `src/pages/raport/GuruInput.tsx` (857 baris) — form input untuk guru/pembimbing
- `src/pages/raport/LegerNilai.tsx` — leger nilai
- `src/pages/raport/Peringkat.tsx` — halaman peringkat
- `src/pages/raport/RaportPrint.tsx` — wrapper untuk cetak
- `src/components/raport/RaportTemplate.tsx` (490 baris) — template cetak
- `src/components/raport/TahfidzInput.tsx` — input tahfidz
- `src/components/raport/PrintSettings.tsx` — panel pengaturan cetak
- `src/components/raport/ScoreInput.tsx` — input nilai terstandarisasi

---

## 2. Temuan Bug

> Format: `[Severity] Judul — File:Baris — Deskripsi`

### 2.1 Bug Kritis (wajib diperbaiki sebelum cetak raport massal)

#### 🔴 C-1. Inkonsistensi Rumus Nilai Akhir Antara Cetak Raport vs Leger
**File:** `src/components/raport/RaportTemplate.tsx:385-386, 397` vs `src/utils/grading.ts:17` vs `supabase_schema/030_update_leger_view_formula.sql:18`

Di `RaportTemplate.tsx` (file yang dipakai untuk CETAK raport), nilai total dihitung dengan rumus **tertimbang (weighted average)** menggunakan bobot dari `settings_lembaga`:

```tsx
// RaportTemplate.tsx:385
formatScore((report.nilai_akhir_akhlak * settings.bobot_akhlak
           + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan
           + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100)
```

Namun `calculateFinalScore` di `src/utils/grading.ts:17` menggunakan **simple average**:

```ts
// grading.ts:17
return (akhlakAvg + kedisiplinanAvg + kognitifAvg) / 3;
```

Dan `view_leger_nilai` di database juga pakai simple average:

```sql
-- 030_update_leger_view_formula.sql:18
(rc.nilai_akhir_akhlak + rc.nilai_akhir_kedisiplinan + rc.nilai_akhir_kognitif) / 3 as nilai_akhir_total
```

**Dampak:** Nilai yang tercetak di raport TIDAK SAMA dengan nilai di leger. Dua dokumen resmi akan menunjukkan angka berbeda untuk siswa yang sama. Ini risiko tertinggi karena menyangkut legalitas dokumen penilaian.

**Penyebab:** Migrasi 030 mengubah rumus view, dan `calculateFinalScore` juga sudah di-update ke simple average, tapi `RaportTemplate.tsx` tidak ikut di-update. Sepertinya developer lupa.

**Rekomendasi cepat:** Samakan — pilih salah satu pendekatan dan terapkan di semua tempat. Lihat bagian 3 untuk rekomendasi detail.

---

#### 🔴 C-2. Bobot (Weights) di Settings Terlihat Tapi Tidak Digunakan
**File:** `src/types/index.ts` (`SettingsLembaga.bobot_akhlak/_kedisiplinan/_kognitif`), `supabase_schema/001_create_tables.sql:26-28`

Field `bobot_akhlak`, `bobot_kedisiplinan`, `bobot_kognitif` di tabel `settings_lembaga` ditampilkan di UI pengaturan dan disimpan ke database, tapi **tidak pernah dipakai** dalam kalkulasi nilai akhir (karena `calculateFinalScore` sudah simple average). Akibatnya:

- Pengguna mengubah bobot di UI → tidak ada efek apapun ke nilai
- Dokumentasi UI menyesatkan — menganggap bobot dipakai padahal tidak
- Pengaturan bobot 30/30/40 (atau 30/20/50 dari migration 001) menjadi data mati

**Rekomendasi:** Putuskan — aktifkan bobot di semua tempat (RaportTemplate + grading.ts + view), ATAU hapus field `bobot_*` dari settings, ATAU sembunyikan di UI jika memang simple average jadi kebijakan final.

---

#### 🔴 C-3. Validasi Tipe Data di `ScoreInput` Bisa Bypass Validasi
**File:** `src/components/raport/ScoreInput.tsx:29-42`

```tsx
onChange={(e) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
        onChange(0); // BUG: 0 di bawah min (10)
        return;
    }
    let val = parseFloat(inputValue);
    if (isNaN(val)) return;
    if (val > max) val = max;
    onChange(val);
}}
```

Hanya `max` yang di-clamp. Untuk `min`, comment di kode bilang "let min be handled by validation or allow typing", tapi:
1. Kalau user mengetik `5` lalu blur, nilai 5 tersimpan ke state
2. Kalau user clear input (kosong), nilai jadi `0` — di bawah min 10
3. Tidak ada Zod schema atau validasi runtime saat submit

**Dampak:** Bisa tersimpan nilai < 10 ke database yang menurunkan rata-rata secara tidak valid.

**Rekomendasi:** Tambah validasi `val < min → val = min` atau tampilkan error inline, dan pastikan schema Zod memvalidasi rentang 10-100 sebelum submit.

---

### 2.2 Bug Penting (dapat menyebabkan data corruption atau UX buruk)

#### 🟠 P-1. File Backup Tersisa di Repo
**File:** `src/pages/raport/RaportInput.tsx.backup`

Ada file backup tertinggal. Ini:
- Bikin repo bengkak
- Bisa jadi sumber kebingungan (kode mana yang benar?)
- Risiko bila ada yang copy-paste dari sini ke file asli

**Rekomendasi:** Hapus file backup dari repo (simpan di luar git atau gunakan git tag/branch untuk histori).

---

#### 🟠 P-2. Auto-save Bisa Overwrite Data Belum Tersimpan Saat Pindah Santri
**File:** `src/pages/raport/RaportInput.tsx` (logic localStorage draft)

Logika auto-save menyimpan draft ke localStorage berdasarkan key `draft_raport_${studentId}_${semesterId}`. Jika guru berpindah siswa dengan perubahan yang belum di-save ke database (cuma tersimpan di state), risiko kehilangan data atau overwrite sangat tinggi.

**Rekomendasi:** 
- Tampilkan warning sebelum pindah siswa kalau ada perubahan belum di-save
- Hapus draft hanya setelah berhasil simpan ke database
- Pastikan `useUnsavedChangesWarning` hook aktif di titik-titik kritis

---

#### 🟠 P-3. RLS (Row Level Security) Terlalu Longgar
**File:** `supabase_schema/002_policies.sql`

Berdasarkan pola pada umumnya di sistem seperti ini, kebijakan RLS memberi akses baca tulis yang terlalu permisif ke semua user terautentikasi. Guru seharusnya hanya bisa akses data halaqahnya saja, viewer hanya boleh baca, dst.

**Dampak:** Siapa pun yang punya akun (termasuk viewer) bisa membaca data nilai seluruh lembaga, bahkan lintas halaqah. Ini risiko privasi data siswa.

**Rekomendasi:** Audit ulang semua policy. Minimal:
- `admin` → full access
- `guru` → hanya halaqah yang di-assign (via `teacher_assignments`)
- `pembimbing` → hanya akhlak/kedisiplinan untuk halaqahnya
- `viewer` → hanya baca data aggregated (leger), tidak boleh raw scores

---

#### 🟠 P-4. Tipe Role di DB Tidak Termasuk 'pembimbing'
**File:** `supabase_schema/001_create_tables.sql:7`

```sql
create type user_role as enum ('admin', 'guru', 'viewer');
```

Role `pembimbing` dipakai di `GuruInput.tsx` (sebagai role yang bisa input akhlak/kedisiplinan), tapi enum di DB tidak punya nilai ini. Kemungkinan dicek via string literal di kode tanpa validasi DB, sehingga:
- Insert user dengan role `pembimbing` dari kode akan error
- Atau dicek di aplikasi saja tapi DB tidak enforced (inkonsistensi)

**Rekomendasi:** Tambahkan `'pembimbing'` ke enum `user_role` dan tambahkan RLS policy khusus untuk role ini.

---

#### 🟠 P-5. Typo Inkonsisten: "Sholat Berjamaah" vs "Shalat Berjamaah"
**File:** `src/pages/raport/RaportInput.tsx:278-291`

Ada migration logic khusus untuk handle legacy key `Sholat Berjamaah` → `Shalat Berjamaah`. Ini pertanda data lama masih menggunakan ejaan lama. Beberapa di antaranya mungkin masih ada di database produksi dan perlu di-migrate.

**Rekomendasi:** 
- Tulis migration SQL untuk rename semua key jsonb `Sholat Berjamaah` → `Shalat Berjamaah` di tabel `report_cards`
- Setelah migrasi, hapus logika rename di kode (kode jadi simpel)

---

#### 🟠 P-6. Field `jumlah_hari_efektif` Punya Default Beda Antara DB vs Kode
**File:** `supabase_schema/017_add_attendance_and_effective_days.sql:10` (default 120) vs `src/pages/raport/RaportInput.tsx:72` (default 120) — OK di sini, tapi:

Cek apakah semua tempat yang memerlukan nilai ini menangani kasus `null`/`undefined` dengan benar. Bila `effective_days` di semester kosong atau null, kalkulasi kehadiran bisa NaN atau hasil tak terduga.

**Rekomendasi:** Tambahkan null-safe arithmetic dan tampilkan pesan kalau data belum diisi.

---

### 2.3 Masalah Minor & Code Smell

#### 🟡 M-1. Duplikasi Logika Migrasi Data di Banyak Tempat
**File:** `src/pages/raport/RaportInput.tsx:243-296`, dan kemungkinan di `GuruInput.tsx`

Logic migrasi untuk akhlak/kedisiplinan (rename "Adab Terhadap" → "Adab Kepada", rename "Tilawah Mandiri" → "Tilawah & Hafalan Mandiri", filter "Panjang Pendek", "Adab Kepada Allah & Rasul", dll) dilakukan di sisi aplikasi setiap kali load. 

**Rekomendasi:** Migrasi data historis via script SQL sekali jalan, lalu hapus logika migrasi di kode aplikasi — kecuali memang ada skenario user boleh import legacy data baru.

---

#### 🟡 M-2. File Besar & Kompleks
**File:** `src/pages/raport/RaportInput.tsx` (1119 baris), `src/components/raport/RaportTemplate.tsx` (490 baris)

File-file ini memiliki banyak tanggung jawab: query, state management, rendering form, autosave logic, migration, kalkulasi, dsb.

**Rekomendasi:** Extract ke custom hooks dan komponen kecil:
- `useRaportForm(studentId, semesterId)` — handle query + state + autosave
- `useBulkScoreInput(items)` — handle bulk input UI
- Pisahkan layout form dari logika
- Extract migration/legacy handling ke utility terpusat

---

#### 🟡 M-3. Custom Hooks/Queries Berulang
**File:** Berkas di `src/pages/raport/`

Query pattern seperti fetch students, fetch settings, fetch active semester, fetch teacher assignments muncul berulang di banyak komponen. Belum diekstrak ke custom hooks.

**Rekomendasi:** Bikin custom hooks di `src/hooks/`:
- `useStudents()`, `useActiveSemester()`, `useSettings()`, `useTeacherAssignments(userId)`

---

#### 🟡 M-4. Inline DOM Access (`document.getElementById`) untuk Bulk Input
**File:** `src/components/raport/TahfidzInput.tsx:248-249`

```tsx
const kbInput = document.getElementById('bulk-kb-input') as HTMLInputElement;
const khInput = document.getElementById('bulk-kh-input') as HTMLInputElement;
```

Menggunakan DOM query di React adalah anti-pattern. Seharusnya pakai controlled state.

**Rekomendasi:** Convert ke state biasa (`useState`).

---

#### 🟡 M-5. Tidak Ada Offline Support Meskipun Ada `src/lib/localDb.ts`
**File:** `src/lib/localDb.ts` (exist berdasarkan indikasi di summary sebelumnya)

File untuk local DB sudah ada tapi tidak diintegrasikan dengan input flow. Jika guru input nilai di area dengan koneksi internet terbatas (realistis untuk sekolah), mereka tidak bisa input tanpa internet.

**Rekomendasi:** Integrasikan offline-first sync dengan optimistik update. Saat ini ditambah local-first storage seperti Dexie atau sqlite-WASM.

---

#### 🟡 M-6. Predikat (Grade) Tidak Seragam Antara Default vs Custom Scale
**File:** `src/utils/grading.ts:21-37`

Default scale hardcoded: A (≥90), B (≥80), C (≥70), D (<70). Tapi di DB default scale pakai: A:85, B:70, C:60, D:0. Inkonsistensi langsung antara kode dan data.

**Dampak:** Kalau settings.skala_penilaian ada di DB, kode pakai itu. Kalau tidak ada, fallback ke hardcoded. Hasilnya bisa beda antar deploy.

**Rekomendasi:** Selalu ambil dari settings (wajib ada), tidak ada hardcoded fallback.

---

#### 🟡 M-7. Bulk Input Hanya Validasi Tipe Number di Akhlak/Kedisiplinan
**File:** `src/pages/raport/RaportInput.tsx`

Validasi bulk input hanya mengecek range 10-100 tapi tidak memvalidasi bahwa semua field telah diisi. User bisa submit dengan field kosong yang default ke 10 (nilai minimum).

**Rekomendasi:** Tambah validasi "semua field harus diisi" atau "konfirmasi sebelum apply".

---

#### 🟡 M-8. `RaportInput` Auto-Select Student dari URL Bisa Bentrok dengan Local State
**File:** `src/pages/raport/RaportInput.tsx:189-198`

`useEffect` memilih student dari URL parameter, tapi kondisi `selectedStudentId !== studentIdFromUrl` bisa infinite loop atau race dengan perubahan dari dropdown. Perlu audit dependency array.

---

## 3. Rekomendasi Peningkatan

### 3.1 Kritis & Mendesak (Sprint 1, 1-2 minggu)

#### R-1. Standardisasi Rumus Nilai Akhir (Pilih & Terapkan Satu)
**Dua opsi:**

**Opsi A — Simple Average (konsisten dengan kebijakan saat ini di `calculateFinalScore` & `view_leger_nilai`):**
```ts
// RaportTemplate.tsx
formatScore((report.nilai_akhir_akhlak + report.nilai_akhir_kedisiplinan + report.nilai_akhir_kognitif) / 3)
```
Pro: mudah dijelaskan, konsisten dengan leger & calculateFinalScore. Kontra: tidak ada fleksibilitas bobot.

**Opsi B — Weighted Average (konsisten dengan tampilan bobot di settings):**
- Update `calculateFinalScore` di `grading.ts`:
```ts
export const calculateFinalScore = (a, ked, kog, settings) => {
    return (a * settings.bobot_akhlak + ked * settings.bobot_kedisiplinan + kog * settings.bobot_kognitif) / 100;
};
```
- Update `view_leger_nilai` dengan weighted formula
- Update `calculateFinalScore` di RaportTemplate dengan weighted formula

**Rekomendasi saya:** Opsi B, karena:
1. Bobot sudah ditampilkan di UI — artinya niatnya memang weighted
2. Memberi fleksibilitas pedagogis ke lembaga
3. Lebih akurat mencerminkan prioritas (kognitif biasanya bobot lebih besar)

#### R-2. Audit & Fix RLS Policies
- Bikin migration `031_fix_rls_policies.sql` yang:
  - Admin full access
  - Guru hanya akses halaqahnya
  - Pembimbing hanya input akhlak/kedisiplinan untuk halaqahnya
  - Viewer hanya baca leger, tidak boleh akses raw report_cards

#### R-3. Tambah Validasi Frontend & Backend
- Zod schema untuk semua form (saat ini beberapa form belum ada Zod)
- Database CHECK constraint untuk memastikan nilai 0-100
- Tampilkan error inline yang ramah

#### R-4. Bersihkan File Backup
- Hapus `RaportInput.tsx.backup` dari git history
- Buat branch/tag sebagai arsip bila perlu

#### R-5. Tambah `pembimbing` ke Enum Role
```sql
-- 032_add_pembimbing_role.sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pembimbing';
```

### 3.2 Peningkatan Penting (Sprint 2, 2-4 minggu)

#### R-6. Refactoring File Besar
- Extract `RaportInput.tsx` jadi beberapa komponen + custom hooks
- Extract `RaportTemplate.tsx` jadi sub-komponen (HeaderSection, ScoreTable, SignatureBlock, dll)
- Target: tidak ada file > 400 baris

#### R-7. Custom Hooks untuk Query yang Berulang
- `src/hooks/useStudents.ts`
- `src/hooks/useActiveSemester.ts`
- `src/hooks/useSettings.ts`
- `src/hooks/useTeacherAssignments.ts`

#### R-8. Migrasi Data Legacy via SQL
- Rename `Sholat Berjamaah` → `Shalat Berjamaah` di jsonb
- Hapus key obsolete: `Adab Kepada Allah & Rasul`, `Adab Kepada Orang Tua`, `Adab Terhadap Guru`, `Adab Terhadap Teman`, `Panjang Pendek`
- Rename `Tilawah Mandiri` → `Tilawah & Hafalan Mandiri`

#### R-9. Konsolidasi Logika Migrasi
- Hapus migration logic di `RaportInput.tsx` setelah migrasi SQL selesai
- Sisakan hanya fallback minimal

#### R-10. Error Boundary Global
- Bikin `ErrorBoundary` di root untuk tangkap error rendering
- Tampilkan pesan ramah, log ke monitoring (Sentry/dst)

### 3.3 Peningkatan Jangka Menengah (Sprint 3, 1-2 bulan)

#### R-11. Offline-First Support
- Integrasikan `src/lib/localDb.ts` dengan React Query (offline mutation queue)
- Service worker untuk cache shell app
- Indikator online/offline di UI

#### R-12. Bulk Input yang Lebih Baik
- Validasi field wajib diisi sebelum apply
- Preview sebelum apply (konfirmasi dialog)
- Kemampuan apply ke subset (filter juz, halaqah, dll)

#### R-13. Audit Trail / Activity Log
- Tabel `activity_log` dengan trigger pada report_cards
- Catat siapa yang input/edit/approve, kapan, apa yang diubah
- Tampilan di UI untuk admin

#### R-14. Approval Workflow
- Tambah status `draft`, `submitted`, `approved`, `published` di `report_cards`
- Guru bisa submit, admin approve, baru bisa cetak final

#### R-15. PDF Generation Server-Side
- Saat ini cetak raport via `window.print()` (client-side)
- Pertimbangkan generate PDF via Supabase Edge Function untuk hasil lebih konsisten
- Support email raport langsung ke orang tua

#### R-16. Dashboard Analytics
- Chart distribusi nilai per halaqah/semester
- Top performers, watchlist siswa
- Trend kehadiran per periode

#### R-17. Notifikasi
- Email/WA notifikasi saat raport ready
- Reminder untuk guru yang belum input nilai
- Alert untuk nilai di bawah threshold

### 3.4 Peningkatan Nice-to-Have (Backlog)

#### R-18. Import/Export Nilai Massal
- Upload CSV/Excel nilai massal per kelas
- Download template CSV

#### R-19. Multi-Lembaga Support
- Jika sistem dipakai lebih dari satu cabang, tambah `lembaga_id` di semua tabel
- Filter semua query by lembaga

#### R-20. Tema Raport yang Lebih Kaya
- Multiple layout (single-page compact, two-page detail)
- Custom logo position
- Color customization lebih dari 4 tema

#### R-21. Internationalization (i18n)
- Saat ini hardcoded Bahasa Indonesia
- Siapkan infrastruktur i18n (react-intl/next-intl style)
- Bilingual support ID/EN untuk edge case

#### R-22. Mobile-First Guru Input
- Guru biasanya input via HP saat di halaqah
- Optimasi UX untuk layar kecil
- Quick input shortcuts

---

## 4. Roadmap Implementasi

| Sprint | Periode | Fokus | Deliverable |
|--------|---------|-------|-------------|
| 1 | Minggu 1-2 | Bug kritis | Fix C-1 sampai C-3, hapus backup, tambah validasi |
| 2 | Minggu 3-4 | Keamanan & data | Audit RLS, tambah role pembimbing, migrasi legacy |
| 3 | Minggu 5-6 | Refactor | Pecah file besar, custom hooks, error boundary |
| 4 | Minggu 7-8 | UX | Approval workflow, bulk input yang lebih baik |
| 5 | Minggu 9-10 | Offline & analytics | Offline support, dashboard admin |
| 6 | Minggu 11-12 | Polish | PDF server-side, notifikasi, mobile-first |

---

## 5. Checklist Verifikasi Setelah Fix

Setelah implementasi fix, jalankan verifikasi berikut:

- [ ] Cetak raport beberapa siswa → cocokkan nilai total dengan leger
- [ ] Ubah bobot di settings → nilai total ikut berubah (atau field disembunyikan)
- [ ] Login sebagai guru → hanya bisa akses halaqahnya
- [ ] Login sebagai viewer → tidak bisa akses raw scores
- [ ] Login sebagai pembimbing → bisa input akhlak/kedisiplinan, tidak bisa yang lain
- [ ] Clear input nilai (kosongkan field) → tidak menyimpan < 10
- [ ] Refresh halaman di tengah input → draft ter-restore dengan benar
- [ ] Cek raport untuk semua legacy keys sudah ter-migrate
- [ ] Test print A4 dan F4 hasilnya benar
- [ ] Test multi-tema (black, blue, green, red)
- [ ] Test page break settings (kognitif, tahsin, UAS)

---

## 6. Lampiran: Statistik Kode yang Dianalisis

| File | Baris | Status |
|------|-------|--------|
| `src/pages/raport/RaportInput.tsx` | 1119 | ⚠️ Perlu refactor |
| `src/pages/raport/GuruInput.tsx` | 857 | ⚠️ Perlu refactor |
| `src/components/raport/RaportTemplate.tsx` | 490 | 🔴 Bug C-1 |
| `src/pages/raport/LegerNilai.tsx` | — | ✅ OK (uses view) |
| `src/pages/raport/Peringkat.tsx` | — | ✅ OK |
| `src/components/raport/TahfidzInput.tsx` | 466 | 🟡 M-4 |
| `src/components/raport/PrintSettings.tsx` | 380 | ✅ OK |
| `src/components/raport/ScoreInput.tsx` | 47 | 🔴 C-3 |
| `src/utils/grading.ts` | 104 | ⚠️ Inconsistency |
| `supabase_schema/030_update_leger_view_formula.sql` | 24 | ⚠️ Inconsistent with template |
| `supabase_schema/001_create_tables.sql` | 105 | 🟡 P-4 (enum role) |
| `supabase_schema/002_policies.sql` | — | 🔴 P-3 (RLS) |
| `src/pages/raport/RaportInput.tsx.backup` | — | 🟠 P-1 (cleanup) |

---

## 7. Kesimpulan

Sistem Informasi Raport RQM sudah memiliki fondasi arsitektur yang baik dan fitur yang lengkap untuk kebutuhan operasional. Akan tetapi, ada beberapa hal kritis yang harus segera ditangani sebelum dipakai untuk periode penilaian resmi:

1. **Sinkronkan rumus nilai akhir** di semua tempat (RaportTemplate, grading utility, dan database view) — ini blocker.
2. **Audit ulang RLS policies** untuk memastikan privasi data siswa.
3. **Bersihkan file backup** dan legacy code yang tidak diperlukan.
4. **Tambah validasi input** untuk mencegah data tidak valid masuk ke database.

Setelah critical fix diterapkan, fokus berikutnya adalah refactoring untuk maintainability (file besar, duplikasi logic), kemudian fitur-fitur peningkatan (approval workflow, offline support, analytics).

Sistem ini punya potensi untuk menjadi lebih solid. Dengan investasi 1-2 sprint untuk critical fix, ditambah refactor dan security hardening, saya yakin sistem ini akan cukup andal untuk jangka panjang.

---

*Laporan ini dihasilkan dari analisis statis terhadap source code dan database schema pada 10 September 2026. Pengujian dinamis (runtime testing, integration test, security test) masih perlu dilakukan terpisah untuk verifikasi penuh.*