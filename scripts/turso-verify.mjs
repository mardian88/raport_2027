/**
 * scripts/turso-verify.mjs — Verifikasi koneksi + tampilkan isi DB
 * Pakai: npm run db:verify
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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
    process.exit(1);
}

const { createClient } = await import('@libsql/client');
const db = createClient({ url, authToken });

console.log('🔌 Testing connection...');
try {
    const r = await db.execute("SELECT 1 as ok, datetime('now') as now");
    console.log('   ✓ Connected:', r.rows[0]);
} catch (err) {
    console.error('   ✗ Failed:', err.message);
    process.exit(1);
}

console.log('\n📋 Tables:');
const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
for (const t of tables.rows) {
    const count = await db.execute(`SELECT COUNT(*) as c FROM ${t.name}`);
    console.log(`   ${String(t.name).padEnd(30)} ${count.rows[0].c} rows`);
}

const users = await db.execute('SELECT id, email, role, full_name FROM users LIMIT 5');
if (users.rows.length > 0) {
    console.log('\n👤 Users:');
    for (const u of users.rows) {
        console.log(`   ${u.id} ${u.email} (${u.role})`);
    }
}

const settings = await db.execute('SELECT nama_lembaga, bobot_akhlak, bobot_kedisiplinan, bobot_kognitif FROM settings_lembaga LIMIT 1');
if (settings.rows.length > 0) {
    const s = settings.rows[0];
    console.log('\n🏛️  Settings Lembaga:');
    console.log(`   ${s.nama_lembaga} | bobot: ${s.bobot_akhlak}/${s.bobot_kedisiplinan}/${s.bobot_kognitif}`);
}

console.log('\n✅ Verification complete.');
process.exit(0);
