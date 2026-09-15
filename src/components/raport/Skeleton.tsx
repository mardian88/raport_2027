import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

/**
 * Skeleton loader untuk placeholder konten yang sedang loading.
 *
 * Contoh:
 *   <Skeleton variant="text" className="h-4 w-32" />
 *   <Skeleton variant="circular" className="w-12 h-12" />
 *   <Skeleton variant="card" className="h-32 w-full" />
 */
export function Skeleton({ className, variant = 'text', ...rest }: SkeletonProps) {
    const baseClass = 'animate-pulse-subtle bg-gradient-to-r from-ink-200 via-ink-100 to-ink-200 bg-[length:1000px_100%] animate-shimmer';

    const variants = {
        text: 'h-4 w-full rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-md',
        card: 'rounded-lg h-32',
    };

    return (
        <div
            className={cn(baseClass, variants[variant], className)}
            aria-hidden="true"
            {...rest}
        />
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-2 animate-fade-in">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-3">
                    {Array.from({ length: cols }).map((__, j) => (
                        <Skeleton
                            key={j}
                            variant="text"
                            className={cn('h-10 flex-1', i === 0 && 'bg-ink-300')}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} variant="card" />
            ))}
        </div>
    );
}