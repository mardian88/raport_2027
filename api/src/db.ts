/**
 * src/db.ts — Koneksi Turso + utility query
 *
 * Dipakai oleh semua endpoint dan scripts (db-push, db-seed, dll).
 */
import { createClient, type Client, type InValue } from '@libsql/client';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if not yet loaded
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
    (process as any).loadEnvFile(envPath);
}

const url = process.env.TURSO_DATABASE_URL || '';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

if (!url) {
    console.error('[FATAL] TURSO_DATABASE_URL tidak ditemukan di .env');
    process.exit(1);
}

export const db: Client = createClient({
    url,
    authToken,
});

/**
 * Helper untuk eksekusi query dengan parameter typed
 */
export async function query<T = any>(
    sql: string,
    args: InValue[] = []
): Promise<T[]> {
    const result = await db.execute({ sql, args });
    return result.rows as T[];
}

export async function queryOne<T = any>(
    sql: string,
    args: InValue[] = []
): Promise<T | null> {
    const rows = await query<T>(sql, args);
    return rows[0] || null;
}

export async function execute(
    sql: string,
    args: InValue[] = []
): Promise<{ rowsAffected: number; lastInsertRowid?: string | bigint }> {
    const result = await db.execute({ sql, args });
    return {
        rowsAffected: Number(result.rowsAffected || 0),
        lastInsertRowid: result.lastInsertRowid,
    };
}

/**
 * Jalankan file SQL (untuk migration)
 */
export async function runSqlFile(filePath: string): Promise<void> {
    const sql = readFileSync(filePath, 'utf-8');
    // Split by semicolon followed by newline, tapi skip yang di dalam string
    // Untuk migration sederhana ini cukup aman
    const statements = sql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
        try {
            await db.execute(stmt);
        } catch (err: any) {
            console.error(`[SQL ERROR] Statement:\n${stmt.substring(0, 200)}...`);
            console.error(`[SQL ERROR] Message: ${err.message}`);
            throw err;
        }
    }
}

/**
 * Path ke folder migrations (turso_migrations/ di root project)
 */
export function getMigrationsDir(): string {
    return join(__dirname, '..', '..', 'turso_migrations');
}
