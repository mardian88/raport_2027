import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Student, Halaqah } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Pencil, Trash2, Upload, Download, Search, Trash } from 'lucide-react';
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

    // Pagination & Table states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(8);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        nama: '',
        nis: '',
        halaqah: '',
        shift: ''
    });

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
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== isEditing?.id));
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase.from('students').delete().in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setSelectedIds([]);
            toast({ title: 'Berhasil', description: 'Data santri terpilih berhasil dihapus.' });
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<Student>) => {
            const payload = {
                ...data,
                halaqah_id: data.halaqah_id || null,
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

    const importMutation = useMutation({
        mutationFn: async (studentsToImport: Partial<Student>[]) => {
            const { error } = await supabase.from('students').insert(studentsToImport);
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
            halaqah_id: student.halaqah_id || ''
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (await showAlert.confirm('Yakin ingin menghapus santri ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (await showAlert.confirm(`Yakin ingin menghapus ${selectedIds.length} santri terpilih?`)) {
            bulkDeleteMutation.mutate(selectedIds);
        }
    };

    const handleDeleteAll = async () => {
        if (await showAlert.confirm('PERINGATAN: Yakin ingin menghapus SEMUA data santri? Tindakan ini tidak bisa dibatalkan.')) {
            const { error } = await supabase.from('students').delete().in('id', students?.map(s => s.id) || []);
            if (!error) {
                queryClient.invalidateQueries({ queryKey: ['students'] });
                setSelectedIds([]);
                toast({ title: 'Berhasil', description: 'Semua data santri berhasil dihapus.' });
            } else {
                toast({ variant: 'destructive', title: 'Gagal', description: error.message });
            }
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

                const studentsToImport: Partial<Student>[] = [];
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

                        studentsToImport.push({
                            nama: String(nama),
                            nis: nis ? String(nis) : undefined,
                            halaqah_id: halaqahId || undefined,
                            nama_orang_tua: namaOrangTua ? String(namaOrangTua) : undefined,
                            shift: (String(shift).toLowerCase() === 'siang' ? 'Siang' : String(shift).toLowerCase() === 'malam' ? 'Malam' : 'Sore') as 'Siang' | 'Sore' | 'Malam',
                            is_active: true,
                        });
                    }
                }

                if (studentsToImport.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "Tidak Ada Data Valid",
                        description: "Tidak ada data santri yang valid di file Excel.",
                    });
                    return;
                }

                importMutation.mutate(studentsToImport);
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

    // Filter Logic
    const filteredStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(s => {
            const matchNama = s.nama.toLowerCase().includes(filters.nama.toLowerCase());
            const matchNis = (s.nis || '').toLowerCase().includes(filters.nis.toLowerCase());
            const halaqahName = s.halaqah_data?.nama || s.halaqah || '';
            const matchHalaqah = halaqahName.toLowerCase().includes(filters.halaqah.toLowerCase());
            const matchShift = (s.shift || '').toLowerCase().includes(filters.shift.toLowerCase());
            return matchNama && matchNis && matchHalaqah && matchShift;
        });
    }, [students, filters]);

    // Pagination Logic
    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredStudents.length / itemsPerPage);
    
    // Ensure currentPage is valid after filtering
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    }

    const paginatedStudents = useMemo(() => {
        if (itemsPerPage === 'all') return filteredStudents;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(start, start + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all on current page
            const newIds = new Set([...selectedIds, ...paginatedStudents.map(s => s.id)]);
            setSelectedIds(Array.from(newIds));
        } else {
            // Deselect all on current page
            const pageIds = paginatedStudents.map(s => s.id);
            setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
        }
    };

    const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        if (e.target.checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    };

    const isAllPageSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Data Santri</h1>
                <div className="flex flex-wrap gap-2">
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
                            <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importMutation.isPending} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)} disabled={importMutation.isPending}>
                                Batal
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Table Area */}
            <Card className="overflow-hidden border-border/40 shadow-sm">
                <div className="p-4 bg-gray-50/50 border-b flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                <Trash className="mr-2 h-4 w-4" /> Hapus {selectedIds.length} Terpilih
                            </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteAll}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Semua
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Tampilkan:</span>
                        <select 
                            className="border rounded px-2 py-1 bg-white text-sm"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={8}>8</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value="all">Semua</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 border-b">
                            {/* Column Titles */}
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300"
                                        checked={isAllPageSelected}
                                        onChange={handleSelectAll} 
                                    />
                                </th>
                                <th className="px-4 py-3 font-semibold text-gray-700">Nama</th>
                                <th className="px-4 py-3 font-semibold text-gray-700">NIS</th>
                                <th className="px-4 py-3 font-semibold text-gray-700">Halaqah</th>
                                <th className="px-4 py-3 font-semibold text-gray-700">Shift</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-right w-24">Aksi</th>
                            </tr>
                            {/* Column Filters */}
                            <tr className="border-t bg-gray-50/30">
                                <th className="px-4 py-2 border-r"></th>
                                <th className="px-4 py-2 border-r">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Filter..." 
                                            className="w-full pl-7 pr-2 py-1 text-xs border rounded-md"
                                            value={filters.nama}
                                            onChange={(e) => setFilters(prev => ({ ...prev, nama: e.target.value }))}
                                        />
                                    </div>
                                </th>
                                <th className="px-4 py-2 border-r">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Filter..." 
                                            className="w-full pl-7 pr-2 py-1 text-xs border rounded-md"
                                            value={filters.nis}
                                            onChange={(e) => setFilters(prev => ({ ...prev, nis: e.target.value }))}
                                        />
                                    </div>
                                </th>
                                <th className="px-4 py-2 border-r">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Filter..." 
                                            className="w-full pl-7 pr-2 py-1 text-xs border rounded-md"
                                            value={filters.halaqah}
                                            onChange={(e) => setFilters(prev => ({ ...prev, halaqah: e.target.value }))}
                                        />
                                    </div>
                                </th>
                                <th className="px-4 py-2 border-r">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Filter..." 
                                            className="w-full pl-7 pr-2 py-1 text-xs border rounded-md"
                                            value={filters.shift}
                                            onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                                        />
                                    </div>
                                </th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        Tidak ada data yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((student) => (
                                    <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50/80 transition-colors">
                                        <td className="px-4 py-3 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300"
                                                checked={selectedIds.includes(student.id)}
                                                onChange={(e) => handleSelectRow(e, student.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{student.nama}</td>
                                        <td className="px-4 py-3 text-gray-600">{student.nis || '-'}</td>
                                        <td className="px-4 py-3">
                                            {student.halaqah_data?.nama || student.halaqah ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                    {student.halaqah_data?.nama || student.halaqah}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Belum ditentukan</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                {student.shift || 'Sore'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end items-center gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(student)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(student.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {!isLoading && itemsPerPage !== 'all' && totalPages > 1 && (
                    <div className="p-4 border-t bg-gray-50/50 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            Menampilkan {((currentPage - 1) * (itemsPerPage as number)) + 1} - {Math.min(currentPage * (itemsPerPage as number), filteredStudents.length)} dari {filteredStudents.length} santri
                        </div>
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
                            </Button>
                            
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-md text-sm ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
