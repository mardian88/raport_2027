import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Student, ReportCard, Semester, TeacherAssignment } from '../../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { ScoreInput } from '../../components/raport/ScoreInput';
import { TahfidzInput } from '../../components/raport/TahfidzInput';
import { calculateAverage, formatScore } from '../../utils/grading';
import { Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';

export default function GuruInput() {
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();

    const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<'Tahfidz' | 'Tahsin' | ''>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [activeSemester, setActiveSemester] = useState<Semester | null>(null);

    // Tahfidz State
    const [, setTahfidzScore] = useState(85);
    const [tahfidzProgress, setTahfidzProgress] = useState<Record<string, { kb: number; kh: number }>>({});

    // Tahsin State
    const [tahsin, setTahsin] = useState<Record<string, number>>({});
    const [uasTulis, setUasTulis] = useState(0);
    const [uasLisan, setUasLisan] = useState(0);

    // Fetch active semester
    const { data: activeSemesterData } = useQuery({
        queryKey: ['active_semester'],
        queryFn: async () => {
            const { data } = await supabase
                .from('semesters')
                .select('*, academic_year:academic_years(*)')
                .eq('is_active', true)
                .single();
            return data as Semester & { academic_year: any };
        }
    });

    useEffect(() => {
        if (activeSemesterData) setActiveSemester(activeSemesterData);
    }, [activeSemesterData]);

    // Fetch teacher assignments
    const { data: teacherAssignments } = useQuery({
        queryKey: ['teacher_assignments', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teacher_assignments')
                .select(`
                    *,
                    halaqah:halaqah!halaqah_id(id, nama, shift)
                `)
                .eq('teacher_id', session!.user!.id)
                .eq('is_active', true);
            if (error) throw error;
            return data as (TeacherAssignment & { halaqah: { id: string; nama: string; shift?: 'Siang' | 'Sore' } })[];
        }
    });

    // Get unique halaqahs and subjects
    const assignedHalaqahs = useMemo(() => (teacherAssignments
        ?.map(a => a.halaqah)
        .filter(v => v !== null && v !== undefined) || [])
        .filter((v, i, a) => a.findIndex(t => t?.id === v?.id) === i), [teacherAssignments]);

    const availableSubjects = useMemo(() => selectedHalaqahId
        ? teacherAssignments?.filter(a => a.halaqah_id === selectedHalaqahId).map(a => a.subject) || []
        : [], [teacherAssignments, selectedHalaqahId]);

    // Fetch students filtered by halaqah
    const { data: students } = useQuery({
        queryKey: ['students', selectedHalaqahId],
        enabled: !!selectedHalaqahId,
        queryFn: async () => {
            const { data } = await supabase
                .from('students')
                .select('*, halaqah_data:halaqah(*)')
                .eq('halaqah_id', selectedHalaqahId)
                .eq('is_active', true)
                .order('nama');
            return data as Student[];
        }
    });

    // Fetch Global Tahsin Items (Fallback)
    const { data: globalTahsinItems } = useQuery({
        queryKey: ['tahsin_master_global'],
        queryFn: async () => {
            const { data } = await supabase
                .from('tahsin_master')
                .select('nama_item')
                .eq('is_active', true)
                .order('urutan');
            return data?.map(i => i.nama_item) || [];
        }
    });

    // Fetch settings
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings_lembaga').select('*').single();
            return data;
        }
    });

    // Fetch existing report
    const { data: existingReport } = useQuery({
        queryKey: ['report_card', selectedStudentId, activeSemester?.id],
        enabled: !!selectedStudentId && !!activeSemester?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('report_cards')
                .select('*')
                .eq('student_id', selectedStudentId)
                .eq('semester_id', activeSemester!.id)
                .single();
            return data as ReportCard;
        }
    });

    // Fetch existing Tahfidz Score (for calculation)
    const { data: existingTahfidzAvg = 0 } = useQuery({
        queryKey: ['tahfidz_avg', existingReport?.id],
        enabled: !!existingReport?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('tahfidz_progress')
                .select('kb, kh')
                .eq('report_card_id', existingReport!.id);

            if (!data || data.length === 0) return 0;

            let total = 0;
            let count = 0;
            data.forEach(d => {
                if (d.kb) { total += d.kb; count++; }
                if (d.kh) { total += d.kh; count++; }
            });
            return count > 0 ? total / count : 0;
        }
    });

    const selectedStudent = students?.find(s => s.id === selectedStudentId);

    // Get current assignment details for selected halaqah
    const currentAssignment = teacherAssignments?.find(a => a.halaqah_id === selectedHalaqahId);
    const isPembimbing = currentAssignment?.role === 'pembimbing';

    // Auto-select from URL
    useEffect(() => {
        const studentIdFromUrl = searchParams.get('student');
        if (studentIdFromUrl && students && teacherAssignments) {
            const student = students.find(s => s.id === studentIdFromUrl);
            if (student) {
                // Find which halaqah this student belongs to that the teacher is assigned to
                // We need to match student.halaqah_id with one of the assigned halaqahs
                // But `students` query is filtered by `selectedHalaqahId`.
                // Actually, the `students` query depends on `selectedHalaqahId`.
                // So we can't find the student in `students` list if we haven't selected the halaqah yet.

                // Strategy: Find the halaqah ID first from the student data (which we need to fetch or deduce)
                // However, we only have `students` when a halaqah is selected.
                // We need to iterate through assigned halaqahs to find where this student might be?
                // Or easier: If we have the ID, we assume the user clicked from Leger, so we know the context?
                // No, Leger just gives ID.

                // Alternative: We temporarily select the first halaqah that matches?
                // Or better: Use a separate query or logic to set halaqah.
            }
        }
    }, [searchParams, students, teacherAssignments]);

    // Better approach: When mounting, if URL param exists, find the halaqah for that student.
    // Since we don't have all students loaded, maybe we need to fetch the student's details first if ID is present?
    const { data: targetStudent } = useQuery({
        queryKey: ['student_target', searchParams.get('student')],
        enabled: !!searchParams.get('student'),
        queryFn: async () => {
            const id = searchParams.get('student');
            const { data } = await supabase.from('students').select('halaqah_id').eq('id', id!).single();
            return data;
        }
    });

    useEffect(() => {
        if (targetStudent && targetStudent.halaqah_id && assignedHalaqahs.length > 0) {
            // Check if teacher is assigned to this halaqah
            const assignment = assignedHalaqahs.find(h => h.id === targetStudent.halaqah_id);
            if (assignment) {
                if (selectedHalaqahId !== targetStudent.halaqah_id) {
                    setSelectedHalaqahId(targetStudent.halaqah_id);
                }
                const studentId = searchParams.get('student');
                if (studentId && selectedStudentId !== studentId) {
                    setSelectedStudentId(studentId);
                    // Default subject if not set
                    if (!selectedSubject) setSelectedSubject('Tahsin');
                }
            }
        }
    }, [targetStudent, assignedHalaqahs, selectedHalaqahId, selectedStudentId, selectedSubject, searchParams]);

    // Akhlak & Kedisiplinan State (only for Pembimbing)
    const defaultAkhlak: Record<string, number> = {
        'Adab Kepada Guru': 85,
        'Adab Kepada Teman': 85,
        'Adab Terhadap Lingkungan': 85
    };

    // Helper function to create kedisiplinan based on shift (no Kehadiran/Ketepatan Waktu for teachers)
    const createKedisiplinan = (shift?: 'Siang' | 'Sore' | null): Record<string, number> => {
        const base: Record<string, number> = {
            'Tilawah & Hafalan Mandiri': 85,
            'Kebersihan': 85,
            'Kerapian': 85
        };

        // Only add Shalat Berjamaah if NOT Siang shift
        if (shift !== 'Siang') {
            base['Shalat Berjamaah'] = 85;
        }

        return base;
    };

    // Note: Kehadiran & Ketepatan Waktu are loaded from DB but hidden from Teacher input to prevent overwrite of Admin data
    const [akhlak, setAkhlak] = useState<Record<string, number>>(defaultAkhlak);
    const [kedisiplinan, setKedisiplinan] = useState<Record<string, number>>({});

    // Initialize kedisiplinan when student/halaqah changes
    useEffect(() => {
        if (selectedStudent && selectedHalaqahId) {
            const currentHalaqah = assignedHalaqahs.find(h => h.id === selectedHalaqahId);
            const shiftToCheck = currentHalaqah?.shift || selectedStudent?.shift;

            // Only reset if kedisiplinan is empty
            if (Object.keys(kedisiplinan).length === 0) {
                setKedisiplinan(createKedisiplinan(shiftToCheck));
            } else {
                // Check if we need to add/remove Shalat Berjamaah
                const shouldHaveShalatBerjamaah = shiftToCheck !== 'Siang';
                const currentlyHasShalatBerjamaah = 'Shalat Berjamaah' in kedisiplinan;

                if (shouldHaveShalatBerjamaah !== currentlyHasShalatBerjamaah) {
                    setKedisiplinan(prev => {
                        const next = { ...prev };
                        if (shouldHaveShalatBerjamaah) {
                            // Add Shalat Berjamaah if missing
                            next['Shalat Berjamaah'] = 85;
                        } else {
                            // Remove Shalat Berjamaah if present
                            delete next['Shalat Berjamaah'];
                            delete next['Sholat Berjamaah']; // Legacy
                        }
                        return next;
                    });
                }
            }
        }
    }, [selectedStudent?.id, selectedHalaqahId, selectedStudent?.shift, assignedHalaqahs]);

    // Autosave Logic
    const autosaveKey = `autosave_${selectedStudentId}_${selectedSubject}_${activeSemester?.id}`;

    const loadAutosave = useCallback(() => {
        if (!selectedStudentId || !selectedSubject) return false;

        try {
            const saved = localStorage.getItem(autosaveKey);
            if (saved) {
                const data = JSON.parse(saved);
                // Only load if timestamp is recent (e.g. < 24 hours) - Optional, but for now just load it
                // We should check if the saved data is actually more "complete" or just blindly load?
                // Simplest: Just load it, but maybe show a toast or indicator?
                // Merging logic:
                if (selectedSubject === 'Tahfidz' && data.tahfidzProgress) {
                    setTahfidzProgress(data.tahfidzProgress);
                    if (data.tahfidzScore) setTahfidzScore(data.tahfidzScore);
                } else if (selectedSubject === 'Tahsin') {
                    if (data.tahsin) setTahsin(data.tahsin);
                    if (data.uasTulis !== undefined) setUasTulis(data.uasTulis);
                    if (data.uasLisan !== undefined) setUasLisan(data.uasLisan);
                }

                if (isPembimbing) {
                    if (data.akhlak) {
                        const filteredAkhlak = { ...defaultAkhlak };
                        Object.keys(data.akhlak).forEach(k => {
                            if (k === 'Adab Kepada Allah & Rasul' || k === 'Adab Kepada Orang Tua') return;
                            if (k in defaultAkhlak) {
                                filteredAkhlak[k] = data.akhlak[k];
                            }
                        });
                        setAkhlak(filteredAkhlak);
                    }
                    if (data.kedisiplinan) {
                        // Apply Siang filter if needed AND handle renames
                        const currentHalaqah = assignedHalaqahs.find(h => h.id === selectedHalaqahId);
                        const shiftToCheck = currentHalaqah?.shift || selectedStudent?.shift;
                        const filteredKedisiplinan = createKedisiplinan(shiftToCheck);

                        // Initialize hidden fields (will be preserved from autosave/DB but not shown to teachers)
                        filteredKedisiplinan['Kehadiran'] = 100;
                        filteredKedisiplinan['Ketepatan Waktu'] = 100;

                        // Preserve Kehadiran & Ketepatan Waktu from autosave if they exist (hidden but maintained)
                        if (data.kedisiplinan['Kehadiran'] !== undefined) {
                            filteredKedisiplinan['Kehadiran'] = data.kedisiplinan['Kehadiran'];
                        }
                        if (data.kedisiplinan['Ketepatan Waktu'] !== undefined) {
                            filteredKedisiplinan['Ketepatan Waktu'] = data.kedisiplinan['Ketepatan Waktu'];
                        }

                        Object.keys(data.kedisiplinan).forEach(k => {
                            if (k === 'Tilawah Mandiri') {
                                filteredKedisiplinan['Tilawah & Hafalan Mandiri'] = data.kedisiplinan[k];
                                return;
                            }
                            if (k === 'Tilawah & Hafalan Mandiri') {
                                filteredKedisiplinan['Tilawah & Hafalan Mandiri'] = data.kedisiplinan[k];
                                return;
                            }
                            if (k in filteredKedisiplinan) {
                                filteredKedisiplinan[k] = data.kedisiplinan[k];
                            }
                        });

                        if (shiftToCheck === 'Siang') {
                            delete filteredKedisiplinan['Shalat Berjamaah'];
                            delete filteredKedisiplinan['Sholat Berjamaah']; // Legacy
                        }
                        setKedisiplinan(filteredKedisiplinan);
                    }
                }
                return true;
            }
        } catch (e) {
            console.error("Failed to load autosave", e);
        }
        return false;
    }, [autosaveKey, selectedStudentId, selectedSubject, isPembimbing, selectedStudent, selectedHalaqahId, assignedHalaqahs]);

    // Save to localStorage
    useEffect(() => {
        if (!selectedStudentId || !selectedSubject || !activeSemester) return;

        const timer = setTimeout(() => {
            const dataToSave = {
                timestamp: Date.now(),
                tahfidzScore: selectedSubject === 'Tahfidz' ? 10 : undefined, // Check how to get tahfidzScore state if needed, currently it's internal to TahfidzInput mostly or state here
                // Wait, tahfidzScore state is here on line 28
                tahfidzProgress: selectedSubject === 'Tahfidz' ? tahfidzProgress : undefined,
                tahsin: selectedSubject === 'Tahsin' ? tahsin : undefined,
                uasTulis: selectedSubject === 'Tahsin' ? uasTulis : undefined,
                uasLisan: selectedSubject === 'Tahsin' ? uasLisan : undefined,
                akhlak: isPembimbing ? akhlak : undefined,
                kedisiplinan: isPembimbing ? kedisiplinan : undefined
            };
            localStorage.setItem(autosaveKey, JSON.stringify(dataToSave));
        }, 1000); // 1 sec debounce

        return () => clearTimeout(timer);
    }, [tahfidzProgress, tahsin, uasTulis, uasLisan, akhlak, kedisiplinan, selectedStudentId, selectedSubject, activeSemester, isPembimbing, autosaveKey]);

    // Load existing data
    useEffect(() => {
        if (selectedStudentId && activeSemester && selectedStudent) {
            // STRICT FILTERING: Only show items that are BOTH in the student's config AND in the active Master Data
            const halaqahItems = selectedStudent?.halaqah_data?.tahsin_items || [];

            let activeTahsinItems: string[] = [];

            if (halaqahItems.length > 0) {
                // Only include items that exist in global master (to avoid ghosts)
                if (globalTahsinItems && globalTahsinItems.length > 0) {
                    activeTahsinItems = halaqahItems.filter(item => globalTahsinItems.includes(item));
                } else {
                    // If global items are not loaded or empty, we should NOT fall back to halaqahItems alone
                    // as it might contain deleted/ghost items.
                    activeTahsinItems = [];
                }
            } else {
                activeTahsinItems = globalTahsinItems || [];
            }

            // Filter out obsolete items like "Panjang Pendek"
            activeTahsinItems = activeTahsinItems.filter(item => item !== 'Panjang Pendek');

            if (existingReport) {
                // Load Tahsin scores
                const savedTahsin = existingReport.kognitif?.Tahsin || {};
                const newTahsin: Record<string, number> = {};
                activeTahsinItems.forEach(item => {
                    newTahsin[item] = savedTahsin[item] || 0;
                });
                setTahsin(newTahsin);
                setUasTulis(existingReport.uas_tulis || 0);
                setUasLisan(existingReport.uas_lisan || 0);

                // Load Akhlak & Kedisiplinan if Pembimbing
                if (isPembimbing) {
                    const savedAkhlak = existingReport.akhlak || {};
                    const savedKedisiplinan = existingReport.kedisiplinan || {};

                    // Merge with defaults to ensure all keys exist
                    // Also handle migration of "Tilawah Mandiri" -> "Tilawah & Hafalan Mandiri"
                    // And exclude "Adab Kepada Allah & Rasul", "Adab Kepada Orang Tua"

                    const filteredAkhlak = { ...defaultAkhlak };
                    // Only copy values for keys that exist in our new default (plus allow custom ones? No, strict requirement to remove specific ones)
                    // Actually, let's just ignore the deleted ones.
                    Object.keys(savedAkhlak).forEach(k => {
                        if (k === 'Adab Kepada Allah & Rasul' || k === 'Adab Kepada Orang Tua') return;
                        if (k in defaultAkhlak) {
                            filteredAkhlak[k] = savedAkhlak[k];
                        }
                    });
                    setAkhlak(filteredAkhlak);

                    const currentHalaqah = assignedHalaqahs.find(h => h.id === selectedHalaqahId);
                    const shiftToCheck = currentHalaqah?.shift || selectedStudent?.shift;
                    const filteredKedisiplinan = createKedisiplinan(shiftToCheck);

                    // Initialize hidden fields (will be preserved from DB but not shown to teachers)
                    filteredKedisiplinan['Kehadiran'] = 100;
                    filteredKedisiplinan['Ketepatan Waktu'] = 100;

                    // Migrate old data: if "Ketepatan Waktu" doesn't exist, copy from "Kehadiran"
                    if (savedKedisiplinan['Kehadiran'] !== undefined && savedKedisiplinan['Ketepatan Waktu'] === undefined) {
                        savedKedisiplinan['Ketepatan Waktu'] = savedKedisiplinan['Kehadiran'];
                    }

                    // Preserve Kehadiran & Ketepatan Waktu if they exist in DB (so we pass them back)
                    if (savedKedisiplinan['Kehadiran'] !== undefined) {
                        filteredKedisiplinan['Kehadiran'] = savedKedisiplinan['Kehadiran'];
                    }
                    if (savedKedisiplinan['Ketepatan Waktu'] !== undefined) {
                        filteredKedisiplinan['Ketepatan Waktu'] = savedKedisiplinan['Ketepatan Waktu'];
                    }

                    Object.keys(savedKedisiplinan).forEach(k => {
                        // Handle rename
                        if (k === 'Tilawah Mandiri') {
                            filteredKedisiplinan['Tilawah & Hafalan Mandiri'] = savedKedisiplinan[k];
                            return;
                        }
                        // Handle rename legacy
                        if (k === 'Tilawah & Hafalan Mandiri') {
                            filteredKedisiplinan['Tilawah & Hafalan Mandiri'] = savedKedisiplinan[k];
                            return;
                        }

                        if (k in filteredKedisiplinan) {
                            filteredKedisiplinan[k] = savedKedisiplinan[k];
                        }
                    });
                    setKedisiplinan(filteredKedisiplinan);
                }
            } else {
                // Reset to defaults
                const initialTahsin: Record<string, number> = {};
                activeTahsinItems.forEach(item => {
                    initialTahsin[item] = 0;
                });
                setTahsin(initialTahsin);
                setUasTulis(0);
                setUasLisan(0);

                if (isPembimbing) {
                    setAkhlak(defaultAkhlak);
                    const currentHalaqah = assignedHalaqahs.find(h => h.id === selectedHalaqahId);
                    const shiftToCheck = currentHalaqah?.shift || selectedStudent?.shift;
                    setKedisiplinan(createKedisiplinan(shiftToCheck));
                }
            }
            setTahfidzScore(10);
            setTahfidzProgress({});

            // Try to load autosave AFTER loading DB data
            // We use a small timeout to ensure state is settled? No, synchronous is fine or in next tick
            setTimeout(() => {
                loadAutosave();
            }, 100);

        }
    }, [existingReport, selectedStudentId, activeSemester, selectedStudent, globalTahsinItems, isPembimbing, loadAutosave]);










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

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStudentId || !activeSemester || !selectedSubject) return;

            // Fetch existing report to preserve other fields
            const { data: currentReport } = await supabase
                .from('report_cards')
                .select('*')
                .eq('student_id', selectedStudentId)
                .eq('semester_id', activeSemester.id)
                .single();

            let payload: any = {
                student_id: selectedStudentId,
                semester_id: activeSemester.id,
            };

            if (selectedSubject === 'Tahsin') {
                const tahsinAvg = calculateAverage(tahsin);
                payload.kognitif = {
                    ...currentReport?.kognitif,
                    Tahsin: tahsin
                };
                payload.uas_tulis = uasTulis;
                payload.uas_lisan = uasLisan;

                // Recalculate kognitif score using correct Tahfidz average
                const finalTahfidz = existingTahfidzAvg || 0;

                if (settings?.show_uas_lisan === false) {
                    payload.nilai_akhir_kognitif = (finalTahfidz + tahsinAvg + uasTulis) / 3;
                } else {
                    payload.nilai_akhir_kognitif = (finalTahfidz + tahsinAvg + uasTulis + uasLisan) / 4;
                }
            } else if (selectedSubject === 'Tahfidz') {
                // Calculate new Tahfidz Average from 'tahfidzProgress' state being saved
                let total = 0;
                let count = 0;
                Object.values(tahfidzProgress).forEach(v => {
                    if (v.kb) { total += v.kb; count++; }
                    if (v.kh) { total += v.kh; count++; }
                });
                const newTahfidzAvg = count > 0 ? total / count : 0;

                // Get existing other scores from DB report
                const currentTahsinAvg = currentReport?.kognitif?.Tahsin ? calculateAverage(currentReport.kognitif.Tahsin) : 0;
                const currentUasTulis = currentReport?.uas_tulis || 0;
                const currentUasLisan = currentReport?.uas_lisan || 0;

                if (settings?.show_uas_lisan === false) {
                    payload.nilai_akhir_kognitif = (newTahfidzAvg + currentTahsinAvg + currentUasTulis) / 3;
                } else {
                    payload.nilai_akhir_kognitif = (newTahfidzAvg + currentTahsinAvg + currentUasTulis + currentUasLisan) / 4;
                }
            }

            // If Pembimbing, save Akhlak & Kedisiplinan
            if (isPembimbing) {
                payload.akhlak = akhlak;
                payload.kedisiplinan = kedisiplinan;
                payload.nilai_akhir_akhlak = calculateAverage(akhlak);
                payload.nilai_akhir_kedisiplinan = calculateAverage(kedisiplinan);
            } else {
                // Preserve existing if not pembimbing
                if (currentReport) {
                    payload.akhlak = currentReport.akhlak;
                    payload.kedisiplinan = currentReport.kedisiplinan;
                    payload.nilai_akhir_akhlak = currentReport.nilai_akhir_akhlak;
                    payload.nilai_akhir_kedisiplinan = currentReport.nilai_akhir_kedisiplinan;
                }
            }

            // Preserve totals if not updated here (usually DB triggers handle this, but explicit is safe)
            if (currentReport) {
                payload.catatan = currentReport.catatan;
                payload.sakit = currentReport.sakit;
                payload.izin = currentReport.izin;
                payload.alpa = currentReport.alpa;
                payload.jumlah_hari_efektif = currentReport.jumlah_hari_efektif;
            }

            let reportId = existingReport?.id;

            if (reportId) {
                await supabase.from('report_cards').update(payload).eq('id', reportId);
            } else {
                const { data, error } = await supabase.from('report_cards').insert([payload]).select().single();
                if (error) throw error;
                reportId = data.id;
            }

            // Save Tahfidz Progress if Tahfidz subject
            if (selectedSubject === 'Tahfidz' && reportId && Object.keys(tahfidzProgress).length > 0) {
                const progressRecords = Object.entries(tahfidzProgress).map(([surahId, scores]) => ({
                    report_card_id: reportId,
                    surah_id: surahId,
                    kb: scores.kb,
                    kh: scores.kh
                }));

                const { error: progressError } = await supabase
                    .from('tahfidz_progress')
                    .upsert(progressRecords, { onConflict: 'report_card_id,surah_id' });

                if (progressError) throw progressError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['report_card'] });
            queryClient.invalidateQueries({ queryKey: ['tahfidz_progress'] });
            toast({
                title: "Berhasil",
                description: "Nilai berhasil disimpan."
            });
            // Clear autosave
            localStorage.removeItem(autosaveKey);
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: error.message
            });
        }
    });

    if (!activeSemester) {
        return <div>Belum ada tahun ajaran aktif.</div>;
    }

    if (!teacherAssignments || teacherAssignments.length === 0) {
        return (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-md">
                <h2 className="text-lg font-bold text-yellow-800 mb-2">Belum Ada Penugasan</h2>
                <p className="text-yellow-700">
                    Anda belum ditugaskan ke halaqah manapun. Silakan hubungi admin untuk mendapatkan penugasan.
                </p>
            </div>
        );
    }

    const tahsinAvg = calculateAverage(tahsin);
    const akhlakAvg = calculateAverage(akhlak);
    const kedisiplinanAvg = calculateAverage(kedisiplinan);



    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold">Input Nilai</h1>
                <p className="text-gray-500">
                    {activeSemester.academic_year?.tahun_ajaran} - Semester {activeSemester.nama}
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Halaqah</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedHalaqahId}
                                onChange={(e) => {
                                    setSelectedHalaqahId(e.target.value);
                                    setSelectedSubject('');
                                    setSelectedStudentId('');
                                }}
                            >
                                <option value="">-- Pilih Halaqah --</option>
                                {assignedHalaqahs.map((h) => (
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
                                value={selectedSubject}
                                onChange={(e) => {
                                    setSelectedSubject(e.target.value as 'Tahfidz' | 'Tahsin');
                                    setSelectedStudentId('');
                                }}
                                disabled={!selectedHalaqahId}
                            >
                                <option value="">-- Pilih Materi --</option>
                                {availableSubjects.map((subject) => (
                                    <option key={subject} value={subject}>
                                        {subject}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedHalaqahId && selectedSubject && (
                        <div className="space-y-2">
                            <Label>Santri</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                            >
                                <option value="">-- Pilih Santri --</option>
                                {students?.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nama} ({s.nis})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Input Fields */}
            {selectedStudentId && selectedSubject && (
                <div className="space-y-6">
                    {selectedSubject === 'Tahfidz' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tahfidz (10-100)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TahfidzInput
                                    studentId={selectedStudent?.id}
                                    reportCardId={existingReport?.id}
                                    onScoreChange={setTahfidzScore}
                                    onProgressChange={setTahfidzProgress}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {selectedSubject === 'Tahsin' && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        Tahsin (10-100)
                                        <span className="text-blue-600">{formatScore(tahsinAvg)}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(tahsin).map(([key, val]) => (
                                        <ScoreInput
                                            key={key}
                                            label={key}
                                            value={val}
                                            onChange={(v) => setTahsin(prev => ({ ...prev, [key]: v }))}
                                        />
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Ujian Akhir Semester (10-100)</CardTitle>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-4">
                                    <ScoreInput label="UAS Tulis" value={uasTulis} onChange={setUasTulis} max={100} />
                                    {settings?.show_uas_lisan !== false && (
                                        <ScoreInput label="UAS Lisan" value={uasLisan} onChange={setUasLisan} max={100} />
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* PEMBIMBING SECTION - Akhlak & Disiplin */}
                    {isPembimbing && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                            <div className="flex items-center gap-2 text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <span className="font-bold">Info:</span> Anda login sebagai Pembimbing Halaqah, silakan input nilai Akhlak & Kedisiplinan.
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        Akhlak & Perilaku (10-100)
                                        <span className="text-blue-600">{formatScore(akhlakAvg)}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(akhlak).map(([key, val]) => (
                                        <ScoreInput
                                            key={key}
                                            label={key}
                                            value={val}
                                            onChange={(v) => setAkhlak(prev => ({ ...prev, [key]: v }))}
                                        />
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        Kedisiplinan (10-100)
                                        <span className="text-blue-600">{formatScore(kedisiplinanAvg)}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(kedisiplinan)
                                        .filter(([key]) => key !== 'Kehadiran' && key !== 'Ketepatan Waktu') // Hide Kehadiran & Ketepatan Waktu from Teachers
                                        .map(([key, val]) => (
                                            <ScoreInput
                                                key={key}
                                                label={key}
                                                value={val}
                                                onChange={(v) => setKedisiplinan(prev => ({ ...prev, [key]: v }))}
                                            />
                                        ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                            <Save className="mr-2 h-4 w-4" />
                            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

