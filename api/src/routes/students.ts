/**
 * src/routes/students.ts — CRUD students + filtering by halaqah
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware';

export const studentsRouter = new Hono();

studentsRouter.use('*', requireAuth());

studentsRouter.get('/', async (c) => {
    const halaqahId = c.req.query('halaqah_id');
    const isActive = c.req.query('is_active');
    const search = c.req.query('q');

    let sql = 'SELECT s.*, h.nama as halaqah_name FROM students s LEFT JOIN halaqah h ON s.halaqah_id = h.id WHERE 1=1';
    const args: any[] = [];

    if (halaqahId) {
        sql += ' AND s.halaqah_id = ?';
        args.push(halaqahId);
    }
    if (isActive !== undefined && isActive !== '') {
        sql += ' AND s.is_active = ?';
        args.push(isActive === 'true' ? 1 : 0);
    }
    if (search) {
        sql += ' AND (s.nama LIKE ? OR s.nis LIKE ?)';
        args.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.nama ASC';

    const result = await db.execute({ sql, args });
    return c.json({ data: result.rows });
});

studentsRouter.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await db.execute({
        sql: 'SELECT * FROM students WHERE id = ?',
        args: [id],
    });
    if (result.rows.length === 0) {
        return c.json({ error: 'Santri tidak ditemukan' }, 404);
    }
    return c.json({ data: result.rows[0] });
});

const studentSchema = z.object({
    nama: z.string().min(1, 'Nama wajib diisi'),
    nis: z.string().optional().nullable(),
    halaqah_id: z.string().uuid().optional().nullable(),
    jenis_kelamin: z.enum(['L', 'P']).optional().nullable(),
    tanggal_lahir: z.string().optional().nullable(),
    nama_orang_tua: z.string().optional().nullable(),
    shift: z.enum(['Siang', 'Sore']).default('Sore'),
    is_active: z.boolean().default(true),
});

studentsRouter.post('/', requireRole('admin'), async (c) => {
    const body = await c.req.json();
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validasi gagal', details: parsed.error.format() }, 400);
    }

    const id = crypto.randomUUID();
    const data = parsed.data;

    await db.execute({
        sql: `INSERT INTO students (id, nama, nis, halaqah_id, jenis_kelamin, tanggal_lahir,
                                     nama_orang_tua, shift, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, data.nama, data.nis || null, data.halaqah_id || null,
               data.jenis_kelamin || null, data.tanggal_lahir || null,
               data.nama_orang_tua || null, data.shift, data.is_active ? 1 : 0],
    });

    return c.json({ data: { id, ...data } }, 201);
});

studentsRouter.patch('/:id', requireRole('admin', 'guru'), async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = studentSchema.partial().safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validasi gagal' }, 400);
    }

    const fields = Object.keys(parsed.data);
    if (fields.length === 0) {
        return c.json({ error: 'Tidak ada field yang diupdate' }, 400);
    }

    const setSql = fields.map(f => `${f} = ?`).join(', ');
    const args = fields.map(f => {
        const val = (parsed.data as any)[f];
        return typeof val === 'boolean' ? (val ? 1 : 0) : val;
    });
    args.push(id);

    await db.execute({
        sql: `UPDATE students SET ${setSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args,
    });

    return c.json({ data: { id, ...parsed.data } });
});

studentsRouter.delete('/:id', requireRole('admin'), async (c) => {
    const id = c.req.param('id');
    // Soft delete (set is_active = 0)
    await db.execute({
        sql: 'UPDATE students SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [id || ''],
    });
    return c.json({ ok: true });
});
