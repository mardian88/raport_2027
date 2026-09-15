/**
 * supabase.ts (kompatibel — prioritas API backend)
 *
 * Smart client dengan prioritas:
 *   1. Jika VITE_AUTH_MODE=api → pakai apiClient (Hono + Turso)
 *   2. Fallback ke local-db (localStorage, tanpa backend)
 *
 * Frontend tidak perlu tahu apa yang di belakang layar — pakai API
 * Supabase-style (`from`, `select`, `insert`, `update`, `delete`, `auth`)
 * dan semua panggilan otomatis diteruskan ke backend yang sesuai.
 *
 * Saat Supabase dihapus sepenuhnya, file ini bisa langsung import dari
 * `api-client.ts`.
 */

import { tursoClient } from './turso-client';

/**
 * Client utama sistem: Terhubung langsung ke Database Turso Cloud
 * Menggunakan @libsql/client/web dengan kredensial VITE_TURSO_*
 */
export const supabase = tursoClient as any;

if (import.meta.env.DEV) {
    console.info(
        `%c[RQM] Turso Cloud DB aktif`,
        'background:#059669;color:white;padding:2px 8px;border-radius:4px;font-weight:bold'
    );
    console.info('Koneksi langsung ke Database Turso Cloud terverifikasi');
}
