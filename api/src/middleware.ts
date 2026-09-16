/**
 * src/middleware.ts — Middleware auth, error handling, CORS
 */
import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { COOKIE_NAME, verifySessionToken, SessionPayload } from './auth';
import { db } from './db';

declare module 'hono' {
    interface ContextVariableMap {
        user: SessionPayload | null;
    }
}

/**
 * Middleware: parse session cookie dan set user di context
 * Tidak throw error — endpoint bisa memutuskan butuh auth atau tidak
 */
export async function sessionMiddleware(c: Context, next: Next) {
    const token = getCookie(c, COOKIE_NAME);
    if (token) {
        const payload = await verifySessionToken(token);
        c.set('user', payload);
    } else {
        c.set('user', null);
    }
    await next();
}

/**
 * Middleware: wajib login
 */
export function requireAuth() {
    return async (c: Context, next: Next) => {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthorized — silakan login dulu' }, 401);
        }
        await next();
    };
}

/**
 * Middleware: wajib role tertentu
 */
export function requireRole(...roles: SessionPayload['role'][]) {
    return async (c: Context, next: Next) => {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        if (!roles.includes(user.role)) {
            return c.json({
                error: 'Forbidden',
                message: `Role '${user.role}' tidak punya akses. Butuh salah satu dari: ${roles.join(', ')}`,
            }, 403);
        }
        await next();
    };
}

/**
 * Global error handler
 */
export function errorHandler(err: Error, c: Context) {
    console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err);
    return c.json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    }, 500);
}

/**
 * Logger sederhana
 */
export async function logger(c: Context, next: Next) {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    const user = c.get('user');
    console.log(
        `${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)${user ? ` [${user.email}]` : ' [anon]'}`
    );
}

// Re-export db supaya handler lain bisa import dari middleware
export { db };
