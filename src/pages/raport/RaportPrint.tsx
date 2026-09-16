import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tursoClient as db } from '../../lib/turso-client';
import type { ReportCard, SettingsLembaga, Student, Semester, AcademicYear, TahfidzProgress, Halaqah, TahsinMaster } from '../../types';

import { PrintSettings } from '../../components/raport/PrintSettings';
import { RaportTemplate } from '../../components/raport/RaportTemplate';



export default function RaportPrint() {
    const { id } = useParams<{ id: string }>();
    const [theme, setTheme] = useState('black');
    const [size, setSize] = useState<'A4' | 'F4'>('A4');
    const [breakBeforeKognitif, setBreakBeforeKognitif] = useState(false);
    const [breakBeforeTahsin, setBreakBeforeTahsin] = useState(false);
    const [breakBeforeUAS, setBreakBeforeUAS] = useState(false);

    const { data: report, isLoading, error, refetch } = useQuery({
        queryKey: ['report_print', id],
        queryFn: async () => {
            const { data: rc, error } = await db.from('report_cards').select('*').eq('id', id).single();
            if (error) throw error;
            if (!rc) throw new Error("Raport tidak ditemukan");
            const report = { ...rc };

            // Fetch student & halaqah & guru
            const { data: std } = await db.from('students').select('*').eq('id', report.student_id).single();
            report.student = std || {};
            if (std?.halaqah_id) {
                const { data: hal } = await db.from('halaqah').select('*').eq('id', std.halaqah_id).single();
                if (hal) {
                    if (hal.teacher_id) {
                        const { data: guru } = await db.from('users').select('*').eq('id', hal.teacher_id).single();
                        hal.guru = guru;
                    }
                    report.student.halaqah_data = hal;
                }
            }

            // Fetch semester & academic_year
            const { data: sem } = await db.from('semesters').select('*').eq('id', report.semester_id).single();
            report.semester = sem || {};
            if (sem?.academic_year_id) {
                const { data: ay } = await db.from('academic_years').select('*').eq('id', sem.academic_year_id).single();
                report.semester.academic_year = ay;
            }

            // Fetch tahfidz progress & surah
            const { data: tp } = await db.from('tahfidz_progress').select('*').eq('report_card_id', report.id);
            if (tp && tp.length > 0) {
                const surahIds = tp.map((t: any) => t.surah_id).filter(Boolean);
                const { data: surahs } = await db.from('surah_master').select('*').in('id', surahIds);
                report.tahfidz_progress = tp.map((t: any) => ({
                    ...t,
                    surah: surahs?.find((s: any) => s.id === t.surah_id)
                }));
            } else {
                report.tahfidz_progress = [];
            }

            return report as ReportCard & {
                student: Student & { halaqah_data?: Halaqah },
                semester: Semester & { academic_year: AcademicYear },
                tahfidz_progress: TahfidzProgress[]
            };
        }
    });

    const { data: settings, refetch: refetchSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await db.from('settings_lembaga').select('*').single();
            return data as SettingsLembaga;
        }
    });

    // Fetch active Tahsin items from database
    const { data: tahsinMasterItems } = useQuery({
        queryKey: ['tahsin_master_active'],
        queryFn: async () => {
            const { data } = await db
                .from('tahsin_master')
                .select('*')
                .eq('is_active', true)
                .order('urutan');
            return data as TahsinMaster[];
        }
    });

    // Fetch specific Pembimbing Assignment
    const { data: pembimbingAssignment } = useQuery({
        queryKey: ['pembimbing_assignment', report?.student?.halaqah_id],
        enabled: !!report?.student?.halaqah_id,
        queryFn: async () => {
            const { data } = await db
                .from('teacher_assignments')
                .select('*, teacher:users(*)')
                .eq('halaqah_id', report!.student.halaqah_id)
                .in('role', ['pembimbing', 'keduanya'])
                .eq('is_active', true)
                .maybeSingle(); // Use maybeSingle to avoid 406 error if not found
            return data;
        }
    });

    useEffect(() => {
        if (!isLoading && report) {
            // Set document title for PDF filename
            document.title = `Raport - ${report.student.nama}`;
        }
    }, [isLoading, report]);

    if (isLoading) return <div className="p-10">Loading...</div>;
    if (error) return <div className="p-10 text-red-600">Error: {(error as Error).message}</div>;
    if (!report || !settings) return <div className="p-10">Data not found</div>;

    // Prioritize assigned Pembimbing, fallback to Halaqah's default Guru
    const guruPembimbing = pembimbingAssignment?.teacher || report.student.halaqah_data?.guru;

    // Dynamic styles based on theme
    // const headerStyle = { borderColor: theme };

    return (
        <div className={`bg-white text-black font-sans mx-auto p-8 min-h-screen print:p-0 ${size === 'A4' ? 'max-w-[210mm]' : 'max-w-[215mm]'}`}>
            <PrintSettings
                settings={settings}
                teacher={guruPembimbing}
                onSettingsChange={() => {
                    refetchSettings();
                    refetch();
                }}
                onThemeChange={setTheme}
                onSizeChange={setSize}
                breakBeforeKognitif={breakBeforeKognitif}
                setBreakBeforeKognitif={setBreakBeforeKognitif}
                breakBeforeTahsin={breakBeforeTahsin}
                setBreakBeforeTahsin={setBreakBeforeTahsin}
                breakBeforeUAS={breakBeforeUAS}
                setBreakBeforeUAS={setBreakBeforeUAS}
            />

            <RaportTemplate
                report={report}
                settings={settings}
                guruPembimbing={guruPembimbing}
                tahsinMasterItems={tahsinMasterItems}
                theme={theme}
                options={{
                    size,
                    breakBeforeKognitif,
                    breakBeforeTahsin,
                    breakBeforeUAS,
                    showWatermark: true
                }}
            />
        </div>
    );
}

