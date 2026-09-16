import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tursoClient as db } from '../../lib/turso-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, Eye, EyeOff, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Map username 'admin' to specific email, otherwise use input as email
        let loginEmail = email.trim();
        if (loginEmail.toLowerCase() === 'admin') {
            loginEmail = 'admin@rqm.com';
        }

        const { error } = await db.auth.signInWithPassword({
            email: loginEmail,
            password,
        });

        if (error) {
            setError(error.message || 'Gagal masuk. Periksa kembali username dan password Anda.');
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-radial from-emerald-50/70 via-slate-50 to-slate-100 p-4 font-sans">
            {/* Background Decorative Pattern */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
                <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
                <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-100/50 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md space-y-4">
                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-700/25">
                        <BookOpen size={28} className="text-emerald-50" />
                    </div>
                    <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        RQM Raport
                    </h1>
                    <p className="text-sm font-medium text-emerald-800">
                        Rumah Qur'an Muharrik
                    </p>
                </div>

                {/* Login Card */}
                <Card className="border-slate-200/90 shadow-xl shadow-slate-200/60 backdrop-blur-xs">
                    <CardHeader className="space-y-1 pb-4 text-center">
                        <CardTitle className="text-xl font-semibold text-slate-800">
                            Masuk ke Sistem
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                            Masukkan akun Anda untuk mengelola penilaian santri
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs font-medium text-rose-700 animate-fade-in">
                                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="identifier" className="text-xs font-semibold text-slate-700">
                                    Username atau Email
                                </Label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="identifier"
                                        type="text"
                                        placeholder="admin@rqm.com atau admin"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-9 h-10 border-slate-200 focus-visible:ring-emerald-500/30"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Kosongkan jika baru pertama login"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-9 pr-10 h-10 border-slate-200 focus-visible:ring-emerald-500/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-10 font-semibold gap-2 shadow-md shadow-emerald-700/20"
                                disabled={loading}
                            >
                                {loading ? 'Memverifikasi...' : 'Masuk ke Raport'}
                                {!loading && <ArrowRight size={16} />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer note */}
                <p className="text-center text-xs text-slate-600">
                    &copy; 2026 Rumah Qur'an Muharrik. Hak cipta dilindungi.
                </p>
            </div>
        </div>
    );
}
