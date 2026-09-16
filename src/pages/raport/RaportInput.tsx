import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tursoClient as db } from '../../lib/turso-client';
import type { Student, SettingsLembaga, ReportCard, Semester, TeacherAssignment } from '../../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { EmptyState } from '../../components/raport/EmptyState';
import { showAlert } from '../../utils/sweetAlert';
import { ScoreInput } from '../../components/raport/ScoreInput';
import { TahfidzInput } from '../../components/raport/TahfidzInput';
import { calculateAverage, calculateFinalScore, calculateKognitifScore, formatScore, getPredikat } from '../../utils/grading';
import { Save, Printer, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useAuth } from '../../hooks/useAuth';

// Default structure for new report card (skala standar 85 untuk menghindari floor-value bias)
const defaultAkhlak: Record<string, number> = {
    "Adab Kepada Guru": 85,
    "Adab Kepada Teman": 85,
    "Adab Terhadap Lingkungan": 85
};

// Helper function to create kedisiplinan based on shift
const createKedisiplinan = (shift?: 'Siang' | 'Sore' | 'Malam' | 'Malam' | null): Record<string, number> => {
    const base: Record<string, number> = {
        "Kehadiran": 100, // Default 100, will be calculated based on attendance
        "Ketepatan Waktu": 100, // Manual input, default 100
        "Tilawah & Hafalan Mandiri": 85,
        "Kebersihan": 85,
        "Kerapian": 85
    };

    // Only add Shalat Berjamaah if NOT Siang shift
    if (shift !== 'Siang') {
        base["Shalat Berjamaah"] = 85;
    }

    return base;
};

const defaultKognitif = {
    "Tahfidz": { "Juz 30": 85, "Juz 29": 85 }, // Default score standard
    "Tahsin": {},
};

export default function RaportInput() {
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
    const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>('');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<'Tahfidz' | 'Tahsin' | 'Keduanya' | ''>('');

    // Form State
    const [akhlak, setAkhlak] = useState<Record<string, number>>(defaultAkhlak);
    const [kedisiplinan, setKedisiplinan] = useState<Record<string, number>>({});

    // Tahfidz State
    const [tahfidzScore, setTahfidzScore] = useState(85);
    const [tahfidzProgress, setTahfidzProgress] = useState<Record<string, { kb: number; kh: number }>>({});

    const [tahsin, setTahsin] = useState<Record<string, number>>(defaultKognitif.Tahsin);
    const [uasTulis, setUasTulis] = useState(85);
    const [uasLisan, setUasLisan] = useState(85);
    const [catatan, setCatatan] = useState('');

    // Attendance State
    const [sakit, setSakit] = useState<number | string>(0);
    const [izin, setIzin] = useState<number | string>(0);
    const [alpa, setAlpa] = useState<number | string>(0);
    const [effectiveDays, setEffectiveDays] = useState<number | string>(120); // Default 120 days

    // Track unsaved changes
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initialFormState, setInitialFormState] = useState<string>('');

    // Scroll State
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            const container = document.getElementById('main-content');
            if (!container) return; // Should fallback to window if not found? But layout is fixed.

            const position = container.scrollTop;
            const windowHeight = container.clientHeight;
            const fullHeight = container.scrollHeight;

            // Show Top arrow if scrolled down > 300px
            setShowScrollTop(position > 300);
            // Show Bottom arrow if not yet at bottom (buffer 100px)
            if (fullHeight > windowHeight) {
                setShowScrollBottom(position < fullHeight - windowHeight - 100);
            } else {
                setShowScrollBottom(false);
            }
        };

        const container = document.getElementById('main-content');
        if (container) {
            container.addEventListener('scroll', handleScroll);
            handleScroll(); // Init check
            return () => container.removeEventListener('scroll', handleScroll);
        } else {
            // Fallback to window just in case
            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, []);


    // Get URL parameters
    const [searchParams] = useSearchParams();

    // Initialize unsaved changes hook
    useUnsavedChangesWarning(hasUnsavedChanges);

    // Fetch Data
    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data } = await db
                .from('students')
                .select('*, halaqah_data:halaqah(*, shift)')
                .eq('is_active', true)
                .order('nama');
            return data as Student[];
        }
    });

    // Fetch Global Tahsin Items (Fallback)
    const { data: globalTahsinItems } = useQuery({
        queryKey: ['tahsin_master_global'],
        queryFn: async () => {
            const { data } = await db
                .from('tahsin_master')
                .select('nama_item')
                .eq('is_active', true)
                .order('urutan');
            return data?.map(i => i.nama_item) || [];
        }
    });

    const { data: activeSemesterData } = useQuery({
        queryKey: ['active_semester'],
        queryFn: async () => {
            const { data } = await db.from('semesters').select('*, academic_year:academic_years(*)').eq('is_active', true).single();
            return data as Semester & { academic_year: any };
        }
    });

    // Fetch teacher assignments for current user (if guru role)
    const { data: teacherAssignments } = useQuery({
        queryKey: ['teacher_assignments', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data, error } = await db
                .from('teacher_assignments')
                .select(`
                    *,
                    halaqah:halaqah!halaqah_id(id, nama, shift)
                `)
                .eq('teacher_id', session!.user!.id)
                .eq('is_active', true);
            if (error) throw error;
            return data as (TeacherAssignment & { halaqah: { id: string; nama: string; shift?: 'Siang' | 'Sore' | 'Malam' } })[];
        }
    });

    // Fetch all halaqahs for filter (Admin/Global usage)
    const { data: allHalaqahs } = useQuery({
        queryKey: ['all_halaqahs_filter'],
        queryFn: async () => {
            const { data } = await db.from('halaqah').select('*').eq('is_active', true).order('nama');
            return data as { id: string; nama: string }[];
        }
    });

    // Get unique halaqahs and subjects from assignments
    const assignedHalaqahs = teacherAssignments?.map(a => a.halaqah).filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) || [];
    const assignedSubjects = teacherAssignments?.map(a => a.subject).filter((v, i, a) => a.indexOf(v) === i) || [];

    useEffect(() => {
        if (activeSemesterData) setActiveSemester(activeSemesterData);
    }, [activeSemesterData]);

    // Auto-select student from URL parameter
    useEffect(() => {
        const studentIdFromUrl = searchParams.get('student');
        if (studentIdFromUrl && students) {
            const student = students.find(s => s.id === studentIdFromUrl);
            if (student && selectedStudentId !== studentIdFromUrl) {
                setSelectedStudentId(studentIdFromUrl);
            }
        }
    }, [searchParams, students, selectedStudentId]);

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await db.from('settings_lembaga').select('*').single();
            return data as SettingsLembaga;
        }
    });

    // Fetch existing report
    const { data: existingReport } = useQuery({
        queryKey: ['report_card', selectedStudentId, activeSemester?.id],
        enabled: !!selectedStudentId && !!activeSemester?.id,
        queryFn: async () => {
            const { data } = await db
                .from('report_cards')
                .select('*')
                .eq('student_id', selectedStudentId)
                .eq('semester_id', activeSemester!.id)
                .single();
            return data as ReportCard;
        }
    });

    // Load existing data
    useEffect(() => {
        if (selectedStudentId && activeSemester && students) {
            const draftKey = `draft_raport_${selectedStudentId}_${activeSemester.id}`;
            const student = students.find(s => s.id === selectedStudentId);

            // Determine active Tahsin items
            // Priority: Halaqah Config -> Global Fallback
            // Filter out obsolete items like "Panjang Pendek"
            const rawTahsinItems = (student?.halaqah_data?.tahsin_items && student.halaqah_data.tahsin_items.length > 0)
                ? student.halaqah_data.tahsin_items
                : (globalTahsinItems || []);

            const activeTahsinItems = rawTahsinItems.filter(item => item !== 'Panjang Pendek');

            if (existingReport) {
                // Load from saved report
                // Load from saved report with migration logic
                // Ensure legacy items are removed and renamed items are mapped

                // Migrate Akhlak
                const savedAkhlak = existingReport.akhlak || {};
                const newAkhlak = { ...defaultAkhlak };
                Object.keys(savedAkhlak).forEach(k => {
                    // Filter out removed items
                    if (k === 'Adab Kepada Allah & Rasul' || k === 'Adab Kepada Orang Tua') return;
                    // Map keys if needed (Adab Terhadap... -> Adab Kepada...)
                    // The previous default had "Adab Terhadap Guru", new has "Adab Kepada Guru"
                    // We should normalize.
                    let normalizedKey = k;
                    if (k === 'Adab Terhadap Guru') normalizedKey = 'Adab Kepada Guru';
                    if (k === 'Adab Terhadap Teman') normalizedKey = 'Adab Kepada Teman';

                    if (normalizedKey in newAkhlak) {
                        newAkhlak[normalizedKey] = savedAkhlak[k];
                    }
                });
                setAkhlak(newAkhlak);

                // Migrate Kedisiplinan with shift awareness
                const shiftToCheck = student?.halaqah_data?.shift || student?.shift;
                const savedKedisiplinan = existingReport.kedisiplinan || {};
                const newKedisiplinan = createKedisiplinan(shiftToCheck);

                // Migrate old data: if "Ketepatan Waktu" doesn't exist, copy from "Kehadiran"
                if (savedKedisiplinan["Kehadiran"] !== undefined && savedKedisiplinan["Ketepatan Waktu"] === undefined) {
                    savedKedisiplinan["Ketepatan Waktu"] = savedKedisiplinan["Kehadiran"];
                }

                Object.keys(savedKedisiplinan).forEach(k => {
                    // Rename logic
                    if (k === 'Tilawah Mandiri') {
                        newKedisiplinan['Tilawah & Hafalan Mandiri'] = savedKedisiplinan[k];
                        return;
                    }
                    if (k === 'Sholat Berjamaah') {
                        // Only set if not Siang shift
                        if (shiftToCheck !== 'Siang') {
                            newKedisiplinan['Shalat Berjamaah'] = savedKedisiplinan[k];
                        }
                        return;
                    }
                    if (k === 'Shalat Berjamaah') {
                        // Only set if not Siang shift
                        if (shiftToCheck !== 'Siang') {
                            newKedisiplinan['Shalat Berjamaah'] = savedKedisiplinan[k];
                        }
                        return;
                    }

                    if (k in newKedisiplinan) {
                        newKedisiplinan[k] = savedKedisiplinan[k];
                    }
                });
                setKedisiplinan(newKedisiplinan);

                // Merge existing scores with active items
                // If an item is active but has no score, set default 10
                // If an item has score but is no longer active, keep it (or filter it? User said "only active group appears")
                // Let's filter to show ONLY active items, but preserve scores if they exist.

                const savedTahsin = existingReport.kognitif?.Tahsin || {};
                const newTahsin: Record<string, number> = {};

                activeTahsinItems.forEach(item => {
                    newTahsin[item] = savedTahsin[item] || 10;
                });

                setTahsin(newTahsin);
                setUasTulis(existingReport.uas_tulis || 10);
                setUasLisan(existingReport.uas_lisan || 10);
                setCatatan(existingReport.catatan || '');

                // Load attendance
                setSakit(existingReport.sakit || 0);
                setIzin(existingReport.izin || 0);
                setAlpa(existingReport.alpa || 0);

                // Load effective days
                if (existingReport.jumlah_hari_efektif) {
                    setEffectiveDays(existingReport.jumlah_hari_efektif);
                } else if (activeSemester.jumlah_hari_efektif) {
                    setEffectiveDays(activeSemester.jumlah_hari_efektif);
                }

                // Clear draft
                localStorage.removeItem(draftKey);
            } else {
                // Try to load from draft
                const savedDraft = localStorage.getItem(draftKey);
                if (savedDraft) {
                    try {
                        const draft = JSON.parse(savedDraft);
                        setAkhlak(draft.akhlak || defaultAkhlak);

                        // Use shift-aware kedisiplinan
                        const shiftToCheck = student?.halaqah_data?.shift || student?.shift;
                        setKedisiplinan(draft.kedisiplinan || createKedisiplinan(shiftToCheck));

                        // Apply same logic to draft
                        const draftTahsin = draft.tahsin || {};
                        const newTahsin: Record<string, number> = {};
                        activeTahsinItems.forEach(item => {
                            newTahsin[item] = draftTahsin[item] || 10;
                        });
                        setTahsin(newTahsin);

                        setUasTulis(draft.uasTulis || 10);
                        setUasLisan(draft.uasLisan || 10);
                        setCatatan(draft.catatan || '');

                        setSakit(draft.sakit || 0);
                        setIzin(draft.izin || 0);
                        setAlpa(draft.alpa || 0);
                        setEffectiveDays(draft.effectiveDays || (activeSemester.jumlah_hari_efektif || 120));
                    } catch (e) {
                        resetForm(activeTahsinItems);
                    }
                } else {
                    resetForm(activeTahsinItems);
                }
            }
        }
    }, [existingReport, selectedStudentId, activeSemester, students, globalTahsinItems]);

    const resetForm = (items: string[] = []) => {
        setAkhlak(defaultAkhlak);

        // Use shift-aware kedisiplinan
        const shiftToCheck = selectedStudent?.halaqah_data?.shift || selectedStudent?.shift;
        setKedisiplinan(createKedisiplinan(shiftToCheck));

        const initialTahsin: Record<string, number> = {};
        items.forEach(item => {
            initialTahsin[item] = 10;
        });
        setTahsin(initialTahsin);

        setUasTulis(10);
        setUasLisan(10);
        setCatatan('');
        setTahfidzScore(10);
        setTahfidzProgress({});
        setSakit(0);
        setIzin(0);
        setAlpa(0);
        setEffectiveDays(activeSemester?.jumlah_hari_efektif || 120);
    };

    // Track form changes
    useEffect(() => {
        if (selectedStudentId && activeSemester) {
            const currentState = JSON.stringify({
                akhlak,
                kedisiplinan,
                tahsin,
                uasTulis,
                uasLisan,
                catatan,
                tahfidzProgress,
                sakit,
                izin,
                alpa,
                effectiveDays
            });

            if (initialFormState === '') {
                // First load, set initial state
                setInitialFormState(currentState);
                setHasUnsavedChanges(false);
            } else {
                // Check if changed
                setHasUnsavedChanges(currentState !== initialFormState);
            }
        }
    }, [akhlak, kedisiplinan, tahsin, uasTulis, uasLisan, catatan, tahfidzProgress, sakit, izin, alpa, effectiveDays, initialFormState, selectedStudentId, activeSemester]);

    // Calculate Kehadiran Score automatically with fallback for effective days
    useEffect(() => {
        const rawEff = typeof effectiveDays === 'string' ? parseInt(effectiveDays) || 0 : effectiveDays;
        const effDays = rawEff > 0 ? rawEff : 120; // Fallback ke 120 hari jika belum diset lembaga
        const s = typeof sakit === 'string' ? parseInt(sakit) || 0 : sakit;
        const i = typeof izin === 'string' ? parseInt(izin) || 0 : izin;
        const a = typeof alpa === 'string' ? parseInt(alpa) || 0 : alpa;

        // Formula Pengurangan: Sakit -1/hari, Izin -2/hari, Alpa -4/hari
        const deduction = (s * 1) + (i * 2) + (a * 4);
        const score = Math.max(10, Math.min(100, 100 - deduction)); // Minimum 10, Maksimum 100

        // Update kedisiplinan 'Kehadiran' jika berbeda
        if (kedisiplinan["Kehadiran"] !== score) {
            setKedisiplinan(prev => ({ ...prev, "Kehadiran": score }));
        }
    }, [sakit, izin, alpa, effectiveDays]);

    // Auto-save to localStorage
    useEffect(() => {
        if (selectedStudentId && activeSemester) {
            const draftKey = `draft_raport_${selectedStudentId}_${activeSemester.id}`;
            const draft = {
                akhlak,
                kedisiplinan,
                tahsin,
                uasTulis,
                uasLisan,
                catatan,
                sakit,
                izin,
                alpa,
                effectiveDays,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
        }
    }, [akhlak, kedisiplinan, tahsin, uasTulis, uasLisan, catatan, sakit, izin, alpa, effectiveDays, selectedStudentId, activeSemester]);

    const selectedStudent = students?.find(s => s.id === selectedStudentId);
    // Priority: Halaqah Shift > Student Shift
    const shiftToCheck = selectedStudent?.halaqah_data?.shift || selectedStudent?.shift;
    const isShiftSiang = shiftToCheck === 'Siang';

    // Update kedisiplinan when student changes to ensure correct shift-based items
    useEffect(() => {
        if (selectedStudent && Object.keys(kedisiplinan).length > 0) {
            const shiftToCheck = selectedStudent.halaqah_data?.shift || selectedStudent.shift;
            const shouldHaveShalatBerjamaah = shiftToCheck !== 'Siang';
            const currentlyHasShalatBerjamaah = 'Shalat Berjamaah' in kedisiplinan;

            // Only update if there's a mismatch
            if (shouldHaveShalatBerjamaah !== currentlyHasShalatBerjamaah) {
                setKedisiplinan(prev => {
                    const next = { ...prev };
                    if (shouldHaveShalatBerjamaah) {
                        // Add Shalat Berjamaah if missing
                        next['Shalat Berjamaah'] = 10;
                    } else {
                        // Remove Shalat Berjamaah if present
                        delete next['Shalat Berjamaah'];
                        delete next['Sholat Berjamaah']; // Legacy
                    }
                    return next;
                });
            }
        }
    }, [selectedStudent?.id, selectedStudent?.halaqah_data?.shift, selectedStudent?.shift]);

    // Calculations
    const akhlakAvg = calculateAverage(akhlak);

    const kedisiplinanForCalc = isShiftSiang
        ? Object.fromEntries(Object.entries(kedisiplinan).filter(([key]) => key !== "Sholat Berjamaah"))
        : kedisiplinan;
    const kedisiplinanAvg = calculateAverage(kedisiplinanForCalc);

    const tahsinAvg = calculateAverage(tahsin);

    // Calculate Kognitif Score (Dynamic Divisor)
    const kognitifScore = calculateKognitifScore(
        { tahfidzScore, tahsinAvg, uasTulis, uasLisan },
        { showUasLisan: settings?.show_uas_lisan !== false }
    );

    const finalScore = calculateFinalScore(
        akhlakAvg,
        kedisiplinanAvg,
        kognitifScore,
        settings ? {
            bobot_akhlak: settings.bobot_akhlak,
            bobot_kedisiplinan: settings.bobot_kedisiplinan,
            bobot_kognitif: settings.bobot_kognitif,
        } : null
    );
    const predikat = settings ? getPredikat(finalScore, settings.skala_penilaian) : getPredikat(finalScore);

    // Cleanup obsolete items from tahsin state (e.g., "Panjang Pendek")
    useEffect(() => {
        if ('Panjang Pendek' in tahsin || 'Panjang-Pendek' in tahsin) {
            setTahsin(prev => {
                const cleaned = { ...prev };
                delete cleaned['Panjang Pendek'];
                delete cleaned['Panjang-Pendek'];
                return cleaned;
            });
        }
    }, [tahsin]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStudentId || !activeSemester) return;

            const payload = {
                student_id: selectedStudentId,
                semester_id: activeSemester.id,
                akhlak,
                kedisiplinan,
                kognitif: { Tahsin: tahsin }, // Tahfidz stored separately now
                uas_tulis: uasTulis,
                uas_lisan: uasLisan,
                nilai_akhir_akhlak: akhlakAvg,
                nilai_akhir_kedisiplinan: kedisiplinanAvg,
                nilai_akhir_kognitif: kognitifScore,
                catatan,
                sakit,
                izin,
                alpa,
                jumlah_hari_efektif: effectiveDays
            };

            let reportId = existingReport?.id;

            if (reportId) {
                await db.from('report_cards').update(payload).eq('id', reportId);
            } else {
                const { data, error } = await db.from('report_cards').insert([payload]).select().single();
                if (error) throw error;
                reportId = data.id;
            }

            // Save Tahfidz Progress
            if (reportId && Object.keys(tahfidzProgress).length > 0) {
                const progressRecords = Object.entries(tahfidzProgress).map(([surahId, scores]) => ({
                    report_card_id: reportId,
                    student_id: selectedStudentId,
                    semester_id: activeSemester.id,
                    surah_id: surahId,
                    kb: scores.kb,
                    kh: scores.kh
                }));

                // Upsert progress
                const { error: progressError } = await db
                    .from('tahfidz_progress')
                    .upsert(progressRecords, { onConflict: 'report_card_id,surah_id' });

                if (progressError) throw progressError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report_card'] });
            queryClient.invalidateQueries({ queryKey: ['tahfidz_progress'] });
            if (selectedStudentId && activeSemester) {
                localStorage.removeItem(`draft_raport_${selectedStudentId}_${activeSemester.id}`);
            }

            // Reset unsaved changes tracking
            setHasUnsavedChanges(false);
            const newState = JSON.stringify({
                akhlak,
                kedisiplinan,
                tahsin,
                uasTulis,
                uasLisan,
                catatan,
                tahfidzProgress,
                sakit,
                izin,
                alpa,
                effectiveDays
            });
            setInitialFormState(newState);

            showAlert.success('Berhasil', 'Raport berhasil disimpan');
        },
        onError: (error: any) => {
            showAlert.error('Gagal', 'Gagal menyimpan raport: ' + error.message);
        }
    });

    if (!activeSemester) return <div>Belum ada tahun ajaran aktif. Silakan set di menu Tahun Ajaran.</div>;

    if (!settings || !settings.bobot_akhlak) {
        return (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-md">
                <h2 className="text-lg font-bold text-yellow-800 mb-2">Pengaturan Belum Lengkap</h2>
                <p className="text-yellow-700">
                    Silakan lengkapi <strong>Bobot Penilaian</strong> di menu <Link to="/settings" className="underline font-semibold">Pengaturan</Link> terlebih dahulu.
                </p>
            </div>
        );
    }

    // Determine which halaqah options to show
    const halaqahOptions = (teacherAssignments && teacherAssignments.length > 0)
        ? assignedHalaqahs
        : allHalaqahs;

    return (
        <div className="space-y-6 pb-20">
            {/* ... Header ... */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Input Raport</h1>
                    <p className="text-gray-500">
                        {activeSemester?.academic_year?.tahun_ajaran} - Semester {activeSemester?.nama}
                    </p>
                </div>
                {existingReport && (
                    <Link to={`/print/${existingReport.id}`} target="_blank">
                        <Button variant="outline">
                            <Printer className="mr-2 h-4 w-4" /> Cetak Raport
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    {/* Filters: Show if there are options available */}
                    {halaqahOptions && halaqahOptions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                            <div className="space-y-2">
                                <Label>Filter Halaqah</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedHalaqahFilter}
                                    onChange={(e) => setSelectedHalaqahFilter(e.target.value)}
                                >
                                    <option value="">-- Semua Halaqah --</option>
                                    {halaqahOptions.map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {h.nama}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Subject filter only relevant for teachers */}
                            {teacherAssignments && teacherAssignments.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Filter Materi</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedSubjectFilter}
                                        onChange={(e) => setSelectedSubjectFilter(e.target.value as 'Tahfidz' | 'Tahsin' | 'Keduanya' | '')}
                                    >
                                        <option value="">-- Semua Materi --</option>
                                        {assignedSubjects.map((subject) => (
                                            <option key={subject} value={subject}>{subject === 'Keduanya' ? 'Keduanya (Tahfidz & Tahsin)' : subject}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Pilih Santri</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                        >
                            <option value="">-- Pilih Santri --</option>
                            {students
                                ?.filter(s => {
                                    // Filter by selected halaqah
                                    if (selectedHalaqahFilter) {
                                        return s.halaqah_id === selectedHalaqahFilter;
                                    }
                                    // If teacher login but NO halaqah selected (e.g. "Semua Halaqah"), 
                                    // implicitly filter to ONLY assigned halaqahs validation?
                                    // Current logic: If admin, show all. If teacher, show assigned.
                                    // If teacherAssignments exist, we should restrict students to assignedHalaqahs list if no filter selected?
                                    if (teacherAssignments && teacherAssignments.length > 0 && !selectedHalaqahFilter) {
                                        return assignedHalaqahs.some(h => h.id === s.halaqah_id);
                                    }
                                    return true;
                                })
                                .map(s => (
                                    <option key={s.id} value={s.id}>{s.nama} ({s.nis}) - Shift {s.shift || 'Sore'}</option>
                                ))
                            }
                        </select>
                    </div>
                    {selectedStudent && isShiftSiang && (
                        <p className="text-sm text-emerald-700 font-medium mt-2">
                            ℹ️ Santri shift Siang - Nilai Shalat Berjamaah tidak diinput
                        </p>
                    )}
                </CardContent>
            </Card>

            {selectedStudentId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AKHLAK */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Akhlak (10-100)
                                <span className="text-emerald-700 font-bold font-display">{formatScore(akhlakAvg)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Bulk Input Akhlak */}
                            <Card className="bg-emerald-50/70 border-emerald-200/80">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Plus className="h-4 w-4 text-emerald-600" />
                                        Input Nilai Massal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="space-y-2 flex-1 w-full">
                                            <label className="text-xs font-medium">Nilai (10-100)</label>
                                            <input
                                                type="number"
                                                min="10"
                                                max="100"
                                                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                                placeholder="Contoh: 85"
                                                id="bulk-akhlak-input"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => {
                                                const input = document.getElementById('bulk-akhlak-input') as HTMLInputElement;
                                                const value = parseInt(input.value);

                                                if (!value) {
                                                    showAlert.warning('Peringatan', 'Mohon isi nilai terlebih dahulu');
                                                    return;
                                                }
                                                if (value < 10 || value > 100) {
                                                    showAlert.warning('Peringatan', 'Nilai harus antara 10-100');
                                                    return;
                                                }

                                                const updated: Record<string, number> = {};
                                                Object.keys(akhlak).forEach(key => {
                                                    updated[key] = value;
                                                });
                                                setAkhlak(updated);
                                                input.value = ''; // Clear input
                                            }}
                                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            Terapkan ke Semua
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2">
                                        * Nilai akan diterapkan ke semua aspek akhlak
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                {Object.entries(akhlak).map(([key, val]) => (
                                    <ScoreInput
                                        key={key}
                                        label={key}
                                        value={val}
                                        onChange={(v) => setAkhlak(prev => ({ ...prev, [key]: v }))}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* KEDISIPLINAN */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Kedisiplinan (10-100)
                                <span className="text-emerald-700 font-bold font-display">{formatScore(kedisiplinanAvg)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Bulk Input Kedisiplinan */}
                            <Card className="bg-emerald-50/70 border-emerald-200/80">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Plus className="h-4 w-4 text-emerald-600" />
                                        Input Nilai Massal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="space-y-2 flex-1 w-full">
                                            <label className="text-xs font-medium">Nilai (10-100)</label>
                                            <input
                                                type="number"
                                                min="10"
                                                max="100"
                                                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                                placeholder="Contoh: 85"
                                                id="bulk-kedisiplinan-input"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => {
                                                const input = document.getElementById('bulk-kedisiplinan-input') as HTMLInputElement;
                                                const value = parseInt(input.value);

                                                if (!value) {
                                                    showAlert.warning('Peringatan', 'Mohon isi nilai terlebih dahulu');
                                                    return;
                                                }
                                                if (value < 10 || value > 100) {
                                                    showAlert.warning('Peringatan', 'Nilai harus antara 10-100');
                                                    return;
                                                }

                                                const updated: Record<string, number> = {};
                                                Object.keys(kedisiplinan).forEach(key => {
                                                    // Skip Sholat Berjamaah for shift Siang
                                                    if (isShiftSiang && key === "Sholat Berjamaah") {
                                                        updated[key] = 0;
                                                    } else {
                                                        updated[key] = value;
                                                    }
                                                });
                                                setKedisiplinan(updated);
                                                input.value = ''; // Clear input
                                            }}
                                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            Terapkan ke Semua
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2">
                                        * Nilai akan diterapkan ke semua aspek kedisiplinan
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                {Object.entries(kedisiplinan).map(([key, val]) => {
                                    const isKehadiran = key === "Kehadiran";
                                    const isDisabled = (isShiftSiang && key === "Sholat Berjamaah") || isKehadiran;
                                    return (
                                        <div key={key} className={isDisabled ? 'opacity-50' : ''}>
                                            <ScoreInput
                                                label={key + ((isShiftSiang && key === "Sholat Berjamaah") ? ' (Tidak dinilai - Shift Siang)' : isKehadiran ? ' (Otomatis)' : '')}
                                                value={(isShiftSiang && key === "Sholat Berjamaah") ? 0 : val}
                                                disabled={isDisabled}
                                                onChange={(v) => !isDisabled && setKedisiplinan(prev => ({ ...prev, [key]: v }))}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* KOGNITIF */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex justify-between">
                                Kognitif Qur'ani
                                <span className="text-emerald-700 font-bold font-display">{formatScore(kognitifScore)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-800">Tahfidz (10-100)</h4>
                                <TahfidzInput
                                    studentId={selectedStudent?.id}
                                    reportCardId={existingReport?.id}
                                    onScoreChange={setTahfidzScore}
                                    onProgressChange={setTahfidzProgress}
                                />
                            </div>
                            <div className="space-y-6">
                                <h4 className="font-semibold text-slate-800">Tahsin (10-100)</h4>

                                {/* Bulk Input Tahsin */}
                                <Card className="bg-emerald-50/70 border-emerald-200/80">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-emerald-600" />
                                            Input Nilai Massal
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col md:flex-row gap-4 items-end">
                                            <div className="space-y-2 flex-1 w-full">
                                                <label className="text-xs font-medium">Nilai (10-100)</label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="100"
                                                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                                    placeholder="Contoh: 85"
                                                    id="bulk-tahsin-input"
                                                />
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    const input = document.getElementById('bulk-tahsin-input') as HTMLInputElement;
                                                    const value = parseInt(input.value);

                                                    if (!value) {
                                                        showAlert.warning('Peringatan', 'Mohon isi nilai terlebih dahulu');
                                                        return;
                                                    }
                                                    if (value < 10 || value > 100) {
                                                        showAlert.warning('Peringatan', 'Nilai harus antara 10-100');
                                                        return;
                                                    }

                                                    const updated: Record<string, number> = {};
                                                    Object.keys(tahsin).forEach(key => {
                                                        updated[key] = value;
                                                    });
                                                    setTahsin(updated);
                                                    input.value = ''; // Clear input
                                                }}
                                                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                Terapkan ke Semua
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2">
                                            * Nilai akan diterapkan ke semua aspek tahsin
                                        </p>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    {Object.entries(tahsin).map(([key, val]) => (
                                        <ScoreInput
                                            key={key}
                                            label={key}
                                            value={val}
                                            onChange={(v) => setTahsin(prev => ({ ...prev, [key]: v }))}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 md:col-span-2 border-t pt-4">
                                <h4 className="font-semibold">Ujian Akhir Semester (10-100)</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <ScoreInput label="UAS Tulis" value={uasTulis} onChange={setUasTulis} max={100} />
                                    {settings?.show_uas_lisan !== false && (
                                        <ScoreInput label="UAS Lisan" value={uasLisan} onChange={setUasLisan} max={100} />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ATTENDANCE INPUT */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Kehadiran</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Jumlah Hari Efektif</Label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                        value={effectiveDays}
                                        onChange={(e) => setEffectiveDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sakit</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                        value={sakit}
                                        onChange={(e) => setSakit(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Izin</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                        value={izin}
                                        onChange={(e) => setIzin(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Alpa / Tanpa Keterangan</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                        value={alpa}
                                        onChange={(e) => setAlpa(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">
                                * Nilai Kedisiplinan "Kehadiran" akan otomatis dihitung berdasarkan data ini.
                            </p>
                        </CardContent>
                    </Card>

                    {/* SUMMARY */}
                    <Card className="lg:col-span-2 bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle>Ringkasan Nilai Akhir</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-gray-500">Akhlak ({settings?.bobot_akhlak}%)</p>
                                    <p className="text-xl font-bold">{formatScore(akhlakAvg)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Kedisiplinan ({settings?.bobot_kedisiplinan}%)</p>
                                    <p className="text-xl font-bold">{formatScore(kedisiplinanAvg)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Kognitif ({settings?.bobot_kognitif}%)</p>
                                    <p className="text-xl font-bold">{formatScore(kognitifScore)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total / Predikat</p>
                                    <p className="text-2xl font-bold text-blue-700">{formatScore(finalScore)} / {predikat}</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Label>Catatan Ustadz/Ustadzah</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    placeholder="Berikan catatan perkembangan santri..."
                                />
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button size="lg" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                    <Save className="mr-2 h-4 w-4" /> Simpan Raport
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Scroll Helpers */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-50 print:hidden">
                <Button
                    onClick={() => {
                        const container = document.getElementById('main-content');
                        container?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    size="icon"
                    variant="secondary"
                    className={`rounded-full shadow-lg opacity-80 hover:opacity-100 transition-all duration-300 ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none absolute'
                        }`}
                    title="Ke Atas"
                >
                    <ArrowUp className="h-6 w-6" />
                </Button>
                <Button
                    onClick={() => {
                        const container = document.getElementById('main-content');
                        container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                    }}
                    size="icon"
                    variant="secondary"
                    className={`rounded-full shadow-lg opacity-80 hover:opacity-100 transition-all duration-300 ${showScrollBottom ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none absolute'
                        }`}
                    title="Ke Bawah"
                >
                    <ArrowDown className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}

