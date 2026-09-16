import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tursoClient as db } from '../../lib/turso-client';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Download, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, FileSpreadsheet, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Halaqah, Semester, TeacherAssignment } from '../../types';
import { formatScore, calculateFinalScore } from '../../utils/grading';
import { useToast } from '../../components/ui/use-toast';
import { EmptyState } from '../../components/raport/EmptyState';
import { SkeletonTable } from '../../components/raport/Skeleton';
import { PageHeader } from '../../components/raport/PageHeader';
import { ScoreCell, MiniBarChart } from '../../components/raport/ScoreCell';

interface LegerRow {
    student_id: string;
    student_name: string;
    nis: string;
    halaqah_name: string;
    halaqah_id: string;
    nilai_akhir_akhlak: number;
    nilai_akhir_kedisiplinan: number;
    nilai_akhir_kognitif: number;
    nilai_akhir_total: number;               // dihitung lokal oleh calculateFinalScore
}

type SortConfig = {
    key: keyof LegerRow;
    direction: 'asc' | 'desc';
} | null;

export default function LegerNilai() {
    const { toast } = useToast();
    const { session } = useAuth();
    const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isInitialized, setIsInitialized] = useState(false);

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

    const assignedHalaqahIds = teacherAssignments?.map(a => a.halaqah_id) || [];

    const { data: semesterData } = useQuery({
        queryKey: ['active_semester'],
        queryFn: async () => {
            const { data } = await db.from('semesters').select('*, academic_year:academic_years(*)').eq('is_active', true).single();
            return data as Semester & { academic_year: any };
        }
    });

    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah', assignedHalaqahIds],
        queryFn: async () => {
            let query = db
                .from('halaqah')
                .select('*')
                .eq('is_active', true);

            if (teacherAssignments && teacherAssignments.length > 0 && assignedHalaqahIds.length > 0) {
                query = query.in('id', assignedHalaqahIds);
            }

            const { data } = await query.order('nama');
            return data as Halaqah[];
        }
    });

    useEffect(() => {
        if (!isInitialized && halaqahList && teacherAssignments && teacherAssignments.length > 0) {
            if (!selectedHalaqahId && halaqahList.length > 0) {
                setSelectedHalaqahId(halaqahList[0].id);
            }
            setIsInitialized(true);
        }
    }, [halaqahList, teacherAssignments, selectedHalaqahId, isInitialized]);

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await db.from('settings_lembaga').select('*').single();
            return data;
        }
    });

    const { data: legerData, isLoading } = useQuery({
        queryKey: ['leger', selectedHalaqahId, semesterData?.id, assignedHalaqahIds],
        enabled: !!semesterData?.id,
        queryFn: async () => {
            const { data: rc, error } = await db
                .from('report_cards')
                .select('*')
                .eq('semester_id', semesterData!.id);

            if (error) throw error;
            if (!rc) return [];

            // Fetch students
            const studentIds = rc.map((r: any) => r.student_id);
            const { data: students } = await db.from('students').select('*').in('id', studentIds);
            
            // Fetch halaqah
            const halaqahIds = students?.map((s: any) => s.halaqah_id).filter(Boolean) || [];
            const { data: halaqahs } = await db.from('halaqah').select('*').in('id', halaqahIds);

            // Stitch them together
            const formattedData = rc
                .map((row: any) => {
                    const student = students?.find((s: any) => s.id === row.student_id);
                    if (student) {
                        student.halaqah_data = halaqahs?.find((h: any) => h.id === student.halaqah_id);
                    }
                    return {
                        ...row,
                        students: student
                    };
                })
                .filter((row: any) => {
                    const student = row.students;
                    if (!student?.is_active) return false;
                    if (selectedHalaqahId) return student.halaqah_id === selectedHalaqahId;
                    if (assignedHalaqahIds.length > 0) return assignedHalaqahIds.includes(student.halaqah_id);
                    return true;
                })
                .map((row: any): LegerRow => ({
                    student_id: row.student_id,
                    student_name: row.students?.nama || '-',
                    nis: row.students?.nis || '-',
                    halaqah_id: row.students?.halaqah_id || '',
                    halaqah_name: row.students?.halaqah_data?.nama || '-',
                    nilai_akhir_akhlak: row.nilai_akhir_akhlak || 0,
                    nilai_akhir_kedisiplinan: row.nilai_akhir_kedisiplinan || 0,
                    nilai_akhir_kognitif: row.nilai_akhir_kognitif || 0,
                    // C-1 + C-2 FIX: weighted calculation (konsisten dengan RaportTemplate)
                    nilai_akhir_total: calculateFinalScore(
                        row.nilai_akhir_akhlak || 0,
                        row.nilai_akhir_kedisiplinan || 0,
                        row.nilai_akhir_kognitif || 0,
                        settings ? {
                            bobot_akhlak: settings.bobot_akhlak,
                            bobot_kedisiplinan: settings.bobot_kedisiplinan,
                            bobot_kognitif: settings.bobot_kognitif
                        } : {
                            bobot_akhlak: 1,
                            bobot_kedisiplinan: 1,
                            bobot_kognitif: 1
                        }
                    )
                }));

            return formattedData;
        }
    });

    // Statistik agregat
    const stats = useMemo(() => {
        if (!legerData || legerData.length === 0) return null;
        const n = legerData.length;
        const avgTotal = legerData.reduce((acc, r) => acc + r.nilai_akhir_total, 0) / n;
        const avgAkh = legerData.reduce((acc, r) => acc + r.nilai_akhir_akhlak, 0) / n;
        const avgKed = legerData.reduce((acc, r) => acc + r.nilai_akhir_kedisiplinan, 0) / n;
        const avgKog = legerData.reduce((acc, r) => acc + r.nilai_akhir_kognitif, 0) / n;
        return {
            total: n,
            avgTotal,
            avgAkh,
            avgKed,
            avgKog,
            // Distribusi grade
            distribution: (legerData || []).reduce((acc: Record<string, number>, r: any) => {
                const grade = settings
                    ? (r.nilai_akhir_total >= (settings.skala_penilaian?.A ?? 85) ? 'A'
                        : r.nilai_akhir_total >= (settings.skala_penilaian?.B ?? 70) ? 'B'
                        : r.nilai_akhir_total >= (settings.skala_penilaian?.C ?? 60) ? 'C'
                        : 'D')
                    : 'D';
                acc[grade] = (acc[grade] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };
    }, [legerData, settings]);

    const sortedData = useMemo(() => {
        if (!legerData) return [];
        if (!sortConfig) return legerData;

        return [...legerData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            const numA = Number(aValue);
            const numB = Number(bValue);
            if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [legerData, sortConfig]);

    const handleSort = (key: keyof LegerRow) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                if (current.direction === 'asc') {
                    return { key, direction: 'desc' };
                }
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key: keyof LegerRow) => {
        if (sortConfig?.key !== key) {
            return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-ink-400" />;
        }
        return sortConfig.direction === 'asc' ?
            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-emerald-600" /> :
            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-emerald-600" />;
    };

    const handleExport = () => {
        if (!sortedData || sortedData.length === 0) {
            toast({
                title: "Data Kosong",
                description: "Tidak ada data untuk diexport",
                variant: "destructive"
            });
            return;
        }

        const headers = [
            "No", "Nama Santri", "NIS", "Halaqah",
            "Nilai Akhlak", "Nilai Kedisiplinan", "Nilai Kognitif",
            "Nilai Akhir", "Predikat"
        ];

        const rows = sortedData.map((row, index) => [
            index + 1,
            `"${row.student_name}"`,
            `"${row.nis}"`,
            `"${row.halaqah_name || '-'}"`,
            formatScore(row.nilai_akhir_akhlak),
            formatScore(row.nilai_akhir_kedisiplinan),
            formatScore(row.nilai_akhir_kognitif),
            formatScore(row.nilai_akhir_total),
            settings ? (() => {
                const scale = settings.skala_penilaian;
                if (row.nilai_akhir_total >= (scale?.A ?? 85)) return 'A';
                if (row.nilai_akhir_total >= (scale?.B ?? 70)) return 'B';
                if (row.nilai_akhir_total >= (scale?.C ?? 60)) return 'C';
                return 'D';
            })() : '-'
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Leger_Nilai_${semesterData?.academic_year?.tahun_ajaran}_${semesterData?.nama}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!semesterData) {
        return (
            <div className="space-y-6 animate-fade-in">
                <SkeletonTable rows={5} cols={4} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Leger Nilai"
                description={
                    <span className="flex items-center gap-2">
                        <span>{semesterData.academic_year?.tahun_ajaran} - Semester {semesterData.nama}</span>
                        {stats && (
                            <span className="text-ink-400">·</span>
                        )}
                        {stats && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                {stats.total} siswa
                            </span>
                        )}
                    </span>
                }
                actions={
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        className="gap-2 border-ink-200 hover:bg-ink-50 hover:border-ink-300"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                }
            />

            {/* Statistik ringkas */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="border-ink-200 shadow-card">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">Rata-rata Total</div>
                            <div className="text-2xl font-bold font-mono tabular-nums text-ink-900 mt-1">
                                {stats.avgTotal.toFixed(1)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-ink-200 shadow-card">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">Akhlak</div>
                            <div className="text-2xl font-bold font-mono tabular-nums text-ink-900 mt-1">
                                {stats.avgAkh.toFixed(1)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-ink-200 shadow-card">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">Kedisiplinan</div>
                            <div className="text-2xl font-bold font-mono tabular-nums text-ink-900 mt-1">
                                {stats.avgKed.toFixed(1)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-ink-200 shadow-card">
                        <CardContent className="p-4">
                            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">Kognitif</div>
                            <div className="text-2xl font-bold font-mono tabular-nums text-ink-900 mt-1">
                                {stats.avgKog.toFixed(1)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filter */}
            <Card className="border-ink-200 shadow-card">
                <CardContent className="p-4">
                    <div className="flex items-end gap-4">
                        <div className="space-y-1.5 flex-1 max-w-xs">
                            <Label className="text-xs font-medium text-ink-600 flex items-center gap-1.5">
                                <Filter className="w-3 h-3" />
                                Filter Halaqah
                            </Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus-visible:ring-emerald-500/30 focus-visible:ring-2 transition-colors"
                                value={selectedHalaqahId}
                                onChange={(e) => setSelectedHalaqahId(e.target.value)}
                            >
                                <option value="">— Semua Halaqah —</option>
                                {halaqahList?.map(h => (
                                    <option key={h.id} value={h.id}>{h.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabel */}
            <Card className="border-ink-200 shadow-card overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="p-6">
                            <SkeletonTable rows={6} cols={8} />
                        </div>
                    ) : sortedData.length === 0 ? (
                        <EmptyState
                            icon={<FileSpreadsheet className="w-8 h-8" />}
                            title="Belum ada data nilai"
                            description="Data nilai untuk semester ini belum di-input. Mulai dengan memilih siswa di halaman Input Raport."
                        />
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-ink-50 border-b border-ink-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-ink-700 w-14">No</th>
                                    <th
                                        className="px-4 py-3 font-semibold text-ink-700 cursor-pointer hover:bg-ink-100 transition-colors"
                                        onClick={() => handleSort('student_name')}
                                    >
                                        <div className="flex items-center">
                                            Nama Santri
                                            {getSortIcon('student_name')}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 font-semibold text-ink-700 cursor-pointer hover:bg-ink-100 transition-colors"
                                        onClick={() => handleSort('halaqah_name')}
                                    >
                                        <div className="flex items-center">
                                            Halaqah
                                            {getSortIcon('halaqah_name')}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-ink-700 text-center">Akhlak</th>
                                    <th className="px-4 py-3 font-semibold text-ink-700 text-center">Kedisiplinan</th>
                                    <th className="px-4 py-3 font-semibold text-ink-700 text-center">Kognitif</th>
                                    <th
                                        className="px-4 py-3 font-semibold text-ink-700 text-center cursor-pointer hover:bg-ink-100 transition-colors"
                                        onClick={() => handleSort('nilai_akhir_total')}
                                    >
                                        <div className="flex items-center justify-center">
                                            Nilai Akhir
                                            {getSortIcon('nilai_akhir_total')}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-ink-700 text-center">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {sortedData.map((row, index) => (
                                    <tr key={row.student_id} className="hover:bg-ink-50/50 transition-colors group">
                                        <td className="px-4 py-3 text-ink-500 font-mono tabular-nums">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            {session?.user?.id && (
                                                <Link
                                                    to={teacherAssignments && teacherAssignments.length > 0
                                                        ? `/guru/input?student=${row.student_id}`
                                                        : `/raport/input?student=${row.student_id}`
                                                    }
                                                    className="font-medium text-ink-900 hover:text-emerald-700 group inline-flex items-center gap-1.5 transition-colors"
                                                    title="Buka Input Raport untuk santri ini"
                                                >
                                                    {row.student_name}
                                                    <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            )}
                                            <div className="text-xs text-ink-400 mt-0.5 font-mono">NIS: {row.nis}</div>
                                        </td>
                                        <td className="px-4 py-3 text-ink-600">{row.halaqah_name || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <ScoreCell value={row.nilai_akhir_akhlak} scale={settings?.skala_penilaian} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ScoreCell value={row.nilai_akhir_kedisiplinan} scale={settings?.skala_penilaian} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ScoreCell value={row.nilai_akhir_kognitif} scale={settings?.skala_penilaian} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ScoreCell
                                                value={row.nilai_akhir_total}
                                                showPredikat
                                                scale={settings?.skala_penilaian}
                                                size="lg"
                                                label="Nilai Akhir"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {stats && (
                                                <div className="w-32">
                                                    <MiniBarChart
                                                        data={{
                                                            Akhlak: row.nilai_akhir_akhlak,
                                                            Kedisiplinan: row.nilai_akhir_kedisiplinan,
                                                            Kognitif: row.nilai_akhir_kognitif,
                                                        }}
                                                        scale={settings?.skala_penilaian}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
