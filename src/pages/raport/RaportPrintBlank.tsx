import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { SettingsLembaga } from '../../types';
import { PrintSettings } from '../../components/raport/PrintSettings';

export default function RaportPrintBlank() {
    const [theme, setTheme] = useState('black');
    const [size, setSize] = useState<'A4' | 'F4'>('A4');
    const [breakBeforeKognitif, setBreakBeforeKognitif] = useState(false);
    const [breakBeforeTahsin, setBreakBeforeTahsin] = useState(false);
    const [breakBeforeUAS, setBreakBeforeUAS] = useState(false);

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings_lembaga').select('*').single();
            return data as SettingsLembaga;
        }
    });

    if (!settings) return <div className="p-10">Loading Settings...</div>;

    // Dynamic styles based on theme
    const headerStyle = { borderColor: theme };

    // Helper for empty rows
    const renderEmptyRows = (count: number) => {
        return Array.from({ length: count }).map((_, idx) => (
            <tr key={idx} className="border-b border-gray-300 h-8">
                <td className="p-2 border-r border-gray-300 w-10 text-center">{idx + 1}</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300 w-20"></td>
                <td className="p-2 w-40"></td>
            </tr>
        ));
    };

    return (
        <div className={`bg-white text-black font-sans mx-auto p-8 min-h-screen print:p-0 ${size === 'A4' ? 'max-w-[210mm]' : 'max-w-[215mm]'}`}>
            <PrintSettings
                settings={settings}
                onSettingsChange={() => { }}
                onThemeChange={setTheme}
                onSizeChange={setSize}
                breakBeforeKognitif={breakBeforeKognitif}
                setBreakBeforeKognitif={setBreakBeforeKognitif}
                breakBeforeTahsin={breakBeforeTahsin}
                setBreakBeforeTahsin={setBreakBeforeTahsin}
                breakBeforeUAS={breakBeforeUAS}
                setBreakBeforeUAS={setBreakBeforeUAS}
            />

            {/* HEADER / KOP */}
            <div className="flex items-center gap-4 border-b-4 border-double pb-4 mb-6" style={headerStyle}>
                {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
                )}
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ color: theme !== 'black' ? theme : 'inherit' }}>{settings.nama_lembaga}</h1>
                    <p className="text-sm">{settings.alamat}</p>
                    <p className="text-sm">{settings.kota} - Telp: {settings.nomor_kontak}</p>
                </div>
            </div>

            <div className="text-center mb-6">
                <h2 className="text-xl font-bold uppercase underline" style={{ textDecorationColor: theme }}>Laporan Hasil Belajar Santri</h2>
            </div>

            {/* IDENTITAS */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                    <span className="w-32">Nama Santri</span>
                    <span>: ........................................................</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                    <span className="w-32">Tahun Ajaran</span>
                    <span>: ........................................................</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                    <span className="w-32">Nomor Induk</span>
                    <span>: ........................................................</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                    <span className="w-32">Semester</span>
                    <span>: ........................................................</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                    <span className="w-32">Halaqah</span>
                    <span>: ........................................................</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                    <span className="w-32">Guru Pembimbing</span>
                    <span>: ........................................................</span>
                </div>
            </div>

            {/* CONTENT */}
            <div className="space-y-6">
                {/* AKHLAK */}
                <div>
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>A. Akhlak & Perilaku</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="p-2 border-r border-gray-300 w-10">No</th>
                                <th className="p-2 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-2 border-r border-gray-300 w-20">Nilai (10-100)</th>
                                <th className="p-2 w-40">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderEmptyRows(5)}
                        </tbody>
                    </table>
                </div>

                {/* KEDISIPLINAN */}
                <div>
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>B. Kedisiplinan</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="p-2 border-r border-gray-300 w-10">No</th>
                                <th className="p-2 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-2 border-r border-gray-300 w-20">Nilai (10-100)</th>
                                <th className="p-2 w-40">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderEmptyRows(4)}
                        </tbody>
                    </table>
                </div>

                {/* KOGNITIF */}
                <div>
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>C. Kognitif Qur'ani</h3>

                    {/* TAHFIDZ DETAIL */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-1">1. Tahfidz (Hafalan)</h4>
                        <table className="w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr>
                                    <th className="p-2 border-r border-gray-300 w-10">No</th>
                                    <th className="p-2 border-r border-gray-300 text-left">Nama Surah</th>
                                    <th className="p-2 border-r border-gray-300 w-20 text-center">KB</th>
                                    <th className="p-2 border-r border-gray-300 w-20 text-center">KH</th>
                                    <th className="p-2 w-20 text-center">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 5 }).map((_, idx) => (
                                    <tr key={idx} className="border-b border-gray-300 h-8">
                                        <td className="p-2 border-r border-gray-300 text-center">{idx + 1}</td>
                                        <td className="p-2 border-r border-gray-300"></td>
                                        <td className="p-2 border-r border-gray-300 text-center"></td>
                                        <td className="p-2 border-r border-gray-300 text-center"></td>
                                        <td className="p-2 text-center font-medium"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-500 mt-1">* KB: Kemampuan Bacaan, KH: Kemampuan Hafalan</p>
                    </div>

                    {/* TAHSIN */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-1">2. Tahsin (Perbaikan Bacaan)</h4>
                        <table className="w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr>
                                    <th className="p-2 border-r border-gray-300 w-10">No</th>
                                    <th className="p-2 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                    <th className="p-2 border-r border-gray-300 w-20">Nilai (10-100)</th>
                                    <th className="p-2 w-40">Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderEmptyRows(3)}
                            </tbody>
                        </table>
                    </div>

                    {/* UAS */}
                    <div>
                        <h4 className="font-semibold text-sm mb-1">3. Ujian Akhir Semester</h4>
                        <table className="w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr>
                                    <th className="p-2 border-r border-gray-300 text-left">Materi Ujian</th>
                                    <th className="p-2 w-20 text-center">Nilai (10-100)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-300 h-8">
                                    <td className="p-2 border-r border-gray-300">Ujian Tulis</td>
                                    <td className="p-2 text-center font-bold"></td>
                                </tr>
                                {settings.show_uas_lisan !== false && (
                                    <tr className="h-8">
                                        <td className="p-2 border-r border-gray-300">Ujian Lisan</td>
                                        <td className="p-2 text-center font-bold"></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* NILAI AKHIR */}
                <div className="mt-8 border p-4 bg-gray-50 print:bg-transparent" style={{ borderColor: theme }}>
                    <h3 className="font-bold text-center mb-4">REKAPITULASI NILAI AKHIR</h3>
                    <div className="grid grid-cols-4 gap-4 text-center h-16">
                        <div>
                            <p className="text-xs uppercase">Akhlak</p>
                            <p className="font-bold text-lg mt-2">.......</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase">Kedisiplinan</p>
                            <p className="font-bold text-lg mt-2">.......</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase">Kognitif</p>
                            <p className="font-bold text-lg mt-2">.......</p>
                        </div>
                        <div className="border-l pl-4" style={{ borderColor: theme }}>
                            <p className="text-xs uppercase font-bold">Total / Predikat</p>
                            <p className="font-bold text-xl mt-2">....... / .......</p>
                        </div>
                    </div>
                </div>

                {/* CATATAN */}
                <div className="mt-4 border p-4 min-h-[100px]" style={{ borderColor: theme }}>
                    <h3 className="font-bold text-sm mb-2">Catatan:</h3>
                    <div className="border-b border-dotted border-gray-300 h-6 mb-2"></div>
                    <div className="border-b border-dotted border-gray-300 h-6 mb-2"></div>
                    <div className="border-b border-dotted border-gray-300 h-6 mb-2"></div>
                </div>

                {/* TANDA TANGAN */}
                <div className="mt-16 flex justify-between text-center text-sm break-inside-avoid">
                    <div className="w-1/3">
                        <p className="mb-16">Orang Tua / Wali</p>
                        <p className="font-bold border-t inline-block min-w-[150px] pt-1" style={{ borderColor: theme }}>
                            ( ................................... )
                        </p>
                    </div>
                    <div className="w-1/3">
                        <p className="mb-16">Guru Pembimbing</p>
                        <p className="font-bold border-t inline-block min-w-[150px] pt-1 mt-16" style={{ borderColor: theme }}>
                            ( ................................... )
                        </p>
                    </div>
                    <div className="w-1/3">
                        <p className="mb-16">Kepala Lembaga</p>
                        {settings.signature_url && (
                            <img src={settings.signature_url} alt="Signature" className="h-16 mx-auto -mt-16 mb-0 object-contain" />
                        )}
                        <p className="font-bold underline mt-16">{settings.nama_kepala_lembaga}</p>
                        <p>NIP. {settings.nip_kepala_lembaga || '-'}</p>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-8 text-center text-xs text-gray-500 print:fixed print:bottom-4 print:left-0 print:w-full">
                {settings.footer_raport || "Dicetak melalui Sistem Informasi Raport RQM"}
            </div>
        </div>
    );
}

