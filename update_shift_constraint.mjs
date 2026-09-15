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
        console.log("Renaming halaqah table...");
        await client.execute(`CREATE TABLE halaqah_new (
            id TEXT PRIMARY KEY,
            nama TEXT NOT NULL,
            guru_id TEXT,
            shift TEXT CHECK(shift IN ('Siang','Sore','Malam')) DEFAULT 'Sore',
            tahsin_items TEXT DEFAULT '[]',
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )`);
        
        await client.execute(`INSERT INTO halaqah_new (id, nama, shift, tahsin_items, is_active, created_at, updated_at, guru_id) 
            SELECT id, nama, shift, tahsin_items, is_active, created_at, updated_at, guru_id FROM halaqah`);
        
        await client.execute(`DROP TABLE halaqah`);
        await client.execute(`ALTER TABLE halaqah_new RENAME TO halaqah`);
        await client.execute(`CREATE INDEX idx_halaqah_active ON halaqah(is_active)`);
        console.log("Berhasil halaqah!");

        console.log("Renaming students table...");
        await client.execute(`CREATE TABLE students_new (
            id TEXT PRIMARY KEY,
            nama TEXT NOT NULL,
            nis TEXT UNIQUE,
            halaqah_id TEXT,
            jenis_kelamin TEXT,
            tanggal_lahir TEXT,
            nama_orang_tua TEXT,
            shift TEXT CHECK(shift IN ('Siang','Sore','Malam')) DEFAULT 'Sore',
            is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE SET NULL
        )`);

        await client.execute(`INSERT INTO students_new (id, nama, nis, halaqah_id, jenis_kelamin, tanggal_lahir, nama_orang_tua, shift, is_active, created_at, updated_at) 
            SELECT id, nama, nis, halaqah_id, jenis_kelamin, tanggal_lahir, nama_orang_tua, shift, is_active, created_at, updated_at FROM students`);

        await client.execute(`DROP TABLE students`);
        await client.execute(`ALTER TABLE students_new RENAME TO students`);
        await client.execute(`CREATE INDEX idx_students_halaqah ON students(halaqah_id)`);
        await client.execute(`CREATE INDEX idx_students_active ON students(is_active)`);
        console.log("Berhasil students!");
    } catch (err) {
        console.error("Gagal:", err.message);
    }
}
run();
