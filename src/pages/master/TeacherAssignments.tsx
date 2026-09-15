import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import type { TeacherAssignment, User, Halaqah } from '../../types';

export default function TeacherAssignments() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        teacher_id: '',
        halaqah_id: '',
        subject: 'Tahfidz' as 'Tahfidz' | 'Tahsin',
        role: 'guru' as 'guru' | 'pembimbing'
    });

    // Fetch all teacher assignments with joined data
    const { data: assignments, isLoading } = useQuery({
        queryKey: ['teacher_assignments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teacher_assignments')
                .select(`
                    *,
                    teacher:users!teacher_id(id, email, full_name),
                    halaqah:halaqah!halaqah_id(id, nama)
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as (TeacherAssignment & { teacher: User; halaqah: Halaqah })[];
        }
    });

    // Fetch teachers (guru and admin)
    const { data: teachers } = useQuery({
        queryKey: ['teachers_list'],
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

    // Fetch halaqah list
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

    // Mutation for adding/updating
    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (editingId) {
                const { error } = await supabase
                    .from('teacher_assignments')
                    .update(data)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('teacher_assignments')
                    .insert([data]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher_assignments'] });
            setIsOpen(false);
            resetForm();
            toast({
                title: "Berhasil",
                description: editingId ? "Penugasan berhasil diperbarui" : "Penugasan berhasil ditambahkan"
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: error.message.includes('duplicate')
                    ? "Penugasan ini sudah ada."
                    : error.message
            });
        }
    });

    // Delete assignment mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('teacher_assignments')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher_assignments'] });
            toast({
                title: "Berhasil",
                description: "Penugasan guru berhasil dihapus."
            });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: error.message
            });
        }
    });

    const resetForm = () => {
        setFormData({ teacher_id: '', halaqah_id: '', subject: 'Tahfidz', role: 'guru' });
        setEditingId(null);
    };

    const handleEdit = (assignment: TeacherAssignment) => {
        setFormData({
            teacher_id: assignment.teacher_id,
            halaqah_id: assignment.halaqah_id,
            subject: assignment.subject,
            role: assignment.role || 'guru'
        });
        setEditingId(assignment.id);
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const handleDelete = (id: string, teacherName: string, halaqahName: string, subject: string) => {
        if (confirm(`Hapus penugasan ${teacherName} untuk ${subject} di ${halaqahName}?`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Penugasan Guru</h1>
                    <p className="text-gray-500">Kelola penugasan guru per halaqah dan materi</p>
                </div>

                <Dialog open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" /> Tambah Penugasan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Penugasan' : 'Tambah Penugasan Guru'}</DialogTitle>
                            <DialogDescription>
                                Tetapkan guru untuk mengajar materi tertentu di halaqah tertentu.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Guru</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.teacher_id}
                                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Pilih Guru --</option>
                                    {teachers?.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.full_name || t.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Halaqah</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.halaqah_id}
                                    onChange={(e) => setFormData({ ...formData, halaqah_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Pilih Halaqah --</option>
                                    {halaqahList?.map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {h.nama}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Materi</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value as 'Tahfidz' | 'Tahsin' })}
                                    required
                                >
                                    <option value="Tahfidz">Tahfidz</option>
                                    <option value="Tahsin">Tahsin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Peran</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'guru' | 'pembimbing' })}
                                    required
                                >
                                    <option value="guru">Guru Mata Pelajaran (Input Nilai Saja)</option>
                                    <option value="pembimbing">Pembimbing Halaqah (Input Nilai + Akhlak/Disiplin)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan
                                </Button>
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
                                <TableHead>Guru</TableHead>
                                <TableHead>Halaqah</TableHead>
                                <TableHead>Materi</TableHead>
                                <TableHead>Peran</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : assignments?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        Belum ada penugasan guru
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assignments?.map((assignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell>
                                            {assignment.teacher?.full_name || assignment.teacher?.email || '-'}
                                        </TableCell>
                                        <TableCell>{assignment.halaqah?.nama || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${assignment.subject === 'Tahfidz'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {assignment.subject}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {assignment.role === 'pembimbing' ? (
                                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Pembimbing</span>
                                            ) : (
                                                <span className="text-gray-500 text-xs">Guru Mapel</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(assignment)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(
                                                        assignment.id,
                                                        assignment.teacher?.full_name || assignment.teacher?.email || 'Guru',
                                                        assignment.halaqah?.nama || 'Halaqah',
                                                        assignment.subject
                                                    )}
                                                    disabled={deleteMutation.isPending}
                                                    className="text-red-600 hover:text-red-700"
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

