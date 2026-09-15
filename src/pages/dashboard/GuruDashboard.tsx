import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { BookOpen, FileText, BarChart3, CheckCircle2, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

export default function GuruDashboard() {
    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <Sparkles size={14} className="text-emerald-600" />
                    Panel Ustadz & Ustadzah
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    Ahlan wa Sahlan, Asatidzah!
                </h1>
                <p className="text-sm text-slate-500">
                    Panduan terstruktur untuk mengelola dan memasukkan nilai santri binaan halaqah Anda.
                </p>
            </div>

            {/* Step-by-Step Guide */}
            <Card className="border-emerald-200/80 bg-linear-to-br from-emerald-50/60 via-white to-white shadow-sm">
                <CardHeader className="border-b border-emerald-100/80 pb-4">
                    <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold text-emerald-950">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        Alur 3 Langkah Penilaian Santri
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Step 1 */}
                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-2xs hover:border-emerald-200 hover:shadow-xs transition-all">
                        <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-base shadow-sm shadow-emerald-600/30">
                                1
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="font-display font-semibold text-base text-slate-900">
                                Kelola Target Surah per Santri
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Aktifkan daftar surah yang dipelajari dan dihafal santri pada semester ini. Anda dapat mengaturnya sekaligus per halaqah atau perorangan.
                            </p>
                            <div className="pt-1">
                                <Link to="/student-surah">
                                    <Button size="sm" className="gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        Buka Surah per Santri
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-2xs hover:border-emerald-200 hover:shadow-xs transition-all">
                        <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-base shadow-sm shadow-teal-600/30">
                                2
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="font-display font-semibold text-base text-slate-900">
                                Input Nilai Santri Halaqah
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Masukkan penilaian sesuai bidang materi yang diampu (Tahfidz, Tahsin, Kognitif UAS, Akhlak, serta Kehadiran).
                            </p>
                            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3">
                                <p className="text-xs font-semibold text-emerald-900 mb-1">💡 Panduan Ringkas:</p>
                                <ul className="text-xs text-emerald-800 space-y-0.5 ml-4 list-disc">
                                    <li><strong>Guru Tahfidz:</strong> Input progress hafalan per ayat & surah (Kelancaran & Kebenaran).</li>
                                    <li><strong>Guru Tahsin:</strong> Input 9 indikator tajwid + nilai ujian tulis & lisan.</li>
                                </ul>
                            </div>
                            <div className="pt-1">
                                <Link to="/guru/input">
                                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-2">
                                        <FileText className="h-4 w-4" />
                                        Mulai Input Nilai
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-2xs hover:border-emerald-200 hover:shadow-xs transition-all">
                        <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-sm shadow-indigo-600/30">
                                3
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="font-display font-semibold text-base text-slate-900">
                                Tinjau Leger Nilai & Peringkat
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Periksa rekapitulasi nilai akhir seluruh santri di halaqah Anda untuk memastikan tidak ada kolom nilai yang tertinggal sebelum masa cetak raport.
                            </p>
                            <div className="pt-1">
                                <Link to="/raport/leger">
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Lihat Leger Nilai
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="border-amber-200 bg-amber-50/70 shadow-2xs">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <HelpCircle size={18} className="text-amber-600 shrink-0" />
                        Catatan Penting Pengoperasian
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-1 text-xs text-amber-900">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p>
                            <strong>Filter Otomatis:</strong> Sistem secara otomatis membatasi daftar santri hanya pada kelompok halaqah yang ditugaskan kepada Anda.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p>
                            <strong>Penyimpanan Aman:</strong> Nilai yang telah disimpan dapat diperbarui sewaktu-waktu selama semester aktif belum ditutup oleh Administrator.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
