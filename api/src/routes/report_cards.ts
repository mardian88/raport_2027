/**
 * src/routes/report_cards.ts — Raport: input, leger, peringkat
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware';

export const reportCardsRouter = new Hono();

reportCardsRouter.use('*', requireAuth());

// ============================================================================
// GET /report-cards — list raport by student atau semester
// ============================================================================
reportCardsRouter.get('/', async (c) => {
    const studentId = c.req.query('student_id');
    const semesterId = c.req.query('semester_id');

    let sql = `SELECT rc.*, s.nama as student_name, s.nis
               FROM report_cards rc
               JOIN students s ON rc.student_id = s.id
               WHERE 1=1`;
    const args: any[] = [];

    if (studentId) {
        sql += ' AND rc.student_id = ?';
        args.push(studentId);
    }
    if (semesterId) {
        sql += ' AND rc.semester_id = ?';
        args.push(semesterId);
    }

    sql += ' ORDER BY s.nama';

    const result = await db.execute({ sql, args });
    return c.json({ data: result.rows });
});

// ============================================================================
// GET /report-cards/leger — leger nilai (weighted by settings)
// ============================================================================
reportCardsRouter.get('/leger', async (c) => {
    const semesterId = c.req.query('semester_id');
    const halaqahId = c.req.query('halaqah_id');

    if (!semesterId) {
        return c.json({ error: 'semester_id wajib diisi' }, 400);
    }

    // Ambil settings (bobot + skala)
    const settingsResult = await db.execute(
        'SELECT bobot_akhlak, bobot_kedisiplinan, bobot_kognitif, skala_penilaian FROM settings_lembaga ORDER BY created_at DESC LIMIT 1'
    );
    const settings = settingsResult.rows[0] as any;

    const bobotAkhlak = settings?.bobot_akhlak ?? 30;
    const bobotKedisiplinan = settings?.bobot_kedisiplinan ?? 30;
    const bobotKognitif = settings?.bobot_kognitif ?? 40;

    // Parse skala_penilaian (bisa string JSON atau object)
    let skala: Record<string, number> = {};
    if (settings?.skala_penilaian) {
        skala = typeof settings.skala_penilaian === 'string'
            ? JSON.parse(settings.skala_penilaian)
            : settings.skala_penilaian;
    }

    // Query leger
    let sql = `SELECT s.id as student_id, s.nama as student_name, s.nis,
                      s.halaqah_id, h.nama as halaqah_name,
                      rc.semester_id, rc.nilai_akhir_akhlak, rc.nilai_akhir_kedisiplinan,
                      rc.nilai_akhir_kognitif
               FROM report_cards rc
               JOIN students s ON rc.student_id = s.id
               LEFT JOIN halaqah h ON s.halaqah_id = h.id
               WHERE rc.semester_id = ? AND s.is_active = 1`;
    const args: any[] = [semesterId];

    if (halaqahId) {
        sql += ' AND s.halaqah_id = ?';
        args.push(halaqahId);
    }

    sql += ' ORDER BY s.nama';

    const result = await db.execute({ sql, args });

    // Compute weighted + predikat
    const leger = (result.rows as any[]).map(r => {
        const total = (
            (r.nilai_akhir_akhlak || 0) * bobotAkhlak +
            (r.nilai_akhir_kedisiplinan || 0) * bobotKedisiplinan +
            (r.nilai_akhir_kognitif || 0) * bobotKognitif
        ) / 100;

        // Determine predikat dari skala (descending)
        const sorted = Object.entries(skala).sort(([, a], [, b]) => Number(b) - Number(a));
        let predikat = sorted[sorted.length - 1]?.[0] || 'D';
        for (const [grade, min] of sorted) {
            if (total >= Number(min)) {
                predikat = grade;
                break;
            }
        }

        return {
            ...r,
            nilai_akhir_total: total,
            predikat,
        };
    });

    return c.json({ data: leger, settings: { bobot_akhlak: bobotAkhlak, bobot_kedisiplinan: bobotKedisiplinan, bobot_kognitif: bobotKognitif, skala_penilaian: skala } });
});

// ============================================================================
// POST /report-cards — upsert raport
// ============================================================================
const reportCardSchema = z.object({
    student_id: z.string().uuid(),
    semester_id: z.string().uuid(),
    akhlak: z.record(z.string(), z.number()).default({}),
    kedisiplinan: z.record(z.string(), z.number()).default({}),
    kognitif: z.record(z.string(), z.number()).default({}),
    uas_tulis: z.number().min(0).max(100).default(0),
    uas_lisan: z.number().min(0).max(100).default(0),
    catatan: z.string().optional().nullable(),
});

function calculateAverage(scores: Record<string, number>): number {
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

reportCardsRouter.post('/', requireRole('admin', 'guru', 'pembimbing'), async (c) => {
    const body = await c.req.json();
    const parsed = reportCardSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validasi gagal', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const nilaiAkhirAkhlak = calculateAverage(data.akhlak);
    const nilaiAkhirKedisiplinan = calculateAverage(data.kedisiplinan);
    const nilaiAkhirKognitif = calculateAverage(data.kognitif);

    // Upsert: kalau sudah ada (student_id, semester_id), update
    const existing = await db.execute({
        sql: 'SELECT id FROM report_cards WHERE student_id = ? AND semester_id = ?',
        args: [data.student_id, data.semester_id],
    });

    if (existing.rows.length > 0) {
        const id = (existing.rows[0] as any).id;
        await db.execute({
            sql: `UPDATE report_cards SET
                    akhlak = ?, kedisiplinan = ?, kognitif = ?,
                    uas_tulis = ?, uas_lisan = ?,
                    nilai_akhir_akhlak = ?, nilai_akhir_kedisiplinan = ?, nilai_akhir_kognitif = ?,
                    catatan = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [
                JSON.stringify(data.akhlak),
                JSON.stringify(data.kedisiplinan),
                JSON.stringify(data.kognitif),
                data.uas_tulis, data.uas_lisan,
                nilaiAkhirAkhlak, nilaiAkhirKedisiplinan, nilaiAkhirKognitif,
                data.catatan || null, id,
            ],
        });
        return c.json({ data: { id, ...data, nilai_akhir_akhlak: nilaiAkhirAkhlak, nilai_akhir_kedisiplinan: nilaiAkhirKedisiplinan, nilai_akhir_kognitif: nilaiAkhirKognitif } });
    }

    const id = crypto.randomUUID();
    await db.execute({
        sql: `INSERT INTO report_cards (id, student_id, semester_id, akhlak, kedisiplinan, kognitif,
                                         uas_tulis, uas_lisan,
                                         nilai_akhir_akhlak, nilai_akhir_kedisiplinan, nilai_akhir_kognitif,
                                         catatan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            id, data.student_id, data.semester_id,
            JSON.stringify(data.akhlak), JSON.stringify(data.kedisiplinan), JSON.stringify(data.kognitif),
            data.uas_tulis, data.uas_lisan,
            nilaiAkhirAkhlak, nilaiAkhirKedisiplinan, nilaiAkhirKognitif,
            data.catatan || null,
        ],
    });
    return c.json({ data: { id, ...data, nilai_akhir_akhlak: nilaiAkhirAkhlak, nilai_akhir_kedisiplinan: nilaiAkhirKedisiplinan, nilai_akhir_kognitif: nilaiAkhirKognitif } }, 201);
});

// ============================================================================
// GET /report-cards/peringkat — top students by category
// ============================================================================
reportCardsRouter.get('/peringkat', async (c) => {
    const semesterId = c.req.query('semester_id');
    const limit = parseInt(c.req.query('limit') || '10', 10);

    if (!semesterId) {
        return c.json({ error: 'semester_id wajib diisi' }, 400);
    }

    // Ambil settings
    const settingsResult = await db.execute(
        'SELECT bobot_akhlak, bobot_kedisiplinan, bobot_kognitif FROM settings_lembaga ORDER BY created_at DESC LIMIT 1'
    );
    const s = settingsResult.rows[0] as any;
    const ba = s?.bobot_akhlak ?? 30;
    const bk = s?.bobot_kedisiplinan ?? 30;
    const bg = s?.bobot_kognitif ?? 40;

    const result = await db.execute({
        sql: `SELECT s.id as student_id, s.nama, s.nis, h.nama as halaqah_name,
                     rc.nilai_akhir_akhlak, rc.nilai_akhir_kedisiplinan, rc.nilai_akhir_kognitif,
                     (rc.nilai_akhir_akhlak * ? + rc.nilai_akhir_kedisiplinan * ? + rc.nilai_akhir_kognitif * ?) / 100 as total
              FROM report_cards rc
              JOIN students s ON rc.student_id = s.id
              LEFT JOIN halaqah h ON s.halaqah_id = h.id
              WHERE rc.semester_id = ? AND s.is_active = 1
              ORDER BY total DESC
              LIMIT ?`,
        args: [ba, bk, bg, semesterId, limit],
    });

    return c.json({ data: result.rows });
});
