# Implementasi Fitur Lanjutan Raport

## Status Implementasi

### ✅ Yang Sudah Selesai:

1. **Tahsin Management dengan Filter Halaqah**
   - Database migration: `020_add_halaqah_to_tahsin.sql`
   - Interface TypeScript dengan `halaqah_id`
   - Halaman `TahsinManagement.tsx` dengan filter per Halaqah
   - CRUD lengkap untuk item Tahsin

2. **Unsaved Changes Warning - Komponen**
   - Hook: `src/hooks/useUnsavedChangesWarning.ts`
   - Dialog: `src/components/ui/unsaved-changes-dialog.tsx`
   - Siap digunakan

### 📝 Yang Perlu Dilengkapi Manual:

#### 1. Integrasi Unsaved Changes ke RaportInput

Tambahkan kode berikut di `RaportInput.tsx`:

**a. Setelah deklarasi state (sekitar baris 55):**
```typescript
// Initialize unsaved changes hook
const { showWarning, confirmNavigation, cancelNavigation, interceptNavigation } = 
    useUnsavedChangesWarning(hasUnsavedChanges);
```

**b. Tambahkan useEffect untuk tracking changes (setelah auto-save useEffect, sekitar baris 174):**
```typescript
// Track form changes
useEffect(() => {
    if (selectedStudentId && activeSemester) {
        const currentState = JSON.stringify({
            akhlak,
            kedisiplinan,
            tahsin,
            uasTulis,
            uasLisan,
            catatan,
            tahfidzProgress
        });
        
        if (initialFormState === '') {
            // First load, set initial state
            setInitialFormState(currentState);
            setHasUnsavedChanges(false);
        } else {
            // Check if changed
            setHasUnsavedChanges(currentState !== initialFormState);
        }
    }
}, [akhlak, kedisiplinan, tahsin, uasTulis, uasLisan, catatan, tahfidzProgress, initialFormState, selectedStudentId, activeSemester]);
```

**c. Update saveMutation onSuccess (sekitar baris 238):**
```typescript
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['report_card'] });
    queryClient.invalidateQueries({ queryKey: ['tahfidz_progress'] });
    if (selectedStudentId && activeSemester) {
        localStorage.removeItem(`draft_raport_${selectedStudentId}_${activeSemester.id}`);
    }
    
    // Reset unsaved changes
    setHasUnsavedChanges(false);
    const newState = JSON.stringify({
        akhlak,
        kedisiplinan,
        tahsin,
        uasTulis,
        uasLisan,
        catatan,
        tahfidzProgress
    });
    setInitialFormState(newState);
    
    alert('Raport berhasil disimpan');
},
```

**d. Tambahkan dialog di bagian return (sebelum closing div terakhir):**
```typescript
{/* Unsaved Changes Dialog */}
<UnsavedChangesDialog
    open={showWarning}
    onConfirm={confirmNavigation}
    onCancel={cancelNavigation}
/>
```

#### 2. Quick Navigation dari Leger Nilai

File: `src/pages/raport/LegerNilai.tsx`

**a. Import yang diperlukan:**
```typescript
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
```

**b. Update bagian render nama santri (cari di tabel, biasanya ada `<td>{student.nama}</td>`):**

Ganti dengan:
```typescript
<td className="p-2 border-r border-gray-300">
    <Link
        to={`/raport/input?student=${student.id}`}
        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        title="Buka Input Raport"
    >
        {student.nama}
        <ExternalLink className="h-3 w-3" />
    </Link>
</td>
```

**c. Update RaportInput untuk menerima query parameter:**

Di `RaportInput.tsx`, tambahkan setelah imports:
```typescript
import { useSearchParams } from 'react-router-dom';
```

Lalu di dalam component (setelah deklarasi hooks):
```typescript
const [searchParams] = useSearchParams();

// Auto-select student from URL parameter
useEffect(() => {
    const studentIdFromUrl = searchParams.get('student');
    if (studentIdFromUrl && students) {
        const student = students.find(s => s.id === studentIdFromUrl);
        if (student) {
            setSelectedStudentId(studentIdFromUrl);
        }
    }
}, [searchParams, students]);
```

## Cara Menggunakan Setelah Implementasi

### 1. Tahsin Management
1. Jalankan migration `019_create_tahsin_master.sql` dan `020_add_halaqah_to_tahsin.sql`
2. Akses menu "Data Tahsin"
3. Pilih filter Halaqah
4. Tambah/edit/hapus item sesuai kebutuhan

### 2. Unsaved Changes Warning
- Otomatis aktif saat ada perubahan di form
- Warning muncul saat:
  - Klik link sidebar
  - Close tab/browser
  - Navigate ke halaman lain

### 3. Quick Navigation dari Leger
- Klik nama santri di Leger Nilai
- Langsung dibawa ke halaman Input Raport
- Santri otomatis terpilih

## Testing Checklist

- [ ] Migration database berhasil dijalankan
- [ ] Tahsin Management dapat menambah item
- [ ] Filter Halaqah berfungsi
- [ ] Warning muncul saat ada unsaved changes
- [ ] Link dari Leger ke Input berfungsi
- [ ] Student auto-selected dari URL parameter

## Troubleshooting

### Unsaved Changes tidak muncul
- Pastikan hook `useUnsavedChangesWarning` sudah diimport
- Check console untuk error
- Pastikan `hasUnsavedChanges` state ter-update

### Link dari Leger tidak berfungsi
- Pastikan route `/raport/input` ada di App.tsx
- Check URL parameter dengan console.log
- Pastikan students data sudah loaded

### Tahsin items tidak muncul
- Check migration sudah dijalankan
- Verify data di Supabase table `tahsin_master`
- Check query di browser DevTools Network tab
