/**
 * scripts/db-reset.ts — HATI-HATI! Hapus semua tabel dan migrate ulang
 *
 * Hanya untuk development. JANGAN jalankan di production.
 */
import { config } from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const rl = createInterface({ input, output });

rl.question('⚠️  YAKIN HAPUS SEMUA TABEL? Ketik "RESET" untuk lanjut: ', async (answer) => {
    if (answer !== 'RESET') {
        console.log('Cancelled.');
        process.exit(0);
    }

    const { createClient } = await import('@libsql/client');
    const db = createClient({
        url: process.env.TURSO_DATABASE_URL || '',
        authToken: process.env.TURSO_AUTH_TOKEN || '',
    });

    console.log('Dropping all tables...');
    const tables = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    for (const t of tables.rows as any[]) {
        await db.execute(`DROP TABLE IF EXISTS ${t.name}`);
        console.log(`   dropped ${t.name}`);
    }

    console.log('\nRunning migrations again...');
    // Trigger db-push logic
    const { spawn } = await import('node:child_process');
    spawn('npm', ['run', 'db:push'], { stdio: 'inherit' });

    setTimeout(() => process.exit(0), 5000);
});
