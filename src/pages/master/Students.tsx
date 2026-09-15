import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Student, Halaqah } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { showAlert } from '../../utils/sweetAlert';
import * as XLSX from 'xlsx';

export default function Students() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState<Student | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Student>>({});

    const { data: students, isLoading } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*, halaqah_data:halaqah(id, nama)')
                .order('nama', { ascending: true });
            if (error) throw error;
            return data as Student[];
        },
    });

    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('halaqah')
                .select('*')
                .eq('is_active', true)
                .order('nama');
            if (error) throw error;
            return data as Halaqah[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<Student>) => {
            // Ensure halaqah_id is set correctly (or null if empty)
            const payload = {
                ...data,
                halaqah_id: data.halaqah_id || null,
                // Clear legacy field if using new system, or keep it synced if needed. 
                // For now we just update halaqah_id.
            };

            if (isEditing?.id) {
                const { error } = await supabase
                    .from('students')
                    .update(payload)
                    .eq('id', isEditing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('students').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsFormOpen(false);
            setIsEditing(null);
            setFormData({});
        },
    });

    // Bulk import mutation
    const importMutation = useMutation({
        mutationFn: async (students: Partial<Student>[]) => {
            const { error } = await supabase.from('students').insert(students);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsImportOpen(false);
            toast({
                title: "Import Berhasil",
                description: `${variables.length} santri berhasil ditambahkan.`,
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Import Gagal",
                description: error.message,
            });
        },
    });

    const handleEdit = (student: Student) => {
        setIsEditing(student);
        setFormData({
            ...student,
            halaqah_id: student.halaqah_id || '' // Ensure controlled input
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (await showAlert.confirm('Yakin ingin menghapus santri ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate({ ...formData, is_active: true });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

                if (!rows || rows.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "File Kosong",
                        description: "File Excel tidak memiliki data.",
                    });
                    return;
                }

                // Parse Excel rows
                const students: Partial<Student>[] = [];
                for (const row of rows) {
                    const nama = row['Nama'] || row['nama'];
                    const nis = row['NIS'] || row['nis'];
                    const halaqahName = row['Halaqah'] || row['halaqah'];
                    const namaOrangTua = row['Nama Orang Tua'] || row['nama orang tua'] || row['Nama OrangTua'];
                    const shift = row['Shift'] || row['shift'];

                    if (nama) {
                        let halaqahId = null;

                        if (halaqahName && halaqahList) {
                            const halaqah = halaqahList.find(h =>
                                h.nama.toLowerCase() === String(halaqahName).toLowerCase()
                            );
                            halaqahId = halaqah?.id || null;
                        }

                        students.push({
                            nama: String(nama),
                            nis: nis ? String(nis) : undefined,
                            halaqah_id: halaqahId || undefined,
                            nama_orang_tua: namaOrangTua ? String(namaOrangTua) : undefined,
                            shift: (String(shift).toLowerCase() === 'siang' ? 'Siang' : String(shift).toLowerCase() === 'malam' ? 'Malam' : 'Sore') as 'Siang' | 'Sore' | 'Malam',
                            is_active: true,
                        });
                    }
                }

                if (students.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "Tidak Ada Data Valid",
                        description: "Tidak ada data santri yang valid di file Excel.",
                    });
                    return;
                }

                importMutation.mutate(students);
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error Parsing File",
                    description: error.message,
                });
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const downloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([
            {
                Nama: 'Ahmad Fauzi',
                NIS: '2024001',
                Halaqah: 'Al-Fatihah',
                'Nama Orang Tua': 'Bapak Ahmad',
                Shift: 'Sore'
            },
            {
                Nama: 'Fatimah Zahra',
                NIS: '2024002',
                Halaqah: 'Al-Baqarah',
                'Nama Orang Tua': 'Ibu Fatimah',
                Shift: 'Siang'
            }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template Santri");
        XLSX.writeFile(workbook, "template_import_santri.xlsx");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Data Santri</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" /> Import Massal
                    </Button>
                    <Button onClick={() => { setIsEditing(null); setFormData({}); setIsFormOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Tambah Santri
                    </Button>
                </div>
            </div>

            {isFormOpen && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Edit Santri' : 'Tambah Santri Baru'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nama Lengkap</Label>
                                    <Input
                                        value={formData.nama || ''}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>NIS</Label>
                                    <Input
                                        value={formData.nis || ''}
                                        onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Halaqah</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.halaqah_id || ''}
                                        onChange={(e) => setFormData({ ...formData, halaqah_id: e.target.value })}
                                    >
                                        <option value="">-- Pilih Halaqah --</option>
                                        {halaqahList?.map((h) => (
                                            <option key={h.id} value={h.id}>{h.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama Orang Tua</Label>
                                    <Input
                                        value={formData.nama_orang_tua || ''}
                                        onChange={(e) => setFormData({ ...formData, nama_orang_tua: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Shift</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.shift || 'Sore'}
                                        onChange={(e) => setFormData({ ...formData, shift: e.target.value as 'Siang' | 'Sore' | 'Malam' })}
                                    >
                                        <option value="Siang">Siang</option>
                                        <option value="Sore">Sore</option>
                                        <option value="Malam">Malam</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={saveMutation.isPending}>Simpan</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Import Dialog */}
            {isImportOpen && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Import Santri Massal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">Format File Excel (.xlsx):</h3>
                            <p className="text-sm text-blue-800 mb-3">
                                File harus berformat Excel dengan kolom: <strong>Nama, NIS, Halaqah, Nama Orang Tua, Shift</strong>
                            </p>
                            <Button size="sm" variant="outline" onClick={downloadTemplate}>
                                <Download className="mr-2 h-4 w-4" /> Download Template
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Upload File Excel</Label>
                            <Input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                disabled={importMutation.isPending}
                            />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs text-yellow-800">
                                <strong>Catatan:</strong>
                            </p>
                            <ul className="text-xs text-yellow-700 list-disc list-inside mt-1 space-y-1">
                                <li>Nama Halaqah harus sesuai dengan data yang sudah ada</li>
                                <li>Shift: "Siang", "Sore", atau "Malam" (default: Sore)</li>
                                <li>Jika Halaqah tidak ditemukan, santri akan ditambahkan tanpa Halaqah</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsImportOpen(false)}
                                disabled={importMutation.isPending}
                            >
                                Batal
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded-md border">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium">Nama</th>
                                <th className="px-4 py-3 font-medium">NIS</th>
                                <th className="px-4 py-3 font-medium">Halaqah</th>
                                <th className="px-4 py-3 font-medium">Shift</th>
                                <th className="px-4 py-3 font-medium text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students?.map((student) => (
                                <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="px-4 py-3">{student.nama}</td>
                                    <td className="px-4 py-3">{student.nis || '-'}</td>
                                    <td className="px-4 py-3">
                                        {student.halaqah_data?.nama || student.halaqah || <span className="text-gray-400 italic">Belum ditentukan</span>}
                                    </td>
                                    <td className="px-4 py-3">{student.shift || 'Sore'}</td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(student)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(student.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {students?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Belum ada data santri</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

