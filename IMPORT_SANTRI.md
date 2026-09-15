# Fitur Import Santri Massal

## ✅ Fitur Baru: Import Santri dari File CSV

Sekarang Anda bisa menambahkan banyak santri sekaligus menggunakan file CSV!

---

## 📋 Cara Menggunakan

### 1. Buka Halaman Data Santri
- Login ke aplikasi
- Klik menu **"Data Santri"** di sidebar

### 2. Klik Tombol "Import Massal"
- Klik tombol **"Import Massal"** di pojok kanan atas
- Dialog import akan terbuka

### 3. Download Template CSV
- Klik tombol **"Download Template"**
- File `template_import_santri.csv` akan terdownload
- Buka file dengan Excel atau Google Sheets

### 4. Isi Data Santri
Format file CSV:
```csv
Nama,NIS,Halaqah,Nama Orang Tua,Shift
Ahmad Fauzi,2024001,Al-Fatihah,Bapak Ahmad,Sore
Fatimah Zahra,2024002,Al-Baqarah,Ibu Fatimah,Siang
Muhammad Ali,2024003,Al-Imran,Bapak Ali,Sore
```

**Kolom:**
- **Nama** (wajib): Nama lengkap santri
- **NIS** (opsional): Nomor Induk Santri
- **Halaqah** (opsional): Nama Halaqah (harus sesuai dengan data yang sudah ada)
- **Nama Orang Tua** (opsional): Nama orang tua/wali
- **Shift** (opsional): "Siang" atau "Sore" (default: Sore)

### 5. Upload File
- Klik **"Upload File CSV"**
- Pilih file CSV yang sudah diisi
- Klik **"Open"**

### 6. Selesai!
- Sistem akan otomatis import semua santri
- Notifikasi akan muncul: "X santri berhasil ditambahkan"
- Data santri langsung muncul di tabel

---

## ⚠️ Catatan Penting

### Format File
- File harus berformat **CSV** (Comma Separated Values)
- Baris pertama adalah header (Nama, NIS, Halaqah, dll)
- Data dimulai dari baris kedua

### Nama Halaqah
- Nama Halaqah harus **persis sama** dengan data yang sudah ada
- Contoh: Jika di database ada "Al-Fatihah", maka di CSV harus "Al-Fatihah"
- Jika Halaqah tidak ditemukan, santri tetap ditambahkan tapi tanpa Halaqah

### Shift
- Hanya ada 2 pilihan: **"Siang"** atau **"Sore"**
- Jika kosong atau salah, default: **Sore**

### Validasi
- Minimal harus ada **Nama** santri
- Jika baris tidak valid, akan di-skip (tidak error)

---

## 💡 Tips

### 1. Gunakan Excel/Google Sheets
- Buka template dengan Excel atau Google Sheets
- Isi data dengan mudah
- Save as CSV saat selesai

### 2. Copy-Paste dari Excel
- Jika sudah punya data di Excel, copy-paste ke template
- Pastikan urutan kolom sesuai

### 3. Import Bertahap
- Jika data banyak, import bertahap (misal 50 santri per file)
- Lebih mudah untuk tracking jika ada error

### 4. Cek Data Halaqah Dulu
- Pastikan semua Halaqah sudah dibuat di menu "Data Halaqah"
- Baru import santri dengan Halaqah tersebut

---

## 🔧 Troubleshooting

### "File CSV tidak memiliki data"
- Pastikan file ada isi (minimal 2 baris: header + 1 data)
- Cek format file benar-benar CSV

### "Tidak ada data santri yang valid"
- Pastikan kolom Nama terisi
- Cek format CSV (pakai koma sebagai separator)

### Halaqah tidak ter-assign
- Cek nama Halaqah di CSV sama persis dengan database
- Case sensitive: "Al-Fatihah" ≠ "al-fatihah"

### Import Gagal
- Cek koneksi internet
- Cek console browser (F12) untuk error detail
- Pastikan tidak ada karakter aneh di CSV

---

## 📊 Contoh Data

### Template CSV:
```csv
Nama,NIS,Halaqah,Nama Orang Tua,Shift
Ahmad Fauzi,2024001,Al-Fatihah,Bapak Ahmad,Sore
Fatimah Zahra,2024002,Al-Baqarah,Ibu Fatimah,Siang
Muhammad Ali,2024003,Al-Imran,Bapak Ali,Sore
Siti Aisyah,2024004,An-Nisa,Ibu Siti,Sore
Umar bin Khattab,2024005,Al-Maidah,Bapak Umar,Siang
```

### Hasil Import:
- 5 santri ditambahkan
- Semua ter-assign ke Halaqah masing-masing
- Shift sesuai yang ditentukan
- Status: Aktif

---

## ✨ Keuntungan Fitur Ini

1. **Hemat Waktu**: Import 100 santri dalam hitungan detik
2. **Mudah**: Cukup isi Excel, upload, selesai
3. **Aman**: Validasi otomatis, data invalid di-skip
4. **Fleksibel**: Bisa import dengan/tanpa Halaqah
5. **Template**: Template sudah disediakan, tinggal isi

---

## 🎯 Best Practices

1. **Backup Data**: Backup database sebelum import massal
2. **Test Dulu**: Import 2-3 santri dulu untuk test
3. **Cek Hasil**: Setelah import, cek data di tabel
4. **Konsisten**: Gunakan format yang sama untuk semua import

---

## 🚀 Ready to Use!

Fitur sudah live di production! Langsung bisa digunakan untuk import santri massal.

**Happy Importing!** 📝
