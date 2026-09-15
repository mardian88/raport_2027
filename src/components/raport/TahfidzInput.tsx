import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { SurahMaster, TahfidzProgress } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScoreInput } from './ScoreInput';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { Input } from '../ui/input';

interface TahfidzInputProps {
    reportCardId?: string;
    studentId?: string; // Add studentId to fetch assigned surah
    onScoreChange: (avgScore: number) => void;
    onProgressChange?: (data: Record<string, { kb: number; kh: number }>) => void;
}

export function TahfidzInput({ reportCardId, studentId, onScoreChange, onProgressChange }: TahfidzInputProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
    const [progressData, setProgressData] = useState<Record<string, { kb: number; kh: number }>>({});

    // Editing state
    const [editingSurahId, setEditingSurahId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Fetch student's assigned surah (only active ones)
    const { data: allSurah } = useQuery({
        queryKey: ['student_assigned_surah', studentId],
        enabled: !!studentId,
        queryFn: async () => {
            if (!studentId) return [];

            // Fetch surah that are assigned and active for this student
            const { data, error } = await supabase
                .from('student_surah_assignment')
                .select('surah_id, surah:surah_master(*)')
                .eq('student_id', studentId)
                .eq('is_active', true);

            if (error) throw error;

            // Extract surah data and sort
            const surahList = (data || [])
                .map((item: any) => item.surah as SurahMaster)
                .filter((s): s is SurahMaster => s !== null && s !== undefined)
                .sort((a, b) => {
                    if (a.juz !== b.juz) return b.juz - a.juz; // Descending Juz
                    return a.urutan_dalam_juz - b.urutan_dalam_juz; // Ascending order within Juz
                });

            return surahList;
        }
    });

    // Fetch existing progress if reportCardId exists
    const { data: existingProgress } = useQuery({
        queryKey: ['tahfidz_progress', reportCardId],
        enabled: !!reportCardId,
        queryFn: async () => {
            const { data } = await supabase
                .from('tahfidz_progress')
                .select('*, surah:surah_master(*)')
                .eq('report_card_id', reportCardId!);
            return data as TahfidzProgress[];
        }
    });

    // Load existing progress into state
    useEffect(() => {
        if (existingProgress) {
            const progressMap: Record<string, { kb: number; kh: number }> = {};
            existingProgress.forEach(p => {
                progressMap[p.surah_id] = { kb: p.kb, kh: p.kh };
            });
            setProgressData(progressMap);
        }
    }, [existingProgress]);

    // Calculate average score whenever progress changes
    useEffect(() => {
        const scores = Object.values(progressData);
        if (scores.length === 0) {
            onScoreChange(0); // Default to 0 (blank)
            return;
        }

        const totalScore = scores.reduce((sum, { kb, kh }) => {
            return sum + ((kb + kh) / 2);
        }, 0);

        const avgScore = totalScore / scores.length;
        onScoreChange(avgScore);
        if (onProgressChange) {
            onProgressChange(progressData);
        }
    }, [progressData, onScoreChange, onProgressChange]);

    // Group surah by Juz
    const surahByJuz = allSurah?.reduce((acc, surah) => {
        if (!acc[surah.juz]) acc[surah.juz] = [];
        acc[surah.juz].push(surah);
        return acc;
    }, {} as Record<number, SurahMaster[]>) || {};

    const availableJuz = Object.keys(surahByJuz).map(Number).sort((a, b) => b - a);

    // Auto-select first available Juz if none selected or selected is not available
    useEffect(() => {
        if (availableJuz.length > 0) {
            if (selectedJuz === null || !availableJuz.includes(selectedJuz)) {
                setSelectedJuz(availableJuz[0]);
            }
        } else {
            setSelectedJuz(null);
        }
    }, [availableJuz, selectedJuz]);

    const handleScoreChange = (surahId: string, field: 'kb' | 'kh', value: number) => {
        setProgressData(prev => ({
            ...prev,
            [surahId]: {
                kb: field === 'kb' ? value : (prev[surahId]?.kb || 0),
                kh: field === 'kh' ? value : (prev[surahId]?.kh || 0)
            }
        }));
    };

    const handleRemoveSurah = (surahId: string) => {
        setProgressData(prev => {
            const newData = { ...prev };
            delete newData[surahId];
            return newData;
        });
    };

    const handleAddSurah = (surah: SurahMaster) => {
        setProgressData(prev => ({
            ...prev,
            [surah.id]: { kb: 0, kh: 0 }
        }));
    };

    // Mutation to update Surah name
    const updateSurahMutation = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const { error } = await supabase
                .from('surah_master')
                .update({ nama_surah: name })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student_assigned_surah'] });
            queryClient.invalidateQueries({ queryKey: ['tahfidz_progress'] });
            setEditingSurahId(null);
            setEditName('');
            toast({
                title: "Berhasil",
                description: "Nama surah berhasil diperbarui",
                variant: "success"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal",
                description: "Gagal memperbarui nama surah: " + error.message,
                variant: "destructive"
            });
        }
    });

    const startEditing = (surah: SurahMaster) => {
        setEditingSurahId(surah.id);
        setEditName(surah.nama_surah);
    };

    const cancelEditing = () => {
        setEditingSurahId(null);
        setEditName('');
    };

    const saveSurahName = (id: string) => {
        if (!editName.trim()) return;
        updateSurahMutation.mutate({ id, name: editName });
    };

    const currentJuzSurah = selectedJuz ? (surahByJuz[selectedJuz] || []) : [];
    const trackedSurahIds = Object.keys(progressData);

    // Show message if no surah assigned
    if (!studentId) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Pilih santri terlebih dahulu untuk menampilkan surah</p>
            </div>
        );
    }

    if (!allSurah || allSurah.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Belum ada surah yang diaktifkan untuk santri ini.</p>
                <p className="text-sm mt-2">Silakan aktifkan surah di menu "Surah per Santri"</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Bulk Input Section */}
            {allSurah && allSurah.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Input Nilai Massal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nilai KB (10-100)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="100"
                                    className="w-full rounded-md border border-input bg-white px-3 py-2"
                                    placeholder="Contoh: 85"
                                    id="bulk-kb-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nilai KH (10-100)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="100"
                                    className="w-full rounded-md border border-input bg-white px-3 py-2"
                                    placeholder="Contoh: 85"
                                    id="bulk-kh-input"
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    const kbInput = document.getElementById('bulk-kb-input') as HTMLInputElement;
                                    const khInput = document.getElementById('bulk-kh-input') as HTMLInputElement;
                                    const kbValue = parseInt(kbInput.value);
                                    const khValue = parseInt(khInput.value);

                                    if (!kbValue || !khValue) {
                                        toast({
                                            variant: "destructive",
                                            title: "Input tidak valid",
                                            description: "Mohon isi nilai KB dan KH terlebih dahulu"
                                        });
                                        return;
                                    }

                                    if (kbValue < 10 || kbValue > 100 || khValue < 10 || khValue > 100) {
                                        toast({
                                            variant: "destructive",
                                            title: "Input tidak valid",
                                            description: "Nilai harus antara 10-100"
                                        });
                                        return;
                                    }

                                    // Apply to all active surah
                                    const newProgressData: Record<string, { kb: number; kh: number }> = {};
                                    allSurah.forEach(surah => {
                                        newProgressData[surah.id] = { kb: kbValue, kh: khValue };
                                    });
                                    setProgressData(newProgressData);

                                    // Clear inputs
                                    kbInput.value = '';
                                    khInput.value = '';

                                    toast({
                                        variant: "success",
                                        title: "Berhasil",
                                        description: "Nilai berhasil diterapkan ke semua surah"
                                    });
                                }}
                                className="w-full"
                            >
                                Terapkan ke Semua Surah
                            </Button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                            * Nilai akan diterapkan ke semua surah yang aktif untuk santri ini
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Juz Selector */}
            {availableJuz.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {availableJuz.map(juz => (
                        <Button
                            key={juz}
                            size="sm"
                            variant={selectedJuz === juz ? 'default' : 'outline'}
                            onClick={() => setSelectedJuz(juz)}
                        >
                            Juz {juz}
                        </Button>
                    ))}
                </div>
            )}

            {/* Surah List for Selected Juz */}
            {selectedJuz && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Juz {selectedJuz}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {currentJuzSurah.length === 0 && (
                            <p className="text-sm text-gray-500">Tidak ada surah tersedia untuk Juz ini</p>
                        )}

                        {currentJuzSurah.map(surah => {
                            const isTracked = trackedSurahIds.includes(surah.id);
                            const progress = progressData[surah.id];
                            const isEditing = editingSurahId === surah.id;

                            if (isTracked) {
                                return (
                                    <div key={surah.id} className="border rounded-md p-3 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 flex-1">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1 flex-1 max-w-[200px]">
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="h-7 text-sm"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveSurahName(surah.id);
                                                                if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                        />
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => saveSurahName(surah.id)}>
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={cancelEditing}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group">
                                                        <span className="font-medium text-sm">{surah.nama_surah}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
                                                            onClick={() => startEditing(surah)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 h-6 w-6 p-0"
                                                onClick={() => handleRemoveSurah(surah.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <ScoreInput
                                                label="KB"
                                                value={progress?.kb || 0}
                                                onChange={(val) => handleScoreChange(surah.id, 'kb', val)}
                                                min={10}
                                                max={100}
                                            />
                                            <ScoreInput
                                                label="KH"
                                                value={progress?.kh || 0}
                                                onChange={(val) => handleScoreChange(surah.id, 'kh', val)}
                                                min={10}
                                                max={100}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-500 text-right">
                                            Rata-rata: {((progress?.kb || 0) + (progress?.kh || 0)) / 2}
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={surah.id} className="flex justify-between items-center py-1">
                                        <div className="flex items-center gap-2 flex-1">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1 flex-1 max-w-[200px]">
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="h-7 text-sm"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveSurahName(surah.id);
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                    />
                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => saveSurahName(surah.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={cancelEditing}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <span className="text-sm text-gray-600">{surah.nama_surah}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
                                                        onClick={() => startEditing(surah)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() => handleAddSurah(surah)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Tambah
                                        </Button>
                                    </div>
                                );
                            }
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Export progress data for saving
export function getTahfidzProgressData(progressData: Record<string, { kb: number; kh: number }>) {
    return Object.entries(progressData).map(([surahId, scores]) => ({
        surah_id: surahId,
        kb: scores.kb,
        kh: scores.kh
    }));
}

