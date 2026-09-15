/**
 * scripts/db-verify.ts — Verifikasi koneksi + tampilkan isi DB
 */
import { config } from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

import('@libsql/client').then(async ({ createClient }) => {
    const url = process.env.TURSO_DATABASE_URL || '';
    const authToken = process.env.TURSO_AUTH_TOKEN || '';

    const db = createClient({ url, authToken });

    console.log('🔌 Testing connection...');
    try {
        const r = await db.execute('SELECT 1 as ok, datetime(\'now\') as now');
        console.log('   ✓ Connected:', r.rows[0]);
    } catch (err: any) {
        console.error('   ✗ Failed:', err.message);
        process.exit(1);
    }

    console.log('\n📋 Tables:');
    const tables = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    for (const t of tables.rows as any[]) {
        const count = await db.execute(`SELECT COUNT(*) as c FROM ${t.name}`);
        console.log(`   ${t.name.padEnd(30)} ${count.rows[0].c} rows`);
    }

    // Tampilkan admin default
    const users = await db.execute('SELECT id, email, role, full_name FROM users LIMIT 5');
    console.log('\n👤 Sample users:');
    (users.rows as any[]).forEach(u => console.log(`   ${u.id} ${u.email} (${u.role})`));

    process.exit(0);
});
