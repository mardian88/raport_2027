/**
 * src/routes/auth.ts — Login, logout, session check
 */
import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import argon2 from 'argon2';
import { db } from '../db';
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS, verifySessionToken } from '../auth';
import { requireAuth } from '../middleware';

export const authRouter = new Hono();

const loginSchema = z.object({
    email: z.string().min(1, 'Username atau email wajib diisi'),
    password: z.string().min(1, 'Password wajib diisi'),
});

authRouter.post('/login', async (c) => {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validasi gagal', details: parsed.error.format() }, 400);
    }

    const { email: identifier, password } = parsed.data;
    const trimmed = identifier.trim();
    const lookupEmail = trimmed.includes('@') ? trimmed : `${trimmed}@rqm.com`;

    // Cari user di DB (bisa via username seperti 'admin' atau email 'admin@rqm.com')
    const result = await db.execute({
        sql: 'SELECT id, email, role, full_name, password_hash, is_active FROM users WHERE email = ? OR email = ? LIMIT 1',
        args: [trimmed, lookupEmail],
    });

    const user = result.rows[0] as any;
    if (!user) {
        return c.json({ error: 'Username/Email atau password salah' }, 401);
    }
    if (!user.is_active) {
        return c.json({ error: 'Akun nonaktif. Hubungi admin.' }, 403);
    }

    // Kalau password_hash belum di-set, tolak
    if (!user.password_hash) {
        return c.json({
            error: 'Akun belum punya password. Hubungi admin untuk setup.',
        }, 403);
    }

    // Verifikasi password
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
        return c.json({ error: 'Username/Email atau password salah' }, 401);
    }

    // Generate token + set cookie
    const token = await createSessionToken({
        userId: user.id,
        role: user.role,
        email: user.email,
    });

    setCookie(c, COOKIE_NAME, token, COOKIE_OPTIONS);

    return c.json({
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
        },
    });
});

authRouter.post('/logout', async (c) => {
    deleteCookie(c, COOKIE_NAME);
    return c.json({ ok: true });
});

authRouter.get('/me', requireAuth(), async (c) => {
    const user = c.get('user');
    return c.json({ user });
});

/**
 * Setup password pertama kali untuk user yang belum punya password
 * (untuk admin yang dibuat via migration tanpa password)
 */
const setupPasswordSchema = z.object({
    email: z.string().email(),
    newPassword: z.string().min(8, 'Password minimal 8 karakter'),
    setupToken: z.string(), // token khusus setup (bukan session token)
});

authRouter.post('/setup-password', async (c) => {
    const body = await c.req.json();
    const parsed = setupPasswordSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validasi gagal' }, 400);
    }

    const { email, newPassword, setupToken } = parsed.data;

    // Verify setup token (sama dengan session token untuk simplicity)
    const payload = await verifySessionToken(setupToken);
    if (!payload || payload.email !== email) {
        return c.json({ error: 'Setup token tidak valid' }, 401);
    }

    const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await db.execute({
        sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
        args: [hash, email],
    });

    return c.json({ ok: true, message: 'Password berhasil di-set' });
});
