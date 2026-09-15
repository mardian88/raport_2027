import { cn } from '../../lib/utils';
import { getPredikat } from '../../utils/grading';

interface ScoreCellProps {
    /** Nilai numerik 0-100 */
    value: number;
    /** Tampilkan label predikat (A/B/C/D) */
    showPredikat?: boolean;
    /** Tampilkan label kategori (Akhlak, dll) */
    label?: string;
    /** Skala penilaian dari settings */
    scale?: Record<string, number> | null;
    /** Compact mode — lebih kecil */
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Sel nilai dengan visual indicator (warna + ukuran sesuai grade).
 *
 * Contoh:
 *   <ScoreCell value={85} />
 *   <ScoreCell value={72} showPredikat label="Akhlak" />
 */
export function ScoreCell({
    value,
    showPredikat = false,
    label,
    scale,
    size = 'md',
    className,
}: ScoreCellProps) {
    const grade = getPredikat(value, scale);
    const isValid = typeof value === 'number' && !isNaN(value);

    // Color per grade
    const gradeColor = {
        A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        B: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
        C: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        D: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
        E: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
    };

    const sizeClasses = {
        sm: 'min-w-[48px] px-2 py-1 text-xs',
        md: 'min-w-[64px] px-3 py-1.5 text-sm',
        lg: 'min-w-[80px] px-4 py-2 text-base',
    };

    if (!isValid) {
        return (
            <span className={cn(
                'inline-flex items-center justify-center rounded-md border border-ink-200 bg-ink-50 text-ink-400 font-mono tabular-nums',
                sizeClasses[size],
                className
            )}>
                -
            </span>
        );
    }

    const c = gradeColor[grade as keyof typeof gradeColor] || gradeColor.D;

    return (
        <span
            className={cn(
                'inline-flex flex-col items-center justify-center rounded-md border font-mono tabular-nums font-semibold',
                c.bg, c.text, c.border,
                sizeClasses[size],
                className
            )}
            title={label ? `${label}: ${value} (${grade})` : `Nilai ${value} (${grade})`}
        >
            <span className="leading-none">{value.toFixed(2)}</span>
            {showPredikat && (
                <span className="text-[10px] font-bold uppercase mt-0.5 opacity-75 leading-none">
                    {grade}
                </span>
            )}
        </span>
    );
}

interface MiniBarChartProps {
    /** Map kategori → nilai */
    data: Record<string, number>;
    /** Skala penilaian dari settings */
    scale?: Record<string, number> | null;
    className?: string;
}

/**
 * Mini horizontal bar chart untuk visualisasi nilai per kategori.
 *
 * Contoh:
 *   <MiniBarChart data={{ Akhlak: 85, Kedisiplinan: 80, Kognitif: 90 }} />
 */
export function MiniBarChart({ data, scale, className }: MiniBarChartProps) {
    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    return (
        <div className={cn('space-y-1.5', className)}>
            {entries.map(([key, val]) => {
                const grade = getPredikat(val, scale);
                const colorClass = {
                    A: 'bg-emerald-500',
                    B: 'bg-sky-500',
                    C: 'bg-amber-500',
                    D: 'bg-rose-500',
                    E: 'bg-red-600',
                }[grade as 'A' | 'B' | 'C' | 'D' | 'E'] || 'bg-ink-400';

                const widthPercent = Math.min(100, Math.max(0, val));

                return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                        <div className="w-24 truncate text-ink-600">{key}</div>
                        <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-500', colorClass)}
                                style={{ width: `${widthPercent}%` }}
                            />
                        </div>
                        <div className="w-12 text-right font-mono tabular-nums text-ink-700 font-semibold">
                            {val.toFixed(0)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}