import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tursoClient as db } from '../../lib/turso-client';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { useAuth } from '../../hooks/useAuth';
import type { Student, SurahMaster, Halaqah, TeacherAssignment } from '../../types';

interface StudentSurahAssignment {
    student_id: string;
    surah_id: string;
    is_active: boolean;
}

export default function StudentSurahManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<'santri' | 'halaqah'>('santri');
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [selectedHalaqah, setSelectedHalaqah] = useState<string>('');
    const [selectedSurahs, setSelectedSurahs] = useState<Set<string>>(new Set());

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmDesc, setConfirmDesc] = useState('');

    // Fetch teacher assignments (for guru role)
    const { data: teacherAssignments } = useQuery({
        queryKey: ['teacher_assignments', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data, error } = await db
                .from('teacher_assignments')
                .select('*')
                .eq('teacher_id', session!.user!.id)
                .eq('is_active', true);
            if (error) throw error;
            return data as TeacherAssignment[];
        }
    });

    // Get assigned halaqah IDs for filtering
    const assignedHalaqahIds = teacherAssignments?.map(a => a.halaqah_id) || [];

    // Fetch all students (filtered by assigned halaqahs for guru)
    const { data: students } = useQuery({
        queryKey: ['students', assignedHalaqahIds],
        queryFn: async () => {
            let query = db
                .from('students')
                .select('*')
                .eq('is_active', true);

            // Filter by assigned halaqahs if user is guru
            if (teacherAssignments && teacherAssignments.length > 0 && assignedHalaqahIds.length > 0) {
                query = query.in('halaqah_id', assignedHalaqahIds);
            }

            const { data, error } = await query.order('nama');
            if (error) throw error;
            return data as Student[];
        }
    });

    // Fetch all halaqah (filtered by assignments for guru)
    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah', assignedHalaqahIds],
        queryFn: async () => {
            let query = db
                .from('halaqah')
                .select('*')
                .eq('is_active', true);

            // Filter by assigned halaqahs if user is guru
            if (teacherAssignments && teacherAssignments.length > 0 && assignedHalaqahIds.length > 0) {
                query = query.in('id', assignedHalaqahIds);
            }

            const { data, error } = await query.order('nama');
            if (error) throw error;
            return data as Halaqah[];
        }
    });

    // Fetch all surah
    const { data: allSurah } = useQuery({
        queryKey: ['surah_master'],
        queryFn: async () => {
            const { data, error } = await db
                .from('surah_master')
                .select('*')
                .eq('is_active', true)
                .order('juz, urutan_dalam_juz');
            if (error) throw error;
            return data as SurahMaster[];
        }
    });

    // Fetch student's assigned surah
    const { data: assignedSurah, isLoading: loadingAssignments } = useQuery({
        queryKey: ['student_surah_assignment', selectedStudent],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const { data, error } = await db
                .from('student_surah_assignment')
                .select('*')
                .eq('student_id', selectedStudent);
            if (error) throw error;
            return data as StudentSurahAssignment[];
        },
        enabled: !!selectedStudent && activeTab === 'santri'
    });

    // Fetch halaqah active surahs to initialize checkboxes
    const { data: halaqahActiveSurahs } = useQuery({
        queryKey: ['halaqah_active_surahs', selectedHalaqah],
        queryFn: async () => {
            if (!selectedHalaqah) return [];
            
            // Get all students in this halaqah
            const { data: students } = await db.from('students').select('id').eq('halaqah_id', selectedHalaqah).eq('is_active', true);
            if (!students || students.length === 0) return [];
            const studentIds = students.map(s => s.id);
            
            // Get assignments for these students
            const { data: assignments } = await db.from('student_surah_assignment')
                .select('surah_id, is_active')
                .in('student_id', studentIds);
                
            // Consider a surah "active" in halaqah if it is active for AT LEAST ONE student
            const activeSet = new Set<string>();
            assignments?.forEach((a: any) => {
                if (a.is_active) activeSet.add(a.surah_id);
            });
            
            return Array.from(activeSet);
        },
        enabled: !!selectedHalaqah && activeTab === 'halaqah'
    });

    useEffect(() => {
        if (activeTab === 'halaqah' && halaqahActiveSurahs) {
            setSelectedSurahs(new Set(halaqahActiveSurahs));
        }
    }, [halaqahActiveSurahs, activeTab]);

    // Toggle individual surah (Per Santri)
    const toggleSurahMutation = useMutation({
        mutationFn: async ({ surahId, isActive }: { surahId: string; isActive: boolean }) => {
            if (!selectedStudent) return;

            if (isActive) {
                // Activate surah
                const { error } = await db
                    .from('student_surah_assignment')
                    .upsert({
                        student_id: selectedStudent,
                        surah_id: surahId,
                        is_active: true
                    }, { onConflict: 'student_id, surah_id' });

                if (error) throw error;
            } else {
                // Deactivate surah
                const { error } = await db
                    .from('student_surah_assignment')
                    .update({ is_active: false })
                    .eq('student_id', selectedStudent)
                    .eq('surah_id', surahId);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student_surah_assignment', selectedStudent] });
        },
        onError: (error) => {
            console.error('Toggle mutation error:', error);
            toast({
                variant: "destructive",
                title: "Gagal mengubah status surah",
                description: (error as Error).message
            });
        }
    });

    // Bulk assign/unassign Juz (Per Santri)
    const bulkJuzMutation = useMutation({
        mutationFn: async ({ juz, assign }: { juz: number; assign: boolean }) => {
            if (!selectedStudent) return;

            const juzSurahs = allSurah?.filter(s => s.juz === juz) || [];
            if (juzSurahs.length === 0) return;

            if (assign) {
                const upsertData = juzSurahs.map(s => ({
                    student_id: selectedStudent,
                    surah_id: s.id,
                    is_active: true
                }));
                const { error } = await db
                    .from('student_surah_assignment')
                    .upsert(upsertData, { onConflict: 'student_id, surah_id' });
                if (error) throw error;
            } else {
                const surahIds = juzSurahs.map(s => s.id);
                const { error } = await db
                    .from('student_surah_assignment')
                    .update({ is_active: false })
                    .eq('student_id', selectedStudent)
                    .in('surah_id', surahIds);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student_surah_assignment', selectedStudent] });
            toast({
                variant: "success",
                title: "Berhasil",
                description: "Juz berhasil diupdate.",
                duration: 500
            });
        },
        onError: (error) => {
            console.error('Bulk Juz mutation error:', error);
            toast({
                variant: "destructive",
                title: "Gagal mengubah status Juz",
                description: (error as Error).message
            });
        }
    });

    // Bulk Halaqah Mutation
    const bulkHalaqahMutation = useMutation({
        mutationFn: async ({ surahIds, isActive }: { surahIds: string[], isActive: boolean }) => {
            if (!selectedHalaqah) return;

            // 1. Get all students in this halaqah
            const { data: studentsInHalaqah, error: studentError } = await db
                .from('students')
                .select('id')
                .eq('halaqah_id', selectedHalaqah)
                .eq('is_active', true);

            if (studentError) throw studentError;
            if (!studentsInHalaqah || studentsInHalaqah.length === 0) {
                throw new Error("Tidak ada santri aktif di halaqah ini.");
            }

            const studentIds = studentsInHalaqah.map(s => s.id);

            // 2. Prepare upsert data
            if (isActive) {
                const upsertData = [];
                for (const sId of studentIds) {
                    for (const surahId of surahIds) {
                        upsertData.push({
                            student_id: sId,
                            surah_id: surahId,
                            is_active: true
                        });
                    }
                }

                // Batch upsert might be too large, but let's try. 
                // db handles reasonably large batches.
                const { error } = await db
                    .from('student_surah_assignment')
                    .upsert(upsertData, { onConflict: 'student_id, surah_id' });

                if (error) throw error;

            } else {
                // Deactivate
                const { error } = await db
                    .from('student_surah_assignment')
                    .update({ is_active: false })
                    .in('student_id', studentIds)
                    .in('surah_id', surahIds);

                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['student_surah_assignment'] });
            queryClient.invalidateQueries({ queryKey: ['halaqah_active_surahs'] });
            toast({
                variant: "success",
                title: "Berhasil",
                description: `${variables.surahIds.length} surah berhasil ${variables.isActive ? 'diaktifkan' : 'dinonaktifkan'} untuk semua santri di halaqah ini.`,
                duration: 500
            });
        },
        onError: (error) => {
            console.error('Bulk Halaqah mutation error:', error);
            toast({
                variant: "destructive",
                title: "Gagal",
                description: (error as Error).message
            });
        }
    });


    const handleBulkAction = (juz: number, assign: boolean) => {
        if (assign) {
            bulkJuzMutation.mutate({ juz, assign: true });
        } else {
            setConfirmTitle("Konfirmasi Nonaktifkan");
            setConfirmDesc(`Apakah Anda yakin ingin menonaktifkan semua surah di Juz ${juz} untuk santri ini?`);
            setConfirmAction(() => () => bulkJuzMutation.mutate({ juz, assign: false }));
            setConfirmOpen(true);
        }
    };

    const isSurahActive = (surahId: string) => {
        return assignedSurah?.some(a => a.surah_id === surahId && a.is_active) || false;
    };

    const isJuzFullyAssigned = (juz: number) => {
        const juzSurah = allSurah?.filter(s => s.juz === juz) || [];
        return juzSurah.every(s => isSurahActive(s.id));
    };

    const toggleSurahSelection = (surahId: string) => {
        const isActive = !selectedSurahs.has(surahId);
        
        // Optimistic update
        const newSet = new Set(selectedSurahs);
        if (isActive) newSet.add(surahId);
        else newSet.delete(surahId);
        setSelectedSurahs(newSet);

        // Mutate
        bulkHalaqahMutation.mutate({ surahIds: [surahId], isActive });
    };

    const toggleJuzSelection = (juz: number) => {
        const juzSurahs = groupedByJuz?.[juz] || [];
        const isActive = !juzSurahs.every(s => selectedSurahs.has(s.id));
        
        // Optimistic update
        const newSet = new Set(selectedSurahs);
        if (isActive) {
            juzSurahs.forEach(s => newSet.add(s.id));
        } else {
            juzSurahs.forEach(s => newSet.delete(s.id));
        }
        setSelectedSurahs(newSet);

        // Mutate
        bulkHalaqahMutation.mutate({ surahIds: juzSurahs.map(s => s.id), isActive });
    };

    const groupedByJuz = allSurah?.reduce((acc, surah) => {
        if (!acc[surah.juz]) acc[surah.juz] = [];
        acc[surah.juz].push(surah);
        return acc;
    }, {} as Record<number, SurahMaster[]>);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pengaturan Surah Tahfidz</h1>
                <p className="text-gray-500">Kelola surah aktif per santri atau per halaqah</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-slate-200">
                <button
                    className={`pb-2.5 px-4 text-sm font-medium transition-colors ${activeTab === 'santri' ? 'border-b-2 border-emerald-600 font-semibold text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setActiveTab('santri'); setSelectedHalaqah(''); setSelectedSurahs(new Set()); }}
                >
                    Per Santri
                </button>
                <button
                    className={`pb-2.5 px-4 text-sm font-medium transition-colors ${activeTab === 'halaqah' ? 'border-b-2 border-emerald-600 font-semibold text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => { setActiveTab('halaqah'); setSelectedStudent(''); }}
                >
                    Per Halaqah
                </button>
            </div>

            {/* Content per Tab */}
            {activeTab === 'santri' ? (
                <>
                    {/* Halaqah Filter */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Filter Halaqah
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                value={selectedHalaqah}
                                onChange={(e) => {
                                    setSelectedHalaqah(e.target.value);
                                    setSelectedStudent(''); // Reset student selection when halaqah changes
                                }}
                            >
                                <option value="">-- Semua Halaqah --</option>
                                {halaqahList?.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.nama}
                                    </option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>

                    {/* Student Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Pilih Santri
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                            >
                                <option value="">-- Pilih Santri --</option>
                                {students
                                    ?.filter(s => !selectedHalaqah || s.halaqah_id === selectedHalaqah)
                                    .map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nama} ({s.nis})
                                        </option>
                                    ))}
                            </select>
                        </CardContent>
                    </Card>

                    {/* Surah Assignment */}
                    {selectedStudent && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Daftar Surah</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingAssignments ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.keys(groupedByJuz || {}).map(Number).sort((a,b) => b - a).map((juz) => (
                                            <div key={juz} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="font-semibold text-lg">Juz {juz}</h3>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant={isJuzFullyAssigned(juz) ? "default" : "outline"}
                                                            onClick={() => handleBulkAction(juz, true)}
                                                            disabled={bulkJuzMutation.isPending}
                                                        >
                                                            Aktifkan Semua
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleBulkAction(juz, false)}
                                                            disabled={bulkJuzMutation.isPending}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            Nonaktifkan Semua
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {groupedByJuz?.[juz]?.map((surah) => (
                                                        <div key={surah.id} className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-gray-50 bg-white">
                                                            <input
                                                                type="checkbox"
                                                                id={surah.id}
                                                                checked={isSurahActive(surah.id)}
                                                                onChange={(e) => {
                                                                    toggleSurahMutation.mutate({
                                                                        surahId: surah.id,
                                                                        isActive: e.target.checked
                                                                    });
                                                                }}
                                                                className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 min-w-[20px]"
                                                            />
                                                            <label
                                                                htmlFor={surah.id}
                                                                className="cursor-pointer flex-1 flex flex-col min-w-0"
                                                            >
                                                                <span className="text-sm font-semibold">{surah.nomor_surah}. {surah.nama_surah}</span>
                                                                {surah.nama_arab && (
                                                                    <span className="text-lg font-arabic text-emerald-800" dir="rtl">{surah.nama_arab}</span>
                                                                )}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <>
                    {/* Halaqah Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Pilih Halaqah
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                value={selectedHalaqah}
                                onChange={(e) => setSelectedHalaqah(e.target.value)}
                            >
                                <option value="">-- Pilih Halaqah --</option>
                                {halaqahList?.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.nama}
                                    </option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>

                    {/* Surah Selection for Bulk Action */}
                    {selectedHalaqah && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Pilih Surah untuk Aksi Massal</CardTitle>
                                {bulkHalaqahMutation.isPending && (
                                    <div className="flex items-center text-sm text-emerald-600 gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Menyimpan...
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {Object.keys(groupedByJuz || {}).map(Number).sort((a,b) => b - a).map((juz) => (
                                        <div key={juz} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-lg">Juz {juz}</h3>
                                                <div className="flex items-center space-x-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                    <input
                                                        type="checkbox"
                                                        id={`select-all-juz-${juz}`}
                                                        checked={groupedByJuz?.[juz]?.every(s => selectedSurahs.has(s.id)) || false}
                                                        onChange={() => toggleJuzSelection(juz)}
                                                        className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <label
                                                        htmlFor={`select-all-juz-${juz}`}
                                                        className="text-sm font-medium cursor-pointer text-gray-700"
                                                    >
                                                        Pilih Semua Juz {juz}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {groupedByJuz?.[juz]?.map((surah) => (
                                                    <div key={surah.id} className={`flex items-center space-x-3 p-3 border rounded-xl hover:bg-gray-50 bg-white ${selectedSurahs.has(surah.id) ? 'bg-blue-50/50 border-blue-200' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            id={`bulk-${surah.id}`}
                                                            checked={selectedSurahs.has(surah.id)}
                                                            onChange={() => toggleSurahSelection(surah.id)}
                                                            className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 min-w-[20px]"
                                                        />
                                                        <label
                                                            htmlFor={`bulk-${surah.id}`}
                                                            className="cursor-pointer flex-1 flex flex-col min-w-0"
                                                        >
                                                            <span className="text-sm font-semibold">{surah.nomor_surah}. {surah.nama_surah}</span>
                                                            {surah.nama_arab && (
                                                                <span className="text-lg font-arabic text-emerald-800" dir="rtl">{surah.nama_arab}</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description={confirmDesc}
                onConfirm={confirmAction}
                variant="destructive"
            />
        </div>
    );
}

