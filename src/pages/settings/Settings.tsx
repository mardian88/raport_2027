import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { SettingsLembaga } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Trash2, Plus, Edit, Check, X } from 'lucide-react';
import { CloudinaryUpload } from '../../components/ui/CloudinaryUpload';
import { showAlert } from '../../utils/sweetAlert';

export default function Settings() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<SettingsLembaga>>({});
    const [gradeScale, setGradeScale] = useState<Record<string, number>>({});
    const [newGrade, setNewGrade] = useState('');
    const [newMinScore, setNewMinScore] = useState('');
    const [editingGrade, setEditingGrade] = useState<string | null>(null);
    const [editMinScore, setEditMinScore] = useState('');

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('settings_lembaga').select('*').single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            return data as SettingsLembaga | null;
        },
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
            setGradeScale(settings.skala_penilaian || { A: 90, B: 80, C: 70, D: 0 });
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: async (newData: Partial<SettingsLembaga>) => {
            if (settings?.id) {
                const { error } = await supabase
                    .from('settings_lembaga')
                    .update(newData)
                    .eq('id', settings.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('settings_lembaga')
                    .insert([newData]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            showAlert.success('Berhasil', 'Pengaturan berhasil disimpan');
        },
        onError: (error: any) => {
            showAlert.error('Gagal', 'Gagal menyimpan: ' + error.message);
        },
    });

    // Helper to get range display
    const getGradeRange = (grade: string, minScore: number): string => {
        const sortedEntries = Object.entries(gradeScale).sort(([, a], [, b]) => b - a);
        const currentIndex = sortedEntries.findIndex(([g]) => g === grade);

        if (currentIndex === 0) {
            // Highest grade
            return `${minScore.toFixed(2)} - 100`;
        } else {
            // Get the next higher grade's min score
            const nextHigherMin = sortedEntries[currentIndex - 1][1];
            return `${minScore.toFixed(2)} - ${(nextHigherMin - 0.01).toFixed(2)}`;
        }
    };

    const handleAddGrade = () => {
        if (!newGrade || !newMinScore) {
            showAlert.warning('Peringatan', 'Predikat dan nilai minimum harus diisi');
            return;
        }

        const minScore = parseInt(newMinScore);
        if (minScore < 0 || minScore > 100) {
            showAlert.warning('Peringatan', 'Nilai minimum harus antara 0-100');
            return;
        }

        if (gradeScale[newGrade.toUpperCase()] !== undefined) {
            showAlert.warning('Peringatan', 'Predikat sudah ada');
            return;
        }

        setGradeScale({ ...gradeScale, [newGrade.toUpperCase()]: minScore });
        setNewGrade('');
        setNewMinScore('');
    };

    const handleStartEdit = (grade: string, currentMinScore: number) => {
        setEditingGrade(grade);
        setEditMinScore(currentMinScore.toString());
    };

    const handleSaveEdit = () => {
        if (!editingGrade) return;

        const minScore = Number(editMinScore);
        if (isNaN(minScore) || minScore < 0 || minScore > 100) {
            showAlert.warning('Peringatan', 'Nilai minimum harus antara 0-100');
            return;
        }

        setGradeScale({ ...gradeScale, [editingGrade]: minScore });
        setEditingGrade(null);
        setEditMinScore('');
    };

    const handleCancelEdit = () => {
        setEditingGrade(null);
        setEditMinScore('');
    };

    const handleDeleteGrade = (grade: string) => {
        const updated = { ...gradeScale };
        delete updated[grade];
        setGradeScale(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ ...formData, skala_penilaian: gradeScale });
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Pengaturan Lembaga</h1>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identitas Lembaga</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nama Lembaga</Label>
                                <Input
                                    value={formData.nama_lembaga || ''}
                                    onChange={e => setFormData({ ...formData, nama_lembaga: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Alamat</Label>
                                <Input
                                    value={formData.alamat || ''}
                                    onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kota</Label>
                                <Input
                                    value={formData.kota || ''}
                                    onChange={e => setFormData({ ...formData, kota: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kontak</Label>
                                <Input
                                    value={formData.nomor_kontak || ''}
                                    onChange={e => setFormData({ ...formData, nomor_kontak: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Kepala Lembaga</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nama Kepala</Label>
                                <Input
                                    value={formData.nama_kepala_lembaga || ''}
                                    onChange={e => setFormData({ ...formData, nama_kepala_lembaga: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>NIP / NIY</Label>
                                <Input
                                    value={formData.nip_kepala_lembaga || ''}
                                    onChange={e => setFormData({ ...formData, nip_kepala_lembaga: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Logo Lembaga</Label>
                                <CloudinaryUpload 
                                    value={formData.logo_url || ''}
                                    onChange={url => setFormData({ ...formData, logo_url: url })}
                                    label="Upload Logo"
                                    placeholder="gambar logo lembaga"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tanda Tangan Kepala Lembaga</Label>
                                <CloudinaryUpload 
                                    value={formData.signature_url || ''}
                                    onChange={url => setFormData({ ...formData, signature_url: url })}
                                    label="Upload Tanda Tangan"
                                    placeholder="gambar tanda tangan kepala"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tempat & Tanggal Raport (Default)</Label>
                                <Input
                                    value={formData.tempat_tanggal_raport || ''}
                                    onChange={e => setFormData({ ...formData, tempat_tanggal_raport: e.target.value })}
                                    placeholder="Contoh: Bandung, 20 Desember 2024"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Bobot Penilaian (%)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Akhlak</Label>
                                    <Input
                                        type="number"
                                        value={formData.bobot_akhlak || 0}
                                        onChange={e => setFormData({ ...formData, bobot_akhlak: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kedisiplinan</Label>
                                    <Input
                                        type="number"
                                        value={formData.bobot_kedisiplinan || 0}
                                        onChange={e => setFormData({ ...formData, bobot_kedisiplinan: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kognitif</Label>
                                    <Input
                                        type="number"
                                        value={formData.bobot_kognitif || 0}
                                        onChange={e => setFormData({ ...formData, bobot_kognitif: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Total harus 100%</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Skala Nilai (Predikat)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Current Grade Scale Table */}
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium w-24">Predikat</th>
                                            <th className="px-4 py-2 text-left font-medium">Rentang Nilai</th>
                                            <th className="px-4 py-2 text-center font-medium w-32">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(gradeScale)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([grade, minScore]) => (
                                                <tr key={grade} className="border-b last:border-0">
                                                    <td className="px-4 py-2 font-bold text-lg">{grade}</td>
                                                    <td className="px-4 py-2">
                                                        {editingGrade === grade ? (
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    value={editMinScore}
                                                                    onChange={(e) => setEditMinScore(e.target.value)}
                                                                    className="w-24"
                                                                    placeholder="Min"
                                                                    step="0.01"
                                                                />
                                                                <span className="text-gray-500">- ...</span>
                                                            </div>
                                                        ) : (
                                                            <span className="font-medium">{getGradeRange(grade, minScore)}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {editingGrade === grade ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSaveEdit}
                                                                    className="text-green-600 hover:text-green-800"
                                                                    title="Simpan"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEdit}
                                                                    className="text-gray-600 hover:text-gray-800"
                                                                    title="Batal"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartEdit(grade, minScore)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                    title="Edit"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteGrade(grade)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                    title="Hapus"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add New Grade */}
                            <div className="space-y-2">
                                <Label>Tambah Predikat Baru</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Predikat (A, B, C, D)"
                                        value={newGrade}
                                        onChange={(e) => setNewGrade(e.target.value)}
                                        className="w-32"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Nilai Min (0-100)"
                                        value={newMinScore}
                                        onChange={(e) => setNewMinScore(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleAddGrade}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Tambah
                                    </Button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500">
                                <strong>Rentang nilai otomatis dihitung:</strong> Nilai desimal dibaca dengan presisi 2 digit.
                                Contoh: A = 90.00-100, B = 80.00-89.99, C = 70.00-79.99, D = 0.00-69.99
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Pengaturan Raport</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="show_uas_lisan"
                                    checked={formData.show_uas_lisan !== false}
                                    onChange={e => setFormData({ ...formData, show_uas_lisan: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="show_uas_lisan" className="cursor-pointer">
                                    Tampilkan UAS Lisan di Raport
                                </Label>
                            </div>
                            <p className="text-sm text-gray-500">
                                Jika dinonaktifkan, field UAS Lisan tidak akan muncul di input dan tidak akan tercetak di raport.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

