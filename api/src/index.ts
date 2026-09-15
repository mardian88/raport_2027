/**
 * src/index.ts — Entry point API backend Hono
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { sessionMiddleware, errorHandler, logger } from './middleware';
import { authRouter } from './routes/auth';
import { studentsRouter } from './routes/students';
import { reportCardsRouter } from './routes/report_cards';
import {
    halaqahRouter,
    semestersRouter,
    settingsRouter,
    usersRouter,
    teacherAssignmentsRouter,
} from './routes/index';
import { db } from './db';

// ============================================================================
// Setup
// ============================================================================
const app = new Hono();
const PORT = parseInt(process.env.PORT || '8787', 10);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim());

// ============================================================================
// Global middleware
// ============================================================================
app.use('*', honoLogger());
app.use('*', async (c, next) => {
    const corsMiddleware = cors({
        origin: (origin) => {
            if (!origin) return allowedOrigins[0];
            return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
        },
        credentials: true,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    });
    return corsMiddleware(c, next);
});
app.use('*', sessionMiddleware);
app.use('*', logger);

// ============================================================================
// Health check
// ============================================================================
app.get('/', async (c) => {
    // Test DB connection
    try {
        const r = await db.execute('SELECT 1 as ok');
        return c.json({
            service: 'raportrqm-api',
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        return c.json({
            service: 'raportrqm-api',
            status: 'degraded',
            database: 'error',
            error: err.message,
        }, 503);
    }
});

app.get('/health', async (c) => c.json({ ok: true }));

// ============================================================================
// Routes
// ============================================================================
app.route('/auth', authRouter);
app.route('/students', studentsRouter);
app.route('/report-cards', reportCardsRouter);
app.route('/halaqah', halaqahRouter);
app.route('/semesters', semestersRouter);
app.route('/settings', settingsRouter);
app.route('/users', usersRouter);
app.route('/teacher-assignments', teacherAssignmentsRouter);

// ============================================================================
// 404 + Error
// ============================================================================
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404));
app.onError(errorHandler);

// ============================================================================
// Start
// ============================================================================
serve({
    fetch: app.fetch,
    port: PORT,
}, (info) => {
    console.log(`\n🚀 raportrqm-api running on http://localhost:${info.port}`);
    console.log(`   Database: ${process.env.TURSO_DATABASE_URL?.substring(0, 40)}...`);
    console.log(`   CORS:     ${allowedOrigins.join(', ')}`);
    console.log(`   Mode:     ${process.env.NODE_ENV || 'development'}\n`);
});
