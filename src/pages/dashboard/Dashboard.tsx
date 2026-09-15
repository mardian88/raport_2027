import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import {
    Users,
    FileText,
    BookOpen,
    Award,
    Calendar,
    ArrowRight,
    TrendingUp,
    GraduationCap,
    Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import GuruDashboard from './GuruDashboard';

export default function Dashboard() {
    const { session } = useAuth();
    const user = session?.user;

    // Fetch comprehensive statistics
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard_stats_comprehensive', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Admin / general metrics
            const [studentsRes, reportsRes, halaqahRes, semesterRes] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('report_cards').select('*', { count: 'exact', head: true }),
                supabase.from('halaqah').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('semesters').select('*, academic_years(tahun)').eq('is_active', true).maybeSingle(),
            ]);

            return {
                totalStudents: studentsRes.count || 0,
                totalReports: reportsRes.count || 0,
                totalHalaqah: halaqahRes.count || 0,
                activeSemester: semesterRes.data || null,
            };
        }
    });

    // Fetch user role
    const { data: userRole } = useQuery({
        queryKey: ['user_role', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            if (session?.user?.id === 'bypass-admin-local') {
                return 'admin' as const;
            }
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', session!.user!.id)
                .single();
            return data?.role as 'admin' | 'guru' | 'viewer';
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-28 rounded-2xl bg-slate-200/80" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-xl bg-slate-200/70" />
                    ))}
                </div>
            </div>
        );
    }

    // Show GuruDashboard for guru role
    if (userRole === 'guru') {
        return <GuruDashboard />;
    }

    const quickActions = [
        {
            title: 'Input Raport Santri',
            desc: 'Isi nilai tahsin, tahfidz, kognitif, & kehadiran',
            href: '/raport/input',
            icon: FileText,
            color: 'from-emerald-600 to-teal-600',
            textColor: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
        },
        {
            title: 'Leger Nilai Semester',
            desc: 'Rekapitulasi seluruh nilai dan status kelulusan',
            href: '/raport/leger',
            icon: BookOpen,
            color: 'from-blue-600 to-indigo-600',
            textColor: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
        {
            title: 'Data Santri & Halaqah',
            desc: 'Kelola santri aktif dan kelompok belajar',
            href: '/students',
            icon: Users,
            color: 'from-amber-600 to-orange-600',
            textColor: 'text-amber-700',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
        },
        {
            title: 'Peringkat & Prestasi',
            desc: 'Pantau santri berprestasi tertinggi per halaqah',
            href: '/raport/peringkat',
            icon: Award,
            color: 'from-purple-600 to-pink-600',
            textColor: 'text-purple-700',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
        },
    ];

    return (
        <div className="space-y-6 font-sans">
            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-lg shadow-emerald-900/10">
                <div className="relative z-10 max-w-2xl space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/50 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-xs border border-emerald-400/20">
                        <Sparkles size={14} className="text-amber-300" />
                        Sistem Informasi Raport Digital
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Ahlan wa Sahlan, {(user as any)?.full_name || 'Administrator'}
                    </h1>
                    <p className="text-sm text-emerald-100/90 leading-relaxed">
                        Kelola data santri, evaluasi perkembangan Al-Qur'an, serta cetak lembar raport Rumah Qur'an Muharrik secara terpadu dan terpercaya.
                    </p>
                </div>

                {/* Decorative background glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-4 -bottom-12 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />
            </div>

            {/* Bento Grid Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Santri */}
                <Card className="hover:shadow-md hover:border-emerald-300/80 transition-all duration-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Santri Aktif
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <Users size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-bold text-slate-900">
                                {stats?.totalStudents ?? 0}
                            </span>
                            <span className="text-xs font-medium text-slate-500">santri</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Raport */}
                <Card className="hover:shadow-md hover:border-blue-300/80 transition-all duration-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Raport Tersimpan
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                <FileText size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-bold text-slate-900">
                                {stats?.totalReports ?? 0}
                            </span>
                            <span className="text-xs font-medium text-slate-500">berkas</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Halaqah */}
                <Card className="hover:shadow-md hover:border-purple-300/80 transition-all duration-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Kelompok Halaqah
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                                <GraduationCap size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-bold text-slate-900">
                                {stats?.totalHalaqah ?? 0}
                            </span>
                            <span className="text-xs font-medium text-slate-500">halaqah</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Semester Aktif */}
                <Card className="hover:shadow-md hover:border-amber-300/80 transition-all duration-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Semester Berjalan
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <Calendar size={18} />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="font-display text-lg font-bold text-slate-900 block truncate">
                                {stats?.activeSemester?.nama || 'Semester Aktif'}
                            </span>
                            <span className="text-xs font-medium text-emerald-700">
                                {stats?.activeSemester?.academic_years?.tahun || 'Tahun Ajaran Aktif'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Grid */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-semibold text-slate-800 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-600" />
                        Aksi Cepat & Menu Pintas
                    </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.title}
                                to={action.href}
                                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                            >
                                <div className="space-y-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${action.color} text-white shadow-sm`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-display text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                            {action.title}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                            {action.desc}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-700 group-hover:gap-2 transition-all">
                                    <span>Buka halaman</span>
                                    <ArrowRight size={14} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
