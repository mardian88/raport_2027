import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Pencil, Trash2, Plus, User as UserIcon } from 'lucide-react';
import type { Halaqah, User } from '../../types';

export default function HalaqahManagement() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nama: '',
        guru_id: '',
        shift: '' as 'Siang' | 'Sore' | '',
        tahsin_items: [] as string[]
    });



    // Fetch Halaqah
    const { data: halaqahList, isLoading } = useQuery({
        queryKey: ['halaqah'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('halaqah')
                .select('*, guru:users(id, email, full_name)')
                .order('nama');
            if (error) throw error;
            return data as Halaqah[];
        }
    });

    // Fetch Teachers (Users with role 'guru' or 'admin')
    const { data: teachers } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .in('role', ['guru', 'admin'])
                .order('email');
            if (error) throw error;
            return data as User[];
        }
    });

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (editingId) {
                const { error } = await supabase
                    .from('halaqah')
                    .update(data)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('halaqah')
                    .insert([data]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['halaqah'] });
            setIsOpen(false);
            resetForm();
            alert('Data berhasil disimpan');
        },
        onError: (error: any) => {
            alert('Error: ' + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('halaqah').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['halaqah'] });
            alert('Data berhasil dihapus');
        }
    });

    const resetForm = () => {
        setFormData({ nama: '', guru_id: '', shift: '', tahsin_items: [] });
        setEditingId(null);
    };

    const handleEdit = (halaqah: Halaqah) => {
        setFormData({
            nama: halaqah.nama,
            guru_id: halaqah.guru_id || '',
            shift: halaqah.shift || '',
            tahsin_items: halaqah.tahsin_items || []
        });
        setEditingId(halaqah.id);
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };



    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manajemen Halaqah</h1>
                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Tambah Halaqah</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Halaqah' : 'Tambah Halaqah Baru'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Nama Halaqah</Label>
                                <Input
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    placeholder="Contoh: Halaqah Abu Bakar"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Guru Pembimbing</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.guru_id}
                                    onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })}
                                >
                                    <option value="">-- Pilih Guru --</option>
                                    {teachers?.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.full_name || t.email} ({t.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Shift (Opsional)</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={formData.shift}
                                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as 'Siang' | 'Sore' | '' })}
                                >
                                    <option value="">-- Tidak ditentukan --</option>
                                    <option value="Siang">Siang</option>
                                    <option value="Sore">Sore</option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Jika diisi, semua santri dalam halaqah ini akan mengikuti aturan shift ini (misal: Shift Siang tidak ada input Shalat Berjamaah).
                                </p>
                            </div>



                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={mutation.isPending}>Simpan</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Halaqah</TableHead>
                                <TableHead>Guru Pembimbing</TableHead>
                                <TableHead>Shift</TableHead>
                                <TableHead>Materi Tahsin</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {halaqahList?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        Belum ada data halaqah
                                    </TableCell>
                                </TableRow>
                            ) : (
                                halaqahList?.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="font-medium">{h.nama}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-gray-400" />
                                                {h.guru?.full_name || h.guru?.email || <span className="text-gray-400 italic">Belum ada guru</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {h.shift ? (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.shift === 'Siang' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {h.shift}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                {h.tahsin_items?.length || 0} Materi Aktif
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(h)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => {
                                                        if (confirm('Yakin ingin menghapus halaqah ini?')) {
                                                            deleteMutation.mutate(h.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

