import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { Pencil, Plus, Loader2 } from 'lucide-react';
import { CloudinaryUpload } from '../../components/ui/CloudinaryUpload';
import { showAlert } from '../../utils/sweetAlert';
import type { User } from '../../types';

export default function TeacherManagement() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        full_name: '',
        signature_url: ''
    });

    // Add User Form State
    const [addFormData, setAddFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'guru' as 'guru' | 'admin'
    });
    const [isAdding, setIsAdding] = useState(false);

    // Fetch Teachers
    const { data: teachers, isLoading } = useQuery({
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

    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (!editingUser) return;
            const { error } = await supabase
                .from('users')
                .update(data)
                .eq('id', editingUser.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers_list'] });
            setIsOpen(false);
            setEditingUser(null);
            showAlert.success('Berhasil', 'Data guru berhasil diupdate');
        },
        onError: (error: any) => {
            showAlert.error('Gagal', error.message);
        }
    });

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name || '',
            signature_url: user.signature_url || ''
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    // Handle Add User - bypass auth and save directly to public.users
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            // Cek email duplikat
            const existing = teachers?.find(t => t.email === addFormData.email);
            if (existing) throw new Error('Email sudah terdaftar. Silakan gunakan email lain.');

            // Bypass mode: insert directly into public.users with generated UUID
            const newId = crypto.randomUUID();
            const { error } = await supabase.from('users').insert([{
                id: newId,
                email: addFormData.email,
                full_name: addFormData.full_name,
                role: addFormData.role,
                signature_url: ''
            }]);
            
            if (error) throw error;

            showAlert.success('Berhasil', 'Guru berhasil ditambahkan!');
            setAddFormData({ email: '', password: '', full_name: '', role: 'guru' });
            setIsAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ['teachers_list'] });
        } catch (error: any) {
            showAlert.error('Gagal', 'Gagal menambah guru: ' + error.message);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Data Guru & Admin</h1>
                    <p className="text-gray-500">Kelola profil dan tanda tangan guru</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" /> Tambah Guru
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tambah Guru Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan email dan password untuk membuat akun login guru baru.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    required
                                    value={addFormData.email}
                                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                    placeholder="email@guru.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={addFormData.password}
                                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nama Lengkap</Label>
                                <Input
                                    required
                                    value={addFormData.full_name}
                                    onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                                    placeholder="Nama lengkap dengan gelar"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={addFormData.role}
                                    onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value as 'guru' | 'admin' })}
                                >
                                    <option value="guru">Guru</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isAdding}>
                                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Nama Lengkap</TableHead>
                                <TableHead>Tanda Tangan</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : teachers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">Belum ada data guru</TableCell>
                                </TableRow>
                            ) : (
                                teachers?.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {t.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>{t.full_name || '-'}</TableCell>
                                        <TableCell>
                                            {t.signature_url ? (
                                                <img src={t.signature_url} alt="Sig" className="h-8 object-contain" />
                                            ) : (
                                                <span className="text-gray-400 text-xs">Belum ada</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={isOpen && editingUser?.id === t.id} onOpenChange={(open) => {
                                                if (open) handleEdit(t);
                                                else setIsOpen(false);
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <Pencil className="h-4 w-4 mr-2" /> Edit Profil
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Profil Guru</DialogTitle>
                                                        <DialogDescription>
                                                            Ubah nama lengkap dan URL tanda tangan guru.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <form onSubmit={handleSubmit} className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label>Email</Label>
                                                            <Input value={editingUser?.email || ''} disabled className="bg-gray-100" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Nama Lengkap (untuk Raport)</Label>
                                                            <Input
                                                                value={formData.full_name}
                                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                                placeholder="Contoh: Ahmad, S.Pd.I"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Tanda Tangan Guru</Label>
                                                            <CloudinaryUpload 
                                                                value={formData.signature_url || ''}
                                                                onChange={(url) => setFormData({ ...formData, signature_url: url })}
                                                                label="Upload Tanda Tangan"
                                                                placeholder="gambar tanda tangan"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                                            <Button type="submit" disabled={updateMutation.isPending}>Simpan</Button>
                                                        </div>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
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

