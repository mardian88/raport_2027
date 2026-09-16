import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { tursoClient as db } from '../../lib/turso-client';
import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    LogOut,
    BookOpen,
    Menu,
    X,
    Award,
    GraduationCap,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

export default function Layout() {
    const { session, loading, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Fetch user role
    const { data: userRole } = useQuery({
        queryKey: ['user_role', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            if (session?.user?.id === 'bypass-admin-local') {
                return 'admin' as const;
            }
            const { data } = await db
                .from('users')
                .select('role')
                .eq('id', session!.user!.id)
                .single();
            return data?.role as 'admin' | 'guru' | 'viewer';
        }
    });

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <p className="text-sm font-medium">Memuat sistem...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        navigate('/login');
        return null;
    }

    // Grouped nav items based on role
    const getNavGroups = (): NavGroup[] => {
        if (userRole === 'guru') {
            return [
                {
                    title: 'Utama',
                    items: [
                        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
                    ]
                },
                {
                    title: 'Penilaian Raport',
                    items: [
                        { href: '/guru/input', label: 'Input Nilai', icon: FileText },
                        { href: '/raport/leger', label: 'Leger Nilai', icon: BookOpen },
                        { href: '/raport/peringkat', label: 'Peringkat', icon: Award },
                    ]
                },
                {
                    title: 'Target Santri',
                    items: [
                        { href: '/student-surah', label: 'Surah per Santri', icon: GraduationCap },
                    ]
                }
            ];
        }

        // Admin and viewer get organized grouped navigation
        return [
            {
                title: 'Utama',
                items: [
                    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
                ]
            },
            {
                title: 'Penilaian Raport',
                items: [
                    { href: '/raport/input', label: 'Input Raport', icon: FileText },
                    { href: '/raport/leger', label: 'Leger Nilai', icon: BookOpen },
                    { href: '/raport/peringkat', label: 'Peringkat', icon: Award },
                ]
            },
            {
                title: 'Santri & Halaqah',
                items: [
                    { href: '/students', label: 'Data Santri', icon: Users },
                    { href: '/teachers', label: 'Data Guru', icon: Users },
                    { href: '/teacher-assignments', label: 'Penugasan Guru', icon: ShieldCheck },
                    { href: '/halaqah', label: 'Data Halaqah', icon: Users },
                    { href: '/student-surah', label: 'Surah per Santri', icon: GraduationCap },
                ]
            },
            {
                title: 'Master & Lembaga',
                items: [
                    { href: '/tahsin', label: 'Data Tahsin', icon: BookOpen },
                    { href: '/surah', label: 'Data Surah', icon: BookOpen },
                    { href: '/academic', label: 'Tahun Ajaran', icon: BookOpen },
                    { href: '/users', label: 'Manajemen User', icon: Users },
                    { href: '/settings', label: 'Pengaturan Lembaga', icon: Settings },
                ]
            }
        ];
    };

    const navGroups = getNavGroups();

    const renderNavContent = () => (
        <div className="flex h-full flex-col">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white shadow-md shadow-emerald-700/20">
                        <Sparkles size={20} className="text-emerald-100" />
                    </div>
                    <div>
                        <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">
                            RQM Raport
                        </h1>
                        <p className="text-xs font-medium text-emerald-700">
                            Rumah Qur'an Muharrik
                        </p>
                    </div>
                </div>
                {mobileOpen && (
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
                        aria-label="Tutup menu"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
                {navGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                            {group.title}
                        </p>
                        <div className="space-y-0.5 pt-1">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    location.pathname === item.href ||
                                    (item.href !== '/' && location.pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                            isActive
                                                ? "bg-emerald-50 text-emerald-800 font-semibold shadow-xs border border-emerald-200/60"
                                                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                        )}
                                    >
                                        <Icon
                                            size={18}
                                            className={cn(
                                                "transition-colors",
                                                isActive
                                                    ? "text-emerald-600"
                                                    : "text-slate-600 group-hover:text-slate-600"
                                            )}
                                        />
                                        <span className="flex-1">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profile & Logout */}
            <div className="border-t border-slate-200/80 bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center gap-3 px-2">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-xs">
                        {session.user.email?.[0].toUpperCase()}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                            {session.user.email}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 capitalize">
                            {userRole || 'User'}
                        </span>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-[0.98]"
                    onClick={() => signOut()}
                >
                    <LogOut size={16} />
                    Keluar
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50/70 text-slate-900 font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-slate-200/80 bg-white md:flex">
                {renderNavContent()}
            </aside>

            {/* Mobile Drawer (Backdrop + Slide-over) */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative z-50 flex w-72 max-w-xs flex-col bg-white shadow-2xl">
                        {renderNavContent()}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile Header Bar */}
                <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:hidden">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                            aria-label="Buka menu navigasi"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                                RQM
                            </div>
                            <span className="font-display font-bold text-slate-900">
                                Raport RQM
                            </span>
                        </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 capitalize">
                        {userRole || 'User'}
                    </span>
                </header>

                {/* Main Content Body */}
                <main id="main-content" className="flex-1 overflow-auto">
                    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

