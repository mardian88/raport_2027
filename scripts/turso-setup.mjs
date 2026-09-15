/**
 * scripts/turso-setup.mjs — Push schema Turso dari root project
 *
 * Cara pakai: node scripts/turso-setup.mjs
 *
 * Akan membaca semua file .sql di turso_migrations/ dan push ke Turso.
 * Env dibaca dari .env (VITE_TURSO_*) atau environment variables.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env manual (simple parser, no deps)
function loadEnv() {
    const envPath = join(root, '.env');
    if (!existsSync(envPath)) return {};
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        env[key] = val;
    }
    return env;
}

const env = { ...process.env, ...loadEnv() };

const url = env.VITE_TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
const authToken = env.VITE_TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('❌ VITE_TURSO_DATABASE_URL dan VITE_TURSO_AUTH_TOKEN harus diisi di .env');
    console.error('   Tambahkan dua baris ini di file .env Anda');
    process.exit(1);
}

console.log('🔌 Connecting to Turso...');
console.log(`   URL: ${url.substring(0, 50)}...`);

const { createClient } = await import('@libsql/client');
const db = createClient({ url, authToken });

const migrationsDir = join(root, 'turso_migrations');

if (!existsSync(migrationsDir)) {
    console.error(`❌ Folder turso_migrations/ tidak ditemukan di ${migrationsDir}`);
    process.exit(1);
}

const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

console.log(`\n📦 Found ${files.length} migration files:\n`);
files.forEach(f => console.log(`   - ${f}`));

for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`\n▶ Running ${file}...`);

    const statements = sql
        .split(/;\s*(?=\n|$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.substring(0, 70).replace(/\n/g, ' ');
        try {
            await db.execute(stmt);
            console.log(`   ✓ [${i + 1}/${statements.length}] ${preview}...`);
        } catch (err) {
            const msg = err.message || String(err);
            if (msg.includes('already exists') || msg.includes('duplicate column')) {
                console.log(`   ⚠ [${i + 1}/${statements.length}] ${preview}... (already exists)`);
                continue;
            }
            console.error(`   ✗ [${i + 1}/${statements.length}] ${preview}...`);
            console.error(`     Error: ${msg}`);
            throw err;
        }
    }
}

console.log('\n✅ All migrations applied!\n');

const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
console.log(`📋 Tables in database (${tables.rows.length}):`);
for (const t of tables.rows) {
    const count = await db.execute(`SELECT COUNT(*) as c FROM ${t.name}`);
    console.log(`   ${String(t.name).padEnd(30)} ${count.rows[0].c} rows`);
}

console.log('\n🎉 Done! Database siap dipakai.');
console.log('   Sekarang jalankan frontend dengan: npm run dev');
process.exit(0);
