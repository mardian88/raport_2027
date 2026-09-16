import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tursoClient as db } from '../../lib/turso-client';
import type { SurahMaster } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Pencil, Trash2, Eye, EyeOff, Check, X, Settings } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { showAlert } from '../../utils/sweetAlert';
import { QURAN_SURAHS } from '../../data/quran';
import { useAuth } from '../../hooks/useAuth';

export default function SurahManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { session } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSurah, setEditingSurah] = useState<SurahMaster | null>(null);
    const [formData, setFormData] = useState<Partial<SurahMaster>>({});

    // Inline editing state
    const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
    const [inlineEditName, setInlineEditName] = useState('');

    const { data: surahList, isLoading } = useQuery({
        queryKey: ['surah_master'],
        queryFn: async () => {
            const { data } = await db
                .from('surah_master')
                .select('*')
                .order('juz', { ascending: false })
                .order('urutan_dalam_juz', { ascending: true });
            return data as SurahMaster[];
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<SurahMaster>) => {
            if (data.id) {
                const { error } = await db
                    .from('surah_master')
                    .update(data)
                    .eq('id', data.id);
                if (error) throw error;
            } else {
                const { error } = await db.from('surah_master').insert([data]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
            setIsFormOpen(false);
            setEditingSurah(null);
            setFormData({});
            setInlineEditingId(null);
            setInlineEditName('');
            toast({
                title: "Berhasil",
                description: "Data surah berhasil disimpan",
                variant: "success"
            });
        },
        onError: (err: any) => {
            toast({
                title: "Gagal",
                description: "Gagal menyimpan: " + err.message,
                variant: "destructive"
            });
        }
    });

    const seedMutation = useMutation({
        mutationFn: async () => {
            // Kita hapus semua surah yang ada dulu atau insert only jika kosong
            const { count } = await db.from('surah_master').select('*', { count: 'exact', head: true });
            if (count && count > 0) {
                if (!await showAlert.confirm('Database surah sudah terisi. Yakin ingin menghapus semua dan generate ulang 114 Surah?')) {
                    throw new Error('Cancelled');
                }
                await db.from('surah_master').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            }
            
            // Insert in batches of 30 due to potential limits
            const dataToInsert = QURAN_SURAHS.map(s => ({
                juz: s.juz,
                nomor_surah: s.nomor_surah,
                nama_surah: s.nama_surah,
                nama_arab: s.nama_arab,
                urutan_dalam_juz: s.urutan_dalam_juz,
                is_active: true
            }));

            const { error } = await db.from('surah_master').insert(dataToInsert);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
            toast({ title: 'Berhasil', description: '114 Surah resmi berhasil digenerate', variant: 'success' });
        },
        onError: (err: any) => {
            if (err.message !== 'Cancelled') {
                toast({ title: 'Gagal', description: 'Gagal generate surah: ' + err.message, variant: 'destructive' });
            }
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await db
                .from('surah_master')
                .update({ is_active: !isActive })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await db.from('surah_master').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
            toast({
                title: "Berhasil",
                description: "Surah berhasil dihapus",
                variant: "success"
            });
        }
    });

    const handleFullEdit = (surah: SurahMaster) => {
        setEditingSurah(surah);
        setFormData(surah);
        setIsFormOpen(true);
    };

    const handleInlineEdit = (surah: SurahMaster) => {
        setInlineEditingId(surah.id);
        setInlineEditName(surah.nama_surah);
    };

    const handleInlineSave = (id: string) => {
        if (!inlineEditName.trim()) return;
        saveMutation.mutate({ id, nama_surah: inlineEditName });
    };

    const handleCancelInline = () => {
        setInlineEditingId(null);
        setInlineEditName('');
    };

    const handleDelete = async (id: string) => {
        if (await showAlert.confirm('Yakin ingin menghapus surah ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    // Group by Juz
    const surahByJuz = surahList?.reduce((acc, surah) => {
        if (!acc[surah.juz]) acc[surah.juz] = [];
        acc[surah.juz].push(surah);
        return acc;
    }, {} as Record<number, SurahMaster[]>) || {};

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Manajemen Surah</h1>
                    <p className="text-sm text-gray-500 mt-1">Kelola surah dan juz yang tersedia di sistem</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => seedMutation.mutate()} 
                        disabled={seedMutation.isPending}
                        className="min-h-[44px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                        {seedMutation.isPending ? 'Generating...' : 'Generate 114 Surah Resmi'}
                    </Button>
                    <Button onClick={() => { setEditingSurah(null); setFormData({}); setIsFormOpen(true); }} className="min-h-[44px]">
                        <Plus className="mr-2 h-4 w-4" /> Tambah Surah Manual
                    </Button>
                </div>
            </div>

            {isFormOpen && (
                <Card>
                    <CardHeader>
                        <CardTitle>{editingSurah ? 'Edit Detail Surah' : 'Tambah Surah Baru'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Juz</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={formData.juz || ''}
                                        onChange={(e) => setFormData({ ...formData, juz: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nomor Surah</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={114}
                                        value={formData.nomor_surah || ''}
                                        onChange={(e) => setFormData({ ...formData, nomor_surah: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama Surah</Label>
                                    <Input
                                        value={formData.nama_surah || ''}
                                        onChange={(e) => setFormData({ ...formData, nama_surah: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Urutan dalam Juz</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.urutan_dalam_juz || ''}
                                        onChange={(e) => setFormData({ ...formData, urutan_dalam_juz: parseInt(e.target.value) })}
                                        required
                                    />
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

            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(surahByJuz).sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([juz, surahList]) => (
                        <Card key={juz}>
                            <CardHeader>
                                <CardTitle className="text-lg">Juz {juz}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {surahList.map((surah) => (
                                        <div key={surah.id} className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b last:border-0 gap-2">
                                            <div className="flex items-start sm:items-center gap-3 flex-1">
                                                {inlineEditingId === surah.id ? (
                                                    <div className="flex items-center gap-2 flex-1 max-w-md">
                                                        <Input
                                                            value={inlineEditName}
                                                            onChange={(e) => setInlineEditName(e.target.value)}
                                                            className="h-8"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleInlineSave(surah.id);
                                                                if (e.key === 'Escape') handleCancelInline();
                                                            }}
                                                        />
                                                        <Button size="sm" variant="ghost" className="text-green-600 h-8 w-8 p-0" onClick={() => handleInlineSave(surah.id)}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="text-red-600 h-8 w-8 p-0" onClick={handleCancelInline}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className={`flex flex-col ${!surah.is_active ? 'opacity-50' : ''}`}>
                                                        <span className={`text-base font-medium ${!surah.is_active ? 'line-through' : 'text-gray-900'}`}>
                                                            {surah.nomor_surah}. {surah.nama_surah}
                                                        </span>
                                                        {surah.nama_arab && (
                                                            <span className="text-xl font-arabic text-emerald-800 mt-1" dir="rtl">
                                                                {surah.nama_arab}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {!surah.is_active && (
                                                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded ml-2">Nonaktif</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2 sm:mt-0 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => toggleActiveMutation.mutate({ id: surah.id, isActive: surah.is_active })}
                                                    title={surah.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {surah.is_active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => handleInlineEdit(surah)}
                                                    title="Edit Nama"
                                                >
                                                    <Pencil className="h-5 w-5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-10 w-10 p-0"
                                                    onClick={() => handleFullEdit(surah)}
                                                    title="Edit Detail Lengkap"
                                                >
                                                    <Settings className="h-5 w-5" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-500 h-10 w-10 p-0 hover:bg-red-50" onClick={() => handleDelete(surah.id)}>
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

