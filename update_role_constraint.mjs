import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname);

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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        env[key] = val;
    }
    return env;
}

const env = { ...process.env, ...loadEnv() };
const url = env.VITE_TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
const authToken = env.VITE_TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
    try {
        console.log("Renaming teacher_assignments table...");
        
        await client.execute(`DROP TABLE IF EXISTS teacher_assignments_new`);
        
        await client.execute(`CREATE TABLE teacher_assignments_new (
            id TEXT PRIMARY KEY,
            teacher_id TEXT NOT NULL,
            halaqah_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('guru','pembimbing','keduanya')),
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE CASCADE,
            UNIQUE(teacher_id, halaqah_id, subject)
        )`);

        await client.execute(`INSERT INTO teacher_assignments_new (id, teacher_id, halaqah_id, subject, role, is_active, created_at) 
            SELECT id, teacher_id, halaqah_id, subject, role, is_active, created_at FROM teacher_assignments`);

        await client.execute(`DROP TABLE teacher_assignments`);
        await client.execute(`ALTER TABLE teacher_assignments_new RENAME TO teacher_assignments`);
        console.log("Berhasil!");
    } catch (err) {
        console.error("Gagal:", err.message);
    }
}
run();
