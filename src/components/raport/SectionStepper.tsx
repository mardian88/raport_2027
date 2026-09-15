import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface StepperStep {
    /** Identifier unik step */
    id: string;
    /** Label yang ditampilkan */
    label: string;
    /** Optional: nilai kelengkapan 0-100. Kalau 100 → step dianggap selesai */
    progress?: number;
}

interface SectionStepperProps {
    steps: StepperStep[];
    /** ID step aktif */
    currentStepId: string;
    /** Klik step (kalau boleh navigasi langsung) */
    onStepClick?: (id: string) => void;
    className?: string;
    /** Orientation */
    orientation?: 'horizontal' | 'vertical';
}

/**
 * Stepper horizontal/vertikal untuk form multi-section.
 *
 * Contoh:
 *   <SectionStepper
 *     steps={[
 *       { id: 'akhlak', label: 'Akhlak', progress: 100 },
 *       { id: 'kedisiplinan', label: 'Kedisiplinan', progress: 60 },
 *     ]}
 *     currentStepId="kedisiplinan"
 *     onStepClick={(id) => setStep(id)}
 *   />
 */
export function SectionStepper({
    steps,
    currentStepId,
    onStepClick,
    className,
    orientation = 'horizontal',
}: SectionStepperProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStepId);

    if (orientation === 'vertical') {
        return (
            <nav className={cn('space-y-1', className)} aria-label="Section navigation">
                {steps.map((step, idx) => {
                    const isCurrent = step.id === currentStepId;
                    const isCompleted = (step.progress ?? 0) >= 100;
                    const isPast = idx < currentIndex;
                    const canClick = !!onStepClick && (isCompleted || isPast || isCurrent);

                    return (
                            <button
                                key={step.id}
                                type="button"
                                disabled={!canClick}
                                onClick={() => canClick && onStepClick?.(step.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-all',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                                    isCurrent && 'bg-emerald-50 text-emerald-700 font-semibold',
                                    !isCurrent && isCompleted && 'text-ink-700 hover:bg-ink-50',
                                    !isCurrent && !isCompleted && 'text-ink-400 cursor-not-allowed',
                                    canClick && !isCurrent && 'cursor-pointer'
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex items-center justify-center w-7 h-7 rounded-full border-2 flex-shrink-0 font-semibold text-xs',
                                        isCompleted && 'bg-emerald-600 border-emerald-600 text-white',
                                        !isCompleted && isCurrent && 'border-emerald-600 text-emerald-600',
                                        !isCompleted && !isCurrent && 'border-ink-300 text-ink-400'
                                    )}
                                >
                                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </span>
                                <span className="flex-1">{step.label}</span>
                                {typeof step.progress === 'number' && step.progress < 100 && (
                                    <span className="text-xs text-ink-400 font-mono">
                                        {Math.round(step.progress)}%
                                    </span>
                                )}
                            </button>
                        );
                })}
            </nav>
        );
    }

    return (
        <nav
            className={cn('flex items-center gap-2 overflow-x-auto pb-2', className)}
            aria-label="Section navigation"
        >
            {steps.map((step, idx) => {
                const isCurrent = step.id === currentStepId;
                const isCompleted = (step.progress ?? 0) >= 100;
                const isPast = idx < currentIndex;
                const canClick = !!onStepClick && (isCompleted || isPast || isCurrent);

                return (
                    <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            disabled={!canClick}
                            onClick={() => canClick && onStepClick?.(step.id)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                                isCurrent && 'bg-emerald-600 text-white font-semibold shadow-glow-emerald',
                                !isCurrent && isCompleted && 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                                !isCurrent && !isCompleted && 'bg-ink-100 text-ink-500 cursor-not-allowed',
                                canClick && !isCurrent && 'cursor-pointer'
                            )}
                        >
                            <span
                                className={cn(
                                    'flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold',
                                    isCurrent && 'bg-white text-emerald-700',
                                    !isCurrent && isCompleted && 'bg-emerald-600 text-white',
                                    !isCurrent && !isCompleted && 'bg-ink-300 text-ink-600'
                                )}
                            >
                                {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                            </span>
                            <span>{step.label}</span>
                        </button>
                        {idx < steps.length - 1 && (
                            <div
                                className={cn(
                                    'w-8 h-0.5 rounded-full transition-colors',
                                    isCompleted ? 'bg-emerald-300' : 'bg-ink-200'
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </nav>
    );
}