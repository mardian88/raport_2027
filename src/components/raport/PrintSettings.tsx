import { useState, useRef } from 'react';
import { Settings, X, Upload, Save, Palette, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../lib/supabase';
import type { SettingsLembaga, User } from '../../types';

interface PrintSettingsProps {
    settings: SettingsLembaga;
    teacher?: User | null;
    onSettingsChange: () => void;
    onThemeChange: (theme: string) => void;
    onSizeChange: (size: 'A4' | 'F4') => void;
    breakBeforeKognitif: boolean;
    setBreakBeforeKognitif: (value: boolean) => void;
    breakBeforeTahsin: boolean;
    setBreakBeforeTahsin: (value: boolean) => void;
    breakBeforeUAS: boolean;
    setBreakBeforeUAS: (value: boolean) => void;
}

export function PrintSettings({
    settings,
    teacher,
    onSettingsChange,
    onThemeChange,
    onSizeChange,
    breakBeforeKognitif,
    setBreakBeforeKognitif,
    breakBeforeTahsin,
    setBreakBeforeTahsin,
    breakBeforeUAS,
    setBreakBeforeUAS
}: PrintSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState('black');
    const [size, setSize] = useState<'A4' | 'F4'>('A4');
    const [isUploading, setIsUploading] = useState(false);

    // Form states for quick edit
    const [namaLembaga, setNamaLembaga] = useState(settings.nama_lembaga);
    const [alamat, setAlamat] = useState(settings.alamat || '');
    const [kota, setKota] = useState(settings.kota || '');
    const [kontak, setKontak] = useState(settings.nomor_kontak || '');

    const logoInputRef = useRef<HTMLInputElement>(null);
    const headSigInputRef = useRef<HTMLInputElement>(null);
    const teacherSigInputRef = useRef<HTMLInputElement>(null);

    const handleThemeChange = (t: string) => {
        setTheme(t);
        onThemeChange(t);
    };

    const handleSizeChange = (s: 'A4' | 'F4') => {
        setSize(s);
        onSizeChange(s);
    };

    const handleSaveKop = async () => {
        try {
            const { error } = await supabase
                .from('settings_lembaga')
                .update({
                    nama_lembaga: namaLembaga,
                    alamat,
                    kota,
                    nomor_kontak: kontak
                })
                .eq('id', settings.id);

            if (error) throw error;
            onSettingsChange();
            alert('Data Kop berhasil disimpan');
        } catch (e: any) {
            alert('Gagal menyimpan: ' + e.message);
        }
    };

    const handleFileUpload = async (file: File, type: 'logo' | 'head_sig' | 'teacher_sig') => {
        if (!file) return;
        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('raport-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('raport-assets')
                .getPublicUrl(filePath);

            // Update Database
            if (type === 'logo') {
                const { error } = await supabase.from('settings_lembaga').update({ logo_url: publicUrl }).eq('id', settings.id);
                if (error) throw error;
            } else if (type === 'head_sig') {
                const { error } = await supabase.from('settings_lembaga').update({ signature_url: publicUrl }).eq('id', settings.id);
                if (error) throw error;
            } else if (type === 'teacher_sig' && teacher) {
                const { error } = await supabase.from('users').update({ signature_url: publicUrl }).eq('id', teacher.id);
                if (error) throw error;
            }

            onSettingsChange();
            // alert('Upload berhasil!'); 
        } catch (e: any) {
            console.error('Upload failed:', e);
            alert('Gagal upload: ' + (e.message || e.error_description || JSON.stringify(e)));
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                className="fixed top-4 right-4 z-50 shadow-lg no-print"
                onClick={() => setIsOpen(true)}
            >
                <Settings className="mr-2 h-4 w-4" /> Kustomisasi
            </Button>
        );
    }

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto border-l no-print p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Pengaturan Cetak</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-6">
                {/* THEME & SIZE */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Palette className="h-4 w-4" /> Tampilan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs mb-2 block">Warna Tema</Label>
                            <div className="flex gap-2">
                                {['black', 'blue', 'green', 'red'].map(c => (
                                    <button
                                        key={c}
                                        className={`w-8 h-8 rounded-full border-2 ${theme === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => handleThemeChange(c)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs mb-2 block">Ukuran Kertas</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={size === 'A4' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleSizeChange('A4')}
                                >
                                    A4
                                </Button>
                                <Button
                                    variant={size === 'F4' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleSizeChange('F4')}
                                >
                                    F4 (Folio)
                                </Button>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <Button
                                className="w-full"
                                variant="default"
                                onClick={() => window.print()}
                            >
                                <FileText className="mr-2 h-4 w-4" /> Cetak / Simpan PDF
                            </Button>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Gunakan "Save as PDF" di dialog cetak
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* PAGE BREAK SETTINGS */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Pengaturan Halaman
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Halaman Baru Sebelum:</Label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={breakBeforeKognitif}
                                        onChange={(e) => setBreakBeforeKognitif(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-xs">C. Kognitif Qur'ani</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={breakBeforeTahsin}
                                        onChange={(e) => setBreakBeforeTahsin(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-xs">2. Tahsin</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={breakBeforeUAS}
                                        onChange={(e) => setBreakBeforeUAS(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-xs">3. Ujian Akhir Semester</span>
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">
                                * Centang untuk memulai bagian di halaman baru saat mencetak
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* KOP SETTINGS */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Data Kop
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Nama Lembaga</Label>
                            <Input value={namaLembaga} onChange={e => setNamaLembaga(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Alamat</Label>
                            <Input value={alamat} onChange={e => setAlamat(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Kota</Label>
                            <Input value={kota} onChange={e => setKota(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Kontak</Label>
                            <Input value={kontak} onChange={e => setKontak(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <Button size="sm" className="w-full mt-2" onClick={handleSaveKop}>
                            <Save className="mr-2 h-3 w-3" /> Simpan Perubahan
                        </Button>
                    </CardContent>
                </Card>

                {/* UPLOADS */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Upload Aset
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* LOGO */}
                        <div className="space-y-2">
                            <Label className="text-xs">Logo Lembaga</Label>
                            <div className="flex items-center gap-3">
                                {settings.logo_url ? (
                                    <img src={settings.logo_url} className="h-10 w-10 object-contain border rounded" />
                                ) : (
                                    <div className="h-10 w-10 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No Img</div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        ref={logoInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        disabled={isUploading}
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-3 w-3" /> {isUploading ? '...' : 'Ganti Logo'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* HEADMASTER SIG */}
                        <div className="space-y-2">
                            <Label className="text-xs">TTD Kepala Lembaga</Label>
                            <div className="flex items-center gap-3">
                                {settings.signature_url ? (
                                    <img src={settings.signature_url} className="h-10 w-20 object-contain border rounded" />
                                ) : (
                                    <div className="h-10 w-20 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No Sig</div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        ref={headSigInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'head_sig')}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        disabled={isUploading}
                                        onClick={() => headSigInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-3 w-3" /> {isUploading ? '...' : 'Upload TTD'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* TEACHER SIG */}
                        <div className="space-y-2">
                            <Label className="text-xs">TTD Guru ({teacher?.full_name || '...'})</Label>
                            <div className="flex items-center gap-3">
                                {teacher?.signature_url ? (
                                    <img src={teacher.signature_url} className="h-10 w-20 object-contain border rounded" />
                                ) : (
                                    <div className="h-10 w-20 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No Sig</div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        ref={teacherSigInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'teacher_sig')}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        disabled={isUploading || !teacher}
                                        onClick={() => teacherSigInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-3 w-3" /> {isUploading ? '...' : 'Upload TTD'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

