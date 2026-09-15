import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
    title: string;
    description?: ReactNode;
    /** Aksi di kanan — tombol, dropdown, dll */
    actions?: ReactNode;
    /** Badge / chip di samping judul */
    badge?: ReactNode;
    /** Container override */
    className?: string;
}

/**
 * Header halaman yang konsisten.
 *
 * Contoh:
 *   <PageHeader
 *     title="Leger Nilai"
 *     description="2025/2026 - Semester Genap"
 *     badge={<Badge>Aktif</Badge>}
 *     actions={<Button>Export Excel</Button>}
 *   />
 */
export function PageHeader({
    title,
    description,
    actions,
    badge,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2', className)}>
            <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-ink-900 font-display tracking-tight">
                        {title}
                    </h1>
                    {badge}
                </div>
                {description && (
                    <div className="text-sm text-ink-500">{description}</div>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2 flex-wrap">{actions}</div>
            )}
        </div>
    );
}