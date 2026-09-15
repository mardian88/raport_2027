export type UserRole = 'admin' | 'guru' | 'viewer';

export interface User {
    id: string;
    email: string;
    role: 'admin' | 'guru' | 'viewer';
    full_name?: string;
    signature_url?: string;
}

export interface Halaqah {
    id: string;
    nama: string;
    guru_id?: string;
    is_active: boolean;
    tahsin_items?: string[];
    shift?: 'Siang' | 'Sore'; // New field
    guru?: User; // Joined data
}

export interface TahsinMaster {
    id: string;
    nama_item: string;
    urutan: number;
    is_active: boolean;
    halaqah_id?: string | null; // NULL = global, specific ID = per-halaqah
    created_at?: string;
    updated_at?: string;
}


export interface SettingsLembaga {
    id: string;
    nama_lembaga: string;
    alamat: string;
    kota: string;
    nomor_kontak: string;
    nama_kepala_lembaga: string;
    nip_kepala_lembaga: string;
    logo_url: string;
    bobot_akhlak: number;
    bobot_kedisiplinan: number;
    bobot_kognitif: number;
    skala_penilaian: Record<string, number>;
    footer_raport: string;
    signature_url?: string;
    tempat_tanggal_raport?: string;
    show_uas_lisan?: boolean;
}

export interface Student {
    id: string;
    nama: string;
    nis: string;
    halaqah?: string; // Legacy text field
    halaqah_id?: string; // New FK
    halaqah_data?: Halaqah; // Joined data
    jenis_kelamin: 'L' | 'P';
    tanggal_lahir: string;
    nama_orang_tua: string;
    shift?: 'Siang' | 'Sore';
    is_active: boolean;
}

export interface AcademicYear {
    id: string;
    tahun_ajaran: string;
    is_active: boolean;
}

export interface Semester {
    id: string;
    academic_year_id: string;
    nama: string;
    is_active: boolean;
    jumlah_hari_efektif?: number;
    academic_year?: AcademicYear;
}

export interface ReportCard {
    id: string;
    student_id: string;
    semester_id: string;
    akhlak: Record<string, number>;
    kedisiplinan: Record<string, number>;
    sakit?: number;
    izin?: number;
    alpa?: number;
    jumlah_hari_efektif?: number;
    kognitif: {
        Tahfidz?: Record<string, number>;
        Tahsin?: Record<string, number>;
    };
    uas_tulis: number;
    uas_lisan: number;
    nilai_akhir_akhlak: number;
    nilai_akhir_kedisiplinan: number;
    nilai_akhir_kognitif: number;
    catatan: string;
    tahfidz_progress?: TahfidzProgress[];
}

export interface SurahMaster {
    id: string;
    juz: number;
    nama_surah: string;
    nomor_surah: number;
    urutan_dalam_juz: number;
    is_active: boolean;
}

export interface TahfidzProgress {
    id: string;
    report_card_id: string;
    surah_id: string;
    kb: number;
    kh: number;
    surah?: SurahMaster;
}

export interface TeacherAssignment {
    id: string;
    teacher_id: string;
    halaqah_id: string;
    subject: 'Tahfidz' | 'Tahsin';
    is_active: boolean;
    created_at: string;
    // Joined data
    teacher?: User;
    halaqah?: Halaqah;
    role?: 'guru' | 'pembimbing';
}
