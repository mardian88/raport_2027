import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
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
            const { data, error } = await supabase
                .from('report_cards')
                .select(`
                    *,
                    tahfidz_progress(*, surah:surah_master(*)),
                    student:students(*, halaqah_data:halaqah(*, guru:users(*))),
                    semester:semesters(*, academic_year:academic_years(*))
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as ReportCard & {
                student: Student & { halaqah_data?: Halaqah },
                semester: Semester & { academic_year: AcademicYear },
                tahfidz_progress: TahfidzProgress[]
            };
        }
    });

    const { data: settings, refetch: refetchSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings_lembaga').select('*').single();
            return data as SettingsLembaga;
        }
    });

    // Fetch active Tahsin items from database
    const { data: tahsinMasterItems } = useQuery({
        queryKey: ['tahsin_master_active'],
        queryFn: async () => {
            const { data } = await supabase
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
            const { data } = await supabase
                .from('teacher_assignments')
                .select('*, teacher:users(*)')
                .eq('halaqah_id', report!.student.halaqah_id)
                .eq('role', 'pembimbing')
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

