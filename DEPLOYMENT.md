# Deployment Guide: GitHub & Vercel

Panduan lengkap untuk deploy aplikasi **Raport RQM** ke production.

---

## 📋 Prerequisites

Sebelum mulai, pastikan Anda sudah punya:

- ✅ **Akun GitHub** (gratis) - [Daftar di sini](https://github.com/signup)
- ✅ **Akun Vercel** (gratis) - [Daftar di sini](https://vercel.com/signup) (gunakan GitHub untuk login)
- ✅ **Database Supabase** (production instance)
- ✅ **Git** terinstall di komputer

---

## 🚀 Langkah 1: Persiapan Lokal

### 1.1 Verifikasi Build Lokal

```bash
cd c:\Users\RQM\Downloads\raport
npm run build
```

✅ **Pastikan tidak ada error!**

### 1.2 Verifikasi Environment Variables

File `.env` Anda harus berisi:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

⚠️ **JANGAN commit file ini ke GitHub!** (sudah ada di `.gitignore`)

---

## 🐙 Langkah 2: Setup GitHub Repository

### 2.1 Inisialisasi Git (jika belum)

```bash
cd c:\Users\RQM\Downloads\raport
git init
git add .
git commit -m "Initial commit: Raport RQM System"
```

### 2.2 Buat Repository di GitHub

1. Buka [GitHub](https://github.com)
2. Klik tombol **"New"** atau **"+"** → **"New repository"**
3. Isi form:
   - **Repository name**: `raport-rqm` (atau nama lain)
   - **Description**: "Sistem Raport Rumah Qur'an Muharrik"
   - **Visibility**: **Private** (recommended) atau Public
   - **JANGAN** centang "Add README" (sudah ada)
4. Klik **"Create repository"**

### 2.3 Push ke GitHub

Setelah repository dibuat, GitHub akan menampilkan instruksi. Jalankan:

```bash
git remote add origin https://github.com/USERNAME/raport-rqm.git
git branch -M main
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda.

✅ **Code Anda sekarang sudah di GitHub!**

---

## ☁️ Langkah 3: Deploy ke Vercel

### 3.1 Login ke Vercel

1. Buka [Vercel](https://vercel.com)
2. Klik **"Login"** → pilih **"Continue with GitHub"**
3. Authorize Vercel untuk akses GitHub Anda

### 3.2 Import Project

1. Di Vercel Dashboard, klik **"Add New..."** → **"Project"**
2. Pilih repository **`raport-rqm`** dari list
3. Klik **"Import"**

### 3.3 Configure Project

**Framework Preset**: Vercel akan auto-detect **Vite**

**Build Settings** (biarkan default):
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 3.4 Environment Variables

Klik **"Environment Variables"**, tambahkan:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key-here` |

⚠️ **Pastikan nilai sama dengan file `.env` lokal Anda!**

### 3.5 Deploy

1. Klik **"Deploy"**
2. Tunggu proses build (2-3 menit)
3. ✅ **Deployment berhasil!**

Vercel akan memberikan URL seperti:
```
https://raport-rqm.vercel.app
```

---

## 🗄️ Langkah 4: Database Migration

### 4.1 Login ke Supabase

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project production Anda

### 4.2 Jalankan SQL Migrations

Di **SQL Editor**, jalankan file-file ini **secara berurutan**:

#### 1. Create Tahsin Master Table
```sql
-- File: 019_create_tahsin_master.sql
-- Copy paste isi file ini ke SQL Editor
-- Klik "Run"
```

#### 2. Add Halaqah to Tahsin
```sql
-- File: 020_add_halaqah_to_tahsin.sql
-- Copy paste isi file ini ke SQL Editor
-- Klik "Run"
```

#### 3. Standardize Tahsin (jika ada)
```sql
-- File: 022_standardize_tahsin_master.sql (jika ada)
-- Copy paste isi file ini ke SQL Editor
-- Klik "Run"
```

### 4.3 Verifikasi Schema

Di **Table Editor**, pastikan:
- ✅ Tabel `tahsin_master` ada
- ✅ Kolom `halaqah_id` ada di `tahsin_master`
- ✅ Kolom `sakit`, `izin`, `alpa`, `jumlah_hari_efektif` ada di `report_cards`

---

## ✅ Langkah 5: Testing Production

### 5.1 Akses Aplikasi

Buka URL Vercel Anda:
```
https://raport-rqm.vercel.app
```

### 5.2 Test Checklist

- [ ] **Login** berfungsi
- [ ] **Dashboard** tampil
- [ ] **Data Santri** dapat diakses
- [ ] **Input Raport** berfungsi
- [ ] **Kehadiran otomatis** berfungsi
- [ ] **Unsaved changes warning** muncul
- [ ] **Cetak Raport** berfungsi
- [ ] **Tahsin Management** berfungsi
- [ ] **Quick navigation** dari Leger berfungsi

### 5.3 Jika Ada Error

**Cek Vercel Logs:**
1. Di Vercel Dashboard → Project → **"Deployments"**
2. Klik deployment terakhir
3. Tab **"Logs"** untuk melihat error

**Common Issues:**
- **404 on refresh**: Pastikan `vercel.json` ada
- **Database error**: Cek environment variables
- **Build error**: Cek di Logs, biasanya TypeScript error

---

## 🔄 Update Aplikasi (Future)

Setiap kali ada perubahan code:

```bash
git add .
git commit -m "Deskripsi perubahan"
git push
```

Vercel akan **otomatis deploy** setiap kali ada push ke GitHub! 🎉

---

## 📝 Environment Variables Reference

### Development (.env lokal)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Production (Vercel)
Sama seperti development, set di Vercel Dashboard → Settings → Environment Variables

---

## 🎯 Custom Domain (Opsional)

Jika ingin domain sendiri (misal: `raport.rqm.id`):

1. Di Vercel Dashboard → Project → **"Settings"** → **"Domains"**
2. Tambahkan domain Anda
3. Ikuti instruksi DNS configuration
4. Tunggu propagasi (5-10 menit)

---

## 🆘 Troubleshooting

### Build Failed
```bash
# Test build lokal
npm run build

# Jika error, fix error dulu
# Commit & push lagi
```

### Environment Variables Tidak Terbaca
- Pastikan nama variable diawali `VITE_`
- Restart deployment di Vercel
- Clear cache: Redeploy

### Database Connection Error
- Cek `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
- Pastikan Supabase project tidak paused
- Cek RLS policies di Supabase

---

## 📞 Support

Jika ada masalah:
1. Cek Vercel Logs
2. Cek Supabase Logs
3. Cek Browser Console (F12)

---

## ✨ Selamat!

Aplikasi Raport RQM Anda sudah **LIVE di production**! 🎉

**URL Production**: `https://raport-rqm.vercel.app`

Bagikan URL ini ke tim Anda dan mulai gunakan sistem raport digital!
