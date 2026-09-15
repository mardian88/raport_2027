import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
    /** Compact = less padding, untuk inline empty (mis. di dalam card) */
    compact?: boolean;
}

/**
 * Empty state untuk saat tidak ada data.
 *
 * Contoh:
 *   <EmptyState
 *     icon={<FileText />}
 *     title="Belum ada data nilai"
 *     description="Mulai input nilai untuk semester ini"
 *     action={<Button>Tambah Nilai</Button>}
 *   />
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    compact = false,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                compact ? 'py-8 px-4' : 'py-16 px-6',
                'animate-fade-in',
                className
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-center rounded-full bg-ink-100 text-ink-400',
                    compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
                )}
                aria-hidden="true"
            >
                {icon || <Inbox className={compact ? 'w-6 h-6' : 'w-8 h-8'} />}
            </div>
            <h3 className={cn('font-semibold text-ink-800', compact ? 'text-sm' : 'text-base')}>
                {title}
            </h3>
            {description && (
                <p className={cn('text-ink-500 mt-1 max-w-md', compact ? 'text-xs' : 'text-sm')}>
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}