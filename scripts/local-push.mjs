/**
 * scripts/local-push.mjs — Push schema ke Turso dengan error handling lebih baik
 *
 * Pakai: node scripts/local-push.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env manual (no dotenv dep needed)
function parseEnvFile(path) {
    if (!existsSync(path)) return {};
    const content = readFileSync(path, 'utf-8');
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

const env = { ...process.env, ...parseEnvFile(join(root, '.env')) };

const url = env.VITE_TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
const authToken = env.VITE_TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('');
    console.error('  ERROR: Environment variables tidak ditemukan');
    console.error('');
    console.error('  Pastikan file .env ada di root project dengan isi:');
    console.error('    VITE_TURSO_DATABASE_URL=libsql://...');
    console.error('    VITE_TURSO_AUTH_TOKEN=eyJ...');
    console.error('');
    process.exit(1);
}

// Load @libsql/client — try multiple locations
const require = createRequire(import.meta.url);

let createClient;
const tryPaths = [
    '@libsql/client',
    '../node_modules/@libsql/client',
    '../../node_modules/@libsql/client',
];

for (const p of tryPaths) {
    try {
        const mod = require(p);
        createClient = mod.createClient;
        console.log(`[OK] Loaded @libsql/client from: ${p}`);
        break;
    } catch (err) {
        // try next
    }
}

if (!createClient) {
    console.error('');
    console.error('  ERROR: Tidak bisa load @libsql/client');
    console.error('');
    console.error('  Install dengan salah satu:');
    console.error('    npm install @libsql/client');
    console.error('    atau masuk ke folder root lalu jalankan:');
    console.error('    npm install');
    console.error('');
    process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  Push Schema ke Turso');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log(`  URL:   ${url.substring(0, 50)}...`);
console.log('');

const db = createClient({ url, authToken });

// Test koneksi dulu
try {
    const r = await db.execute("SELECT datetime('now') as now");
    console.log('  ✓ Connected to Turso');
    console.log(`  Server time: ${r.rows[0].now}`);
    console.log('');
} catch (err) {
    console.error('');
    console.error('  ERROR: Tidak bisa konek ke Turso');
    console.error(`  Detail: ${err.message}`);
    console.error('');
    process.exit(1);
}

// Cari migration files
const migrationsDir = join(root, 'turso_migrations');

if (!existsSync(migrationsDir)) {
    console.error(`  ERROR: Folder turso_migrations/ tidak ditemukan`);
    console.error(`  Expected: ${migrationsDir}`);
    console.error('');
    process.exit(1);
}

const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

if (files.length === 0) {
    console.error('  ERROR: Tidak ada file .sql di turso_migrations/');
    console.error('');
    process.exit(1);
}

console.log(`  Found ${files.length} migration files:`);
for (const f of files) {
    console.log(`    - ${f}`);
}
console.log('');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`▶ Running ${file}...`);

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
        const preview = stmt.substring(0, 60).replace(/\n/g, ' ').trim();
        try {
            await db.execute(stmt);
            console.log(`  ✓ [${i + 1}/${statements.length}] ${preview}${preview.length > 55 ? '...' : ''}`);
            successCount++;
        } catch (err) {
            const msg = err.message || String(err);
            if (msg.includes('already exists') ||
                msg.includes('duplicate column') ||
                msg.includes('UNIQUE constraint failed') ||
                msg.includes('table') && msg.includes('already')) {
                console.log(`  ⚠ [${i + 1}/${statements.length}] ${preview}... (skip - already exists)`);
                skipCount++;
                continue;
            }
            console.error(`  ✗ [${i + 1}/${statements.length}] ${preview}...`);
            console.error(`     ERROR: ${msg}`);
            errorCount++;
            // Lanjut ke statement berikutnya, jangan stop total
        }
    }
    console.log('');
}

console.log('═══════════════════════════════════════════════════');
if (errorCount === 0) {
    console.log(`  ✓ SELESAI!`);
    console.log(`  ${successCount} statements executed`);
    if (skipCount > 0) console.log(`  ${skipCount} skipped (already exists)`);
} else {
    console.log(`  ⚠ SELESAI DENGAN ERROR`);
    console.log(`  ${successCount} executed, ${skipCount} skipped, ${errorCount} errors`);
}
console.log('═══════════════════════════════════════════════════');
console.log('');

// Tampilkan tabel yang ada
try {
    const tables = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );
    console.log(`  Tables in database (${tables.rows.length}):`);
    for (const t of tables.rows) {
        const count = await db.execute(`SELECT COUNT(*) as c FROM ${t.name}`);
        const c = count.rows[0].c;
        console.log(`    ${String(t.name).padEnd(28)} ${c} rows`);
    }

    const users = await db.execute('SELECT email, role FROM users LIMIT 10');
    if (users.rows.length > 0) {
        console.log('');
        console.log(`  Users:`);
        for (const u of users.rows) {
            console.log(`    ${u.email.padEnd(30)} (${u.role})`);
        }
    }

    const settings = await db.execute('SELECT nama_lembaga, bobot_akhlak, bobot_kedisiplinan, bobot_kognitif FROM settings_lembaga LIMIT 1');
    if (settings.rows.length > 0) {
        const s = settings.rows[0];
        console.log('');
        console.log(`  Settings Lembaga:`);
        console.log(`    ${s.nama_lembaga}`);
        console.log(`    Bobot: Akhlak ${s.bobot_akhlak} | Kedisiplinan ${s.bobot_kedisiplinan} | Kognitif ${s.bobot_kognitif}`);
    }
} catch (err) {
    console.error(`  Warning: tidak bisa query tables: ${err.message}`);
}

console.log('');
console.log('  🎉 Database siap dipakai!');
console.log('');
console.log('  Langkah selanjutnya:');
console.log('    1. Double-click run-backend.bat');
console.log('    2. Double-click run-frontend.bat');
console.log('    3. Buka http://localhost:5173');
console.log('    4. Login: admin@rqm.com (password kosong)');
console.log('');

process.exit(errorCount > 0 ? 1 : 0);
