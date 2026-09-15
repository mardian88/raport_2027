/**
 * src/auth.ts — Session cookie + JWT
 *
 * Menggunakan session cookie yang di-sign dengan HMAC SHA-256.
 * Format: <base64-payload>.<hmac-signature>
 *
 * Payload berisi: { userId, role, expiresAt }
 */
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-me-in-production'
);
const DURATION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS || '24', 10);

export interface SessionPayload {
    userId: string;
    role: 'admin' | 'guru' | 'viewer' | 'pembimbing';
    email: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + DURATION_HOURS * 3600;
    return await new SignJWT({ ...payload, expiresAt })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${DURATION_HOURS}h`)
        .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return {
            userId: payload.userId as string,
            role: payload.role as SessionPayload['role'],
            email: payload.email as string,
        };
    } catch {
        return null;
    }
}

export const COOKIE_NAME = 'rqm_session';

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: DURATION_HOURS * 3600,
};
