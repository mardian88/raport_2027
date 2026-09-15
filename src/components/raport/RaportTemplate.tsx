import type { ReportCard, SettingsLembaga, User, TahsinMaster, Student, Semester, AcademicYear, TahfidzProgress } from '../../types';
import { formatScore, getPredikat, getMotivationalMessage, getCategoryNote, calculateFinalScore } from '../../utils/grading';

interface RaportTemplateProps {
    report: ReportCard & {
        student: Student & { halaqah_data?: any },
        semester: Semester & { academic_year: AcademicYear },
        tahfidz_progress?: TahfidzProgress[]
    };
    settings: SettingsLembaga;
    guruPembimbing?: User;
    tahsinMasterItems?: TahsinMaster[];
    theme: string;
    options: {
        size: 'A4' | 'F4';
        breakBeforeKognitif: boolean;
        breakBeforeTahsin: boolean;
        breakBeforeUAS: boolean;
        showWatermark?: boolean;
    };
    pageBreakAfter?: boolean; // For bulk printing
}

export function RaportTemplate({
    report,
    settings,
    guruPembimbing,
    tahsinMasterItems,
    theme,
    options,
    pageBreakAfter = false
}: RaportTemplateProps) {
    const { student, semester, akhlak, tahfidz_progress, sakit, izin, alpa } = report;
    const academicYear = semester.academic_year?.tahun_ajaran;

    // MIGRATE KEDISIPLINAN: Ensure "Ketepatan Waktu" exists for legacy data
    // If "Ketepatan Waktu" is missing but "Kehadiran" exists, copy the value
    const kedisiplinan = { ...report.kedisiplinan };
    if (kedisiplinan["Kehadiran"] !== undefined && kedisiplinan["Ketepatan Waktu"] === undefined) {
        kedisiplinan["Ketepatan Waktu"] = kedisiplinan["Kehadiran"];
    }

    const kognitif = report.kognitif;

    // SORT TAHFIDZ PROGRESS BY NOMOR SURAH ASCENDING
    const sortedTahfidz = tahfidz_progress ? [...tahfidz_progress].sort((a, b) => {
        const numA = a.surah?.nomor_surah || 999;
        const numB = b.surah?.nomor_surah || 999;
        return numA - numB;
    }) : [];

    // Helper to render Tahsin rows based on configuration
    const renderTahsinRows = () => {
        const scores = kognitif.Tahsin || {};

        // Determine active items
        // Priority: Halaqah Config -> Global Active Items (Fallback)
        const halaqahItems = student.halaqah_data?.tahsin_items;

        let itemsToRender: string[] = [];

        if (halaqahItems && halaqahItems.length > 0) {
            // If Halaqah has config, use it.
            // Sort them based on tahsinMasterItems order if available
            if (tahsinMasterItems) {
                itemsToRender = tahsinMasterItems
                    .filter(m => halaqahItems.includes(m.nama_item))
                    .map(m => m.nama_item);

                // Add any items that are in halaqahItems but not in master (legacy/custom?)
                const masterNames = tahsinMasterItems.map(m => m.nama_item);
                const extraItems = halaqahItems.filter((i: string) => !masterNames.includes(i));
                itemsToRender = [...itemsToRender, ...extraItems];
            } else {
                itemsToRender = halaqahItems;
            }
        } else {
            // Fallback to all active master items
            itemsToRender = tahsinMasterItems?.map(m => m.nama_item) || [];
        }

        // If still empty (e.g. master not loaded), try to show keys from scores
        if (itemsToRender.length === 0) {
            itemsToRender = Object.keys(scores);
        }

        // CRITICAL: Filter out obsolete items like "Panjang Pendek"
        itemsToRender = itemsToRender.filter(item =>
            item !== 'Panjang Pendek' && item !== 'Panjang-Pendek'
        );

        if (itemsToRender.length > 0) {
            return itemsToRender.map((item, idx) => (
                <tr key={item} className="border-b border-gray-300">
                    <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                    <td className="p-1 border-r border-gray-300">{item}</td>
                    <td className="p-1 text-center font-medium border-r border-gray-300">{scores[item] ?? '-'}</td>
                    <td className="p-1 text-center text-xs">
                        {scores[item] ? getPredikat(scores[item]) : '-'}
                    </td>
                </tr>
            ));
        }

        // Fallback if no valid items found (e.g. legacy data structure)
        // Also filter out Panjang Pendek from fallback
        const filteredScores = Object.entries(scores).filter(([key]) =>
            key !== 'Panjang Pendek' && key !== 'Panjang-Pendek'
        );

        return filteredScores.map(([key, val], idx) => (
            <tr key={key} className="border-b border-gray-300">
                <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                <td className="p-1 border-r border-gray-300">{key}</td>
                <td className="p-1 text-center font-medium border-r border-gray-300">{val}</td>
                <td className="p-1 text-center text-xs">
                    {getPredikat(val)}
                </td>
            </tr>
        ));
    };

    // Dynamic styles based on theme
    const headerStyle = { borderColor: theme };
    const showWatermark = options.showWatermark !== false;

    return (
        <div
            className={`bg-white text-black font-sans mx-auto p-8 min-h-screen relative print:p-0 ${options.size === 'A4' ? 'max-w-[210mm]' : 'max-w-[215mm]'} ${pageBreakAfter ? 'print:break-after-page' : ''}`}
        >
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
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                <div className="flex">
                    <span className="w-32">Nama Santri</span>
                    <span>: {student.nama}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Tahun Ajaran</span>
                    <span>: {academicYear}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Nomor Induk</span>
                    <span>: {student.nis || '-'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Semester</span>
                    <span>: {semester.nama}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Halaqah</span>
                    <span>: {student.halaqah_data?.nama || student.halaqah || '-'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Guru Pembimbing</span>
                    <span>: {guruPembimbing?.full_name || '-'}</span>
                </div>
            </div>

            {/* CONTENT */}
            <div className="space-y-6 relative">
                {/* Watermark Logo */}
                {settings.logo_url && showWatermark && (
                    <>
                        {/* Style injection for Fixed Position Watermark (Only once?) No, each component injects. Browser handles redundancy. */}
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @media print {
                                    .watermark-logo {
                                        position: fixed;
                                        top: 50%;
                                        left: 50%;
                                        transform: translate(-50%, -50%);
                                        width: 400px;
                                        height: 400px;
                                        opacity: 0.05;
                                        z-index: 0;
                                        pointer-events: none;
                                    }
                                }
                            `
                        }} />
                        <div className="watermark-logo hidden print:block">
                            <img
                                src={settings.logo_url}
                                alt="Watermark"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </>
                )}

                {/* AKHLAK */}
                <div className="relative z-10">
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>A. Akhlak & Perilaku</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                            <tr>
                                <th className="p-1.5 border-r border-gray-300 w-8">No</th>
                                <th className="p-1.5 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-1.5 border-r border-gray-300 w-16">Nilai</th>
                                <th className="p-1.5 w-24">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(akhlak).map(([key, val], idx) => (
                                <tr key={key} className="border-b border-gray-300">
                                    <td className="p-1.5 border-r border-gray-300 text-center">{idx + 1}</td>
                                    <td className="p-1.5 border-r border-gray-300">{key}</td>
                                    <td className="p-1.5 text-center font-medium border-r border-gray-300">{val}</td>
                                    <td className="p-1.5 text-center text-xs">
                                        {getPredikat(val)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-2 border border-gray-300 p-2 bg-gray-50 print:bg-white">
                        <p
                            className="text-xs italic text-left"
                            dangerouslySetInnerHTML={{
                                __html: getCategoryNote(student.nama, akhlak, 'akhlak')
                            }}
                        />
                    </div>
                </div>

                {/* KEDISIPLINAN */}
                <div className="relative z-10">
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>B. Kedisiplinan</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                            <tr>
                                <th className="p-1.5 border-r border-gray-300 w-8">No</th>
                                <th className="p-1.5 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-1.5 border-r border-gray-300 w-16">Nilai</th>
                                <th className="p-1.5 w-24">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(kedisiplinan).map(([key, val], idx) => (
                                <tr key={key} className="border-b border-gray-300">
                                    <td className="p-1.5 border-r border-gray-300 text-center">{idx + 1}</td>
                                    <td className="p-1.5 border-r border-gray-300">{key}</td>
                                    <td className="p-1.5 text-center font-medium border-r border-gray-300">{val}</td>
                                    <td className="p-1.5 text-center text-xs">
                                        {getPredikat(val)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-2 border border-gray-300 p-2 bg-gray-50 print:bg-white">
                        <p
                            className="text-xs italic text-left"
                            dangerouslySetInnerHTML={{
                                __html: getCategoryNote(student.nama, kedisiplinan, 'kedisiplinan')
                            }}
                        />
                    </div>
                </div>

                {/* KOGNITIF */}
                <div className={`relative z-10 ${options.breakBeforeKognitif ? 'print:break-before-page' : ''}`}>
                    <h3 className="font-bold mb-1.5 border-b inline-block" style={headerStyle}>C. Kognitif Qur'ani</h3>

                    {/* TAHFIDZ DETAIL */}
                    <div className="mb-2">
                        <h4 className="font-semibold text-xs mb-0.5">1. Tahfidz (Hafalan)</h4>
                        <table className="w-full border border-gray-300 text-xs">
                            <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                                <tr>
                                    <th className="p-1 border-r border-gray-300 w-8">No</th>
                                    <th className="p-1 border-r border-gray-300 text-left">Nama Surah</th>
                                    <th className="p-1 border-r border-gray-300 w-14 text-center">KB</th>
                                    <th className="p-1 border-r border-gray-300 w-14 text-center">KH</th>
                                    <th className="p-1 w-16 text-center">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTahfidz && sortedTahfidz.length > 0 ? (
                                    sortedTahfidz.map((item, idx) => (
                                        <tr key={item.id} className="border-b border-gray-300">
                                            <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                                            <td className="p-1 border-r border-gray-300">{item.surah?.nama_surah}</td>
                                            <td className="p-1 border-r border-gray-300 text-center">{item.kb}</td>
                                            <td className="p-1 border-r border-gray-300 text-center">{item.kh}</td>
                                            <td className="p-1 text-center font-medium">{formatScore((item.kb + item.kh) / 2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-2 text-center text-gray-500 italic text-xs">Belum ada data hafalan</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <p className="text-[10px] text-gray-500 mt-0.5">* KB: Kemampuan Bacaan, KH: Kemampuan Hafalan</p>
                    </div>

                    {/* TAHSIN */}
                    <div className={`mb-2 ${options.breakBeforeTahsin ? 'print:break-before-page' : ''}`}>
                        <h4 className="font-semibold text-xs mb-0.5">2. Tahsin (Perbaikan Bacaan)</h4>
                        <table className="w-full border border-gray-300 text-xs">
                            <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                                <tr>
                                    <th className="p-1 border-r border-gray-300 w-8">No</th>
                                    <th className="p-1 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                    <th className="p-1 border-r border-gray-300 w-14">Nilai</th>
                                    <th className="p-1 w-20">Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTahsinRows()}
                            </tbody>
                        </table>
                    </div>

                </div>


                {/* UAS & ATTENDANCE */}
                <div className={`relative z-10 ${options.breakBeforeUAS ? 'print:break-before-page' : ''}`}>
                    {/* UAS */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-xs mb-0.5">3. Ujian Akhir Semester</h4>
                        <table className="w-full border border-gray-300 text-xs">
                            <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                                <tr>
                                    <th className="p-1 border-r border-gray-300 text-left">Materi Ujian</th>
                                    <th className="p-1 w-16 text-center">Nilai</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-300">
                                    <td className="p-1 border-r border-gray-300">Ujian Akhir Semester (UAS) Tulis</td>
                                    <td className="p-1 text-center font-bold">{report.uas_tulis}</td>
                                </tr>
                                {settings.show_uas_lisan !== false && (
                                    <tr>
                                        <td className="p-1 border-r border-gray-300">Ujian Akhir Semester (UAS) Lisan</td>
                                        <td className="p-1 text-center font-bold">{report.uas_lisan}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* NILAI AKHIR */}
                <div className="mt-8 border p-4 bg-gray-50 print:bg-transparent" style={{ borderColor: theme }}>
                    <h3 className="font-bold text-center mb-4">REKAPITULASI NILAI AKHIR</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-xs uppercase">Akhlak</p>
                            <p className="font-bold text-lg">{formatScore(report.nilai_akhir_akhlak)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase">Kedisiplinan</p>
                            <p className="font-bold text-lg">{formatScore(report.nilai_akhir_kedisiplinan)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase">Kognitif</p>
                            <p className="font-bold text-lg">{formatScore(report.nilai_akhir_kognitif)}</p>
                        </div>
                        <div className="border-l pl-4" style={{ borderColor: theme }}>
                            <p className="text-xs uppercase font-bold">Total / Predikat</p>
                            <p className="font-bold text-xl">
                                {(() => {
                                    // C-1 + C-2 FIX: gunakan calculateFinalScore dengan weighted
                                    // (bobot dari settings — sesuai UI Pengaturan Lembaga).
                                    // Konsisten dengan LegerNilai dan view DB.
                                    const finalScore = calculateFinalScore(
                                        report.nilai_akhir_akhlak,
                                        report.nilai_akhir_kedisiplinan,
                                        report.nilai_akhir_kognitif,
                                        {
                                            bobot_akhlak: settings.bobot_akhlak,
                                            bobot_kedisiplinan: settings.bobot_kedisiplinan,
                                            bobot_kognitif: settings.bobot_kognitif,
                                        }
                                    );
                                    return `${formatScore(finalScore)} / ${getPredikat(finalScore, settings.skala_penilaian)}`;
                                })()}
                            </p>
                        </div>
                    </div>

                    {/* MOTIVATIONAL MESSAGE */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: theme }}>
                        <p
                            className="text-sm italic text-center text-gray-700"
                            dangerouslySetInnerHTML={{
                                __html: (() => {
                                    // C-1 + C-2 FIX: gunakan helper yang sama dengan kalkulasi di atas
                                    const finalScore = calculateFinalScore(
                                        report.nilai_akhir_akhlak,
                                        report.nilai_akhir_kedisiplinan,
                                        report.nilai_akhir_kognitif,
                                        {
                                            bobot_akhlak: settings.bobot_akhlak,
                                            bobot_kedisiplinan: settings.bobot_kedisiplinan,
                                            bobot_kognitif: settings.bobot_kognitif,
                                        }
                                    );
                                    const grade = getPredikat(finalScore, settings.skala_penilaian);
                                    return getMotivationalMessage(student.nama, grade, finalScore);
                                })()
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ATTENDANCE & DATE */}
            <div className="mt-8 flex justify-between items-start">
                <div className="w-1/2">
                    <table className="w-full border border-gray-300 text-xs">
                        <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                            <tr>
                                <th colSpan={2} className="p-1.5 text-center font-bold">Ketidakhadiran</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="p-1.5 border-r border-gray-300">Sakit</td>
                                <td className="p-1.5 text-center font-bold w-20">{sakit || 0} hari</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1.5 border-r border-gray-300">Izin</td>
                                <td className="p-1.5 text-center font-bold">{izin || 0} hari</td>
                            </tr>
                            <tr>
                                <td className="p-1.5 border-r border-gray-300">Tanpa Keterangan</td>
                                <td className="p-1.5 text-center font-bold">{alpa || 0} hari</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="w-1/2 flex justify-end items-center h-full pt-8">
                    <p className="font-bold text-sm pr-8">
                        {settings.tempat_tanggal_raport || '................., ....................'}
                    </p>
                </div>
            </div>

            {/* CATATAN */}
            {report.catatan && (
                <div className="mt-4 border p-4 min-h-[100px]" style={{ borderColor: theme }}>
                    <h3 className="font-bold text-sm mb-2">Catatan:</h3>
                    <p className="text-sm whitespace-pre-wrap">{report.catatan}</p>
                </div>
            )}

            {/* TANDA TANGAN */}
            <div className="mt-16 flex justify-between text-center text-sm break-inside-avoid">
                <div className="w-1/3">
                    <p className="mb-2">Orang Tua / Wali</p>
                    <div className="h-20 flex items-end justify-center">
                        {/* Space for manual signature */}
                    </div>
                    <p className="font-bold border-t inline-block min-w-[150px] pt-1" style={{ borderColor: theme }}>
                        {student.nama_orang_tua || '...................'}
                    </p>
                </div>
                <div className="w-1/3">
                    <p className="mb-2">Guru Pembimbing</p>
                    <div className="h-20 flex items-end justify-center">
                        {guruPembimbing?.signature_url && (
                            <img src={guruPembimbing.signature_url} alt="Signature" className="max-h-20 max-w-[150px] object-contain" />
                        )}
                    </div>
                    <p className="font-bold border-t inline-block min-w-[150px] pt-1" style={{ borderColor: theme }}>
                        {guruPembimbing?.full_name || '...................'}
                    </p>
                </div>
                <div className="w-1/3">
                    <p className="mb-2">Kepala Lembaga</p>
                    <div className="h-20 flex items-end justify-center">
                        {settings.signature_url && (
                            <img src={settings.signature_url} alt="Signature" className="max-h-20 max-w-[150px] object-contain" />
                        )}
                    </div>
                    <p className="font-bold underline inline-block min-w-[150px]">{settings.nama_kepala_lembaga}</p>
                    <p className="text-xs">NIP. {settings.nip_kepala_lembaga || '-'}</p>
                </div>
            </div>

            {/* FOOTER */}
            {settings.footer_raport && (
                <div className="mt-8 text-center text-xs text-gray-500 print:fixed print:bottom-4 print:left-0 print:w-full">
                    {settings.footer_raport}
                </div>
            )}
        </div>
    );
}
