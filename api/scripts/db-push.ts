/**
 * scripts/db-push.ts — Push schema SQLite ke Turso
 *
 * Cara jalanin: cd api && npm install && npm run db:push
 *
 * Akan membaca semua file .sql di folder turso_migrations/ dan menjalankannya
 * secara berurutan.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', '..', 'turso_migrations');

import('@libsql/client').then(async ({ createClient }) => {
    const url = process.env.TURSO_DATABASE_URL || '';
    const authToken = process.env.TURSO_AUTH_TOKEN || '';

    if (!url || !authToken) {
        console.error('❌ TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN harus diisi di .env');
        process.exit(1);
    }

    const db = createClient({ url, authToken });

    console.log('🔌 Connecting to Turso...');
    console.log(`   URL: ${url.substring(0, 50)}...`);

    const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`\n📦 Found ${files.length} migration files:\n`);
    files.forEach(f => console.log(`   - ${f}`));

    for (const file of files) {
        const filePath = join(migrationsDir, file);
        const sql = readFileSync(filePath, 'utf-8');

        console.log(`\n▶ Running ${file}...`);

        // Strip comments first, then split by semicolon
        const cleanSql = sql
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        const statements = cleanSql
            .split(/;\s*(?=\n|$)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
            try {
                await db.execute(stmt);
                console.log(`   ✓ [${i + 1}/${statements.length}] ${preview}...`);
            } catch (err: any) {
                console.error(`   ✗ [${i + 1}/${statements.length}] ${preview}...`);
                console.error(`     Error: ${err.message}`);
                // Lanjut aja kalau error "already exists" — idempotent migration
                if (err.message.includes('already exists') ||
                    err.message.includes('duplicate column')) {
                    console.log('     ⚠ Skipping (already exists)');
                    continue;
                }
                throw err;
            }
        }
    }

    console.log('\n✅ All migrations applied successfully!\n');

    // Verify: list tables
    const tables = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    console.log(`📋 Tables in database (${tables.rows.length}):`);
    (tables.rows as any[]).forEach(r => console.log(`   - ${r.name}`));

    process.exit(0);
}).catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
