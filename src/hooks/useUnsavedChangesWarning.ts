import { useEffect, useRef } from 'react';

/**
 * useUnsavedChangesWarning
 *
 * Memperingatkan user sebelum menutup/navigasi dari halaman kalau ada
 * perubahan yang belum disimpan.
 *
 * Penting untuk input nilai raport — kehilangan data saat perpindahan
 * siswa adalah risiko operasional yang nyata.
 *
 * @example
 *   const [form, setForm] = useState(initial);
 *   const isDirty = !isEqual(form, initial);
 *   useUnsavedChangesWarning(isDirty);
 *
 * @param isDirty - true kalau ada perubahan belum di-save
 * @param message - pesan yang muncul di dialog konfirmasi browser
 */
export function useUnsavedChangesWarning(
    isDirty: boolean,
    message = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?'
) {
    const isDirtyRef = useRef(isDirty);
    isDirtyRef.current = isDirty;

    useEffect(() => {
        if (!isDirty) return;

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Standar browser untuk prompt native
            e.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty, message]);
}

/**
 * useBeforeRouteChange
 *
 * Konfirmasi navigasi dalam aplikasi (SPA route changes) sebelum data hilang.
 *
 * @example
 *   useBeforeRouteChange(isDirty, () => {
 *     return window.confirm('Yakin pindah siswa? Perubahan belum disimpan.');
 *   });
 *
 * @param isDirty - true kalau ada perubahan belum di-save
 * @param confirmFn - callback yang return true untuk lanjut, false untuk batal
 */
export function useBeforeRouteChange(
    isDirty: boolean,
    confirmFn: () => boolean
) {
    const isDirtyRef = useRef(isDirty);
    isDirtyRef.current = isDirty;

    const confirmRef = useRef(confirmFn);
    confirmRef.current = confirmFn;

    useEffect(() => {
        if (!isDirty) return;

        // Intercept link clicks di dalam aplikasi
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement | null;

            // Hanya link internal SPA (dimulai dengan / atau ./)
            if (!link) return;
            const href = link.getAttribute('href') || '';
            if (!href.startsWith('/') && !href.startsWith('./') && !href.startsWith('../')) return;

            // Skip kalau pakai modifier keys atau target=_blank
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (link.target === '_blank') return;

            const ok = confirmRef.current();
            if (!ok) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [isDirty]);
}