import argon2 from 'argon2';
import { db } from '../src/db';

async function main() {
    console.log('🔐 Menyiapkan password baru untuk admin...');
    const password = 'mardian28';
    const hash = await argon2.hash(password);
    console.log('✓ Hash berhasil dibuat.');

    // Verifikasi hash langsung
    const isValid = await argon2.verify(hash, password);
    if (!isValid) {
        throw new Error('Verifikasi hash lokal gagal!');
    }
    console.log('✓ Verifikasi hash lokal berhasil.');

    // Update di DB
    const res = await db.execute({
        sql: 'UPDATE users SET password_hash = ? WHERE email = ?',
        args: [hash, 'admin@rqm.com'],
    });

    console.log(`✓ Database updated. Rows affected: ${res.rowsAffected}`);

    // Cek kembali dari DB
    const check = await db.execute({
        sql: 'SELECT id, email, role, full_name, (password_hash IS NOT NULL) as has_password FROM users WHERE email = ?',
        args: ['admin@rqm.com'],
    });

    console.log('👤 User data di database:', check.rows[0]);
    console.log('🎉 Password admin berhasil diubah menjadi: mardian28');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
