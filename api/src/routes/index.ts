/**
 * src/routes/index.ts — Resource lainnya (halaqah, semester, settings, users)
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware';

// ============================================================================
// HALAQAH
// ============================================================================
export const halaqahRouter = new Hono();
halaqahRouter.use('*', requireAuth());

halaqahRouter.get('/', async (c) => {
    const result = await db.execute('SELECT * FROM halaqah WHERE is_active = 1 ORDER BY nama');
    return c.json({ data: result.rows });
});

const halaqahSchema = z.object({
    nama: z.string().min(1),
    deskripsi: z.string().optional().nullable(),
    jenis: z.enum(['Putra', 'Putri']).default('Putra'),
});

halaqahRouter.post('/', requireRole('admin'), async (c) => {
    const body = await c.req.json();
    const parsed = halaqahSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal' }, 400);

    const id = crypto.randomUUID();
    await db.execute({
        sql: 'INSERT INTO halaqah (id, nama, deskripsi, jenis) VALUES (?, ?, ?, ?)',
        args: [id, parsed.data.nama, parsed.data.deskripsi || null, parsed.data.jenis],
    });
    return c.json({ data: { id, ...parsed.data } }, 201);
});

// ============================================================================
// ACADEMIC YEARS & SEMESTERS
// ============================================================================
export const semestersRouter = new Hono();
semestersRouter.use('*', requireAuth());

semestersRouter.get('/', async (c) => {
    const result = await db.execute(`
        SELECT s.*, ay.tahun_ajaran
        FROM semesters s
        JOIN academic_years ay ON s.academic_year_id = ay.id
        ORDER BY ay.tahun_ajaran DESC, s.nama DESC
    `);
    return c.json({ data: result.rows });
});

semestersRouter.get('/active', async (c) => {
    const result = await db.execute(`
        SELECT s.*, ay.tahun_ajaran
        FROM semesters s
        JOIN academic_years ay ON s.academic_year_id = ay.id
        WHERE s.is_active = 1
        LIMIT 1
    `);
    if (result.rows.length === 0) return c.json({ data: null });
    return c.json({ data: result.rows[0] });
});

const academicYearSchema = z.object({ tahun_ajaran: z.string().min(1) });
semestersRouter.post('/academic-years', requireRole('admin'), async (c) => {
    const body = await c.req.json();
    const parsed = academicYearSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal' }, 400);

    const id = crypto.randomUUID();
    await db.execute({
        sql: 'INSERT INTO academic_years (id, tahun_ajaran) VALUES (?, ?)',
        args: [id, parsed.data.tahun_ajaran],
    });
    return c.json({ data: { id, ...parsed.data } }, 201);
});

const semesterSchema = z.object({
    academic_year_id: z.string().uuid(),
    nama: z.enum(['Ganjil', 'Genap']),
});
semestersRouter.post('/', requireRole('admin'), async (c) => {
    const body = await c.req.json();
    const parsed = semesterSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal' }, 400);

    const id = crypto.randomUUID();
    await db.execute({
        sql: 'INSERT INTO semesters (id, academic_year_id, nama) VALUES (?, ?, ?)',
        args: [id, parsed.data.academic_year_id, parsed.data.nama],
    });
    return c.json({ data: { id, ...parsed.data } }, 201);
});

semestersRouter.patch('/:id/activate', requireRole('admin'), async (c) => {
    const id = c.req.param('id');
    // Deactivate semua semester dulu
    await db.execute('UPDATE semesters SET is_active = 0');
    // Activate yang dipilih
    await db.execute({
        sql: 'UPDATE semesters SET is_active = 1 WHERE id = ?',
        args: [id || ''],
    });
    return c.json({ ok: true });
});

// ============================================================================
// SETTINGS LEMBAGA
// ============================================================================
export const settingsRouter = new Hono();
settingsRouter.use('*', requireAuth());

settingsRouter.get('/', async (c) => {
    const result = await db.execute('SELECT * FROM settings_lembaga ORDER BY created_at DESC LIMIT 1');
    if (result.rows.length === 0) return c.json({ data: null });
    const row = result.rows[0] as any;
    // Parse skala_penilaian
    if (typeof row.skala_penilaian === 'string') {
        try { row.skala_penilaian = JSON.parse(row.skala_penilaian); } catch {}
    }
    return c.json({ data: row });
});

const settingsSchema = z.object({
    nama_lembaga: z.string().min(1),
    alamat: z.string().optional().nullable(),
    kota: z.string().optional().nullable(),
    nomor_kontak: z.string().optional().nullable(),
    nama_kepala_lembaga: z.string().optional().nullable(),
    nip_kepala_lembaga: z.string().optional().nullable(),
    logo_url: z.string().optional().nullable(),
    signature_url: z.string().optional().nullable(),
    bobot_akhlak: z.number().min(0).max(100).default(30),
    bobot_kedisiplinan: z.number().min(0).max(100).default(30),
    bobot_kognitif: z.number().min(0).max(100).default(40),
    skala_penilaian: z.record(z.string(), z.number()).default({ A: 85, B: 70, C: 60, D: 0 }),
    footer_raport: z.string().optional().nullable(),
});

settingsRouter.put('/', requireRole('admin'), async (c) => {
    const body = await c.req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal', details: parsed.error.format() }, 400);

    const d = parsed.data;
    const existing = await db.execute('SELECT id FROM settings_lembaga LIMIT 1');

    if (existing.rows.length > 0) {
        const id = (existing.rows[0] as any).id;
        await db.execute({
            sql: `UPDATE settings_lembaga SET
                    nama_lembaga = ?, alamat = ?, kota = ?, nomor_kontak = ?,
                    nama_kepala_lembaga = ?, nip_kepala_lembaga = ?,
                    logo_url = ?, signature_url = ?,
                    bobot_akhlak = ?, bobot_kedisiplinan = ?, bobot_kognitif = ?,
                    skala_penilaian = ?, footer_raport = ?,
                    updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [
                d.nama_lembaga, d.alamat || null, d.kota || null, d.nomor_kontak || null,
                d.nama_kepala_lembaga || null, d.nip_kepala_lembaga || null,
                d.logo_url || null, d.signature_url || null,
                d.bobot_akhlak, d.bobot_kedisiplinan, d.bobot_kognitif,
                JSON.stringify(d.skala_penilaian), d.footer_raport || null,
                id,
            ],
        });
        return c.json({ data: { id, ...d } });
    }

    const id = '00000000-0000-0000-0000-000000000001';
    await db.execute({
        sql: `INSERT INTO settings_lembaga (id, nama_lembaga, alamat, kota, nomor_kontak,
                                            nama_kepala_lembaga, nip_kepala_lembaga, logo_url, signature_url,
                                            bobot_akhlak, bobot_kedisiplinan, bobot_kognitif,
                                            skala_penilaian, footer_raport)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            id, d.nama_lembaga, d.alamat || null, d.kota || null, d.nomor_kontak || null,
            d.nama_kepala_lembaga || null, d.nip_kepala_lembaga || null,
            d.logo_url || null, d.signature_url || null,
            d.bobot_akhlak, d.bobot_kedisiplinan, d.bobot_kognitif,
            JSON.stringify(d.skala_penilaian), d.footer_raport || null,
        ],
    });
    return c.json({ data: { id, ...d } }, 201);
});

// ============================================================================
// USERS
// ============================================================================
export const usersRouter = new Hono();
usersRouter.use('*', requireRole('admin'));

usersRouter.get('/', async (c) => {
    const result = await db.execute('SELECT id, email, role, full_name, is_active, signature_url, created_at FROM users ORDER BY email');
    return c.json({ data: result.rows });
});

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'guru', 'viewer', 'pembimbing']).default('guru'),
    full_name: z.string().min(1),
});

usersRouter.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal' }, 400);

    const argon2 = await import('argon2');
    const hash = await argon2.default.hash(parsed.data.password, { type: argon2.default.argon2id });

    const id = crypto.randomUUID();
    try {
        await db.execute({
            sql: 'INSERT INTO users (id, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)',
            args: [id, parsed.data.email, hash, parsed.data.role, parsed.data.full_name],
        });
    } catch (e: any) {
        if (e.message?.includes('UNIQUE')) {
            return c.json({ error: 'Email sudah terdaftar' }, 409);
        }
        throw e;
    }
    return c.json({ data: { id, ...parsed.data, password: undefined } }, 201);
});

usersRouter.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updateSchema = createUserSchema.partial().omit({ password: true }).extend({
        is_active: z.boolean().optional(),
        new_password: z.string().min(8).optional(),
    });
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal' }, 400);

    const fields: string[] = [];
    const args: any[] = [];

    for (const [key, val] of Object.entries(parsed.data)) {
        if (key === 'new_password') continue;
        fields.push(`${key} = ?`);
        args.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
    }

    if (parsed.data.new_password) {
        const argon2 = await import('argon2');
        const hash = await argon2.default.hash(parsed.data.new_password, { type: argon2.default.argon2id });
        fields.push('password_hash = ?');
        args.push(hash);
    }

    if (fields.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400);

    args.push(id);
    await db.execute({
        sql: `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args,
    });
    return c.json({ ok: true });
});

// ============================================================================
// TEACHER ASSIGNMENTS
// ============================================================================
export const teacherAssignmentsRouter = new Hono();
teacherAssignmentsRouter.use('*', requireAuth());

teacherAssignmentsRouter.get('/', async (c) => {
    const teacherId = c.req.query('teacher_id');
    let sql = `SELECT ta.*, h.nama as halaqah_name, u.full_name as teacher_name
               FROM teacher_assignments ta
               JOIN halaqah h ON ta.halaqah_id = h.id
               JOIN users u ON ta.teacher_id = u.id
               WHERE 1=1`;
    const args: any[] = [];
    if (teacherId) {
        sql += ' AND ta.teacher_id = ?';
        args.push(teacherId);
    }
    sql += ' ORDER BY ta.is_active DESC, h.nama';

    const result = await db.execute({ sql, args });
    return c.json({ data: result.rows });
});

const assignmentSchema = z.object({
    teacher_id: z.string().uuid(),
    halaqah_id: z.string().uuid(),
});

teacherAssignmentsRouter.post('/', requireRole('admin'), async (c) => {
    const body = await c.req.json();
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: 'Validasi gagal' }, 400);

    const id = crypto.randomUUID();
    await db.execute({
        sql: 'INSERT INTO teacher_assignments (id, teacher_id, halaqah_id, is_active) VALUES (?, ?, ?, 1)',
        args: [id, parsed.data.teacher_id, parsed.data.halaqah_id],
    });
    return c.json({ data: { id, ...parsed.data } }, 201);
});

teacherAssignmentsRouter.delete('/:id', requireRole('admin'), async (c) => {
    const id = c.req.param('id');
    await db.execute({
        sql: 'UPDATE teacher_assignments SET is_active = 0 WHERE id = ?',
        args: [id || ''],
    });
    return c.json({ ok: true });
});
