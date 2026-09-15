# Fitur Manajemen Item Tahsin

## Deskripsi
Fitur ini memungkinkan admin untuk mengelola item-item penilaian Tahsin yang aktif dalam sistem raport. Mirip dengan sistem Tahfidz, item Tahsin sekarang dapat diaktifkan/dinonaktifkan secara dinamis dari database.

## File yang Dibuat/Dimodifikasi

### 1. Database Migration
**File**: `supabase_schema/019_create_tahsin_master.sql`
- Membuat tabel `tahsin_master` untuk menyimpan master data item Tahsin
- Kolom: `id`, `nama_item`, `urutan`, `is_active`, `created_at`, `updated_at`
- Mengisi data default 10 item Tahsin
- Menambahkan RLS policies untuk akses authenticated users

### 2. TypeScript Types
**File**: `src/types/index.ts`
- Menambahkan interface `TahsinMaster`

### 3. Halaman Manajemen Tahsin
**File**: `src/pages/tahsin/TahsinManagement.tsx`
- UI untuk CRUD item Tahsin
- Fitur:
  - Tambah item baru
  - Aktifkan/nonaktifkan item
  - Ubah urutan item (▲▼)
  - Hapus item
  - Toggle switch untuk status aktif/nonaktif

### 4. Routing
**File**: `src/App.tsx`
- Menambahkan route `/tahsin` untuk halaman manajemen

**File**: `src/components/layout/Layout.tsx`
- Menambahkan menu "Data Tahsin" di sidebar

### 5. Integrasi dengan Input Raport
**File**: `src/pages/raport/RaportInput.tsx`
- Menggunakan data dari `tahsin_master` table
- Prioritas: Database → Halaqah Config → Default hardcoded
- Hanya item yang `is_active = true` yang muncul di form input

### 6. Integrasi dengan Cetak Raport
**File**: `src/pages/raport/RaportPrint.tsx`
- Menggunakan data dari `tahsin_master` table
- Menampilkan item sesuai urutan yang dikonfigurasi

## Cara Menggunakan

### 1. Jalankan Migration Database
```sql
-- Jalankan file: supabase_schema/019_create_tahsin_master.sql
-- di Supabase SQL Editor
```

### 2. Akses Halaman Manajemen Tahsin
1. Login ke aplikasi
2. Klik menu **"Data Tahsin"** di sidebar
3. Anda akan melihat daftar item Tahsin yang sudah ada

### 3. Menambah Item Baru
1. Ketik nama item di kolom "Nama Item"
2. Klik tombol **"Tambah"** atau tekan Enter
3. Item baru akan ditambahkan di urutan paling bawah

### 4. Mengaktifkan/Menonaktifkan Item
1. Gunakan toggle switch di sebelah kanan setiap item
2. Item yang nonaktif akan berwarna abu-abu
3. Item yang nonaktif **tidak akan muncul** di form input raport

### 5. Mengubah Urutan Item
1. Gunakan tombol ▲ (naik) atau ▼ (turun) di sebelah kiri item
2. Urutan akan tersimpan otomatis
3. Urutan ini akan digunakan saat menampilkan di input dan cetak raport

### 6. Menghapus Item
1. Klik tombol **merah (Trash)** di sebelah kanan item
2. Konfirmasi penghapusan
3. **Hati-hati**: Data nilai yang sudah tersimpan untuk item ini tidak akan terhapus

## Prioritas Penggunaan Item Tahsin

Sistem menggunakan prioritas berikut untuk menentukan item Tahsin yang aktif:

1. **Database** (`tahsin_master` table) - **PRIORITAS TERTINGGI**
   - Jika ada item aktif di database, gunakan ini
   
2. **Konfigurasi Halaqah** (`halaqah.tahsin_items`)
   - Jika database kosong, gunakan konfigurasi per-halaqah
   
3. **Default Hardcoded**
   - Jika kedua sumber di atas kosong, gunakan default 10 item

## Item Tahsin Default

Berikut adalah 10 item Tahsin default yang sudah dimasukkan ke database:

1. Makhroj Huruf
2. Mad
3. Hukum Nun Sukun
4. Hukum Mim Sukun
5. Hukum Alif Lam
6. Qolqolah
7. Lafdzul Jalalah
8. Hukum Gunnah
9. Waqof-Washol
10. Idzhar, Idghom, Ikhfa lanjutan

## Catatan Penting

1. **Backward Compatibility**: Sistem tetap mendukung data lama yang menggunakan konfigurasi Halaqah atau hardcoded items
2. **Real-time Update**: Perubahan di halaman manajemen akan langsung terlihat di form input raport
3. **Data Persistence**: Nilai yang sudah tersimpan untuk item yang dinonaktifkan tetap ada di database, hanya tidak ditampilkan
4. **Urutan Fleksibel**: Urutan item dapat diubah kapan saja tanpa mempengaruhi data yang sudah ada

## Troubleshooting

### Item tidak muncul di form input
- Pastikan item sudah diaktifkan (toggle switch ON)
- Refresh halaman input raport
- Cek apakah migration database sudah dijalankan

### Urutan item tidak berubah
- Pastikan perubahan sudah tersimpan (lihat toast notification)
- Refresh halaman
- Cek koneksi database

### Item yang dihapus masih muncul di raport lama
- Ini normal, karena data nilai sudah tersimpan
- Item hanya tidak akan muncul di input raport baru
