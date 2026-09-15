/**
 * local-db.ts
 *
 * LocalStorage-backed database dengan API yang kompatibel dengan Supabase.
 * Memungkinkan sistem berjalan tanpa backend (mode 'bypass').
 *
 * Saat sudah migrasi ke Turso penuh, file ini bisa dihapus dan langsung pakai
 * api-client.ts.
 *
 * CATATAN PENTING:
 * - LocalStorage hanya bisa simpan ~5-10MB. Tidak untuk data produksi.
 * - Bypass mode cocok untuk development, demo, dan personal use.
 * - Untuk multi-user atau data produksi, HARUS pakai API backend.
 */

import { randomUUID } from '../utils/uuid';

// ============================================================
// TYPES
// ============================================================

type Row = Record<string, any>;
type Table = Record<string, Row[]>;

interface WhereFilter {
    field: string;
    op: 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
    value: any;
}

interface OrderBy {
    field: string;
    ascending: boolean;
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

const DB_KEY = 'rqm_local_db_v1';
const SESSION_KEY = 'rqm_session_v1';

function loadDB(): Table {
    try {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) return getDefaultDB();
        return JSON.parse(raw);
    } catch {
        return getDefaultDB();
    }
}

function saveDB(db: Table) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
            throw new Error('LocalStorage penuh. Hapus data lama, atau pindah ke Turso backend.');
        }
        throw e;
    }
}

function getDefaultDB(): Table {
    const now = new Date().toISOString();

    // Surah default untuk Juz 30
    const surah30 = [
        'An-Naba\'', 'An-Naziat', 'Abasa', 'At-Takwir', 'Al-Infithar',
        'Al-Muthaffifin', 'Al-Insyiqaq', 'Al-Buruj', 'At-Thariq', 'Al-A\'la',
        'Al-Ghasyiyah', 'Al-Fajr', 'Al-Balad', 'Asy-Syams', 'Al-Lail',
        'Adh-Dhuha', 'Al-Insyirah', 'At-Tin', 'Al-Alaq', 'Al-Qadr',
        'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat', 'Al-Qari\'ah', 'At-Takatsur',
        'Al-Ashr', 'Al-Humazah', 'Al-Fil', 'Quraisy', 'Al-Ma\'un',
        'Al-Kautsar', 'Al-Kafirun', 'An-Nashr', 'Al-Lahab', 'Al-Ikhlas',
        'Al-Falaq', 'An-Nas'
    ].map((nama, i) => ({
        id: `s-j30-${i + 1}`,
        nama_surah: nama,
        juz: 30,
        urutan_dalam_juz: i + 1,
        created_at: now
    }));

    return {
        users: [{
            id: '00000000-0000-0000-0000-0000000000aa',
            email: 'admin@rqm.com',
            password_hash: null,           // bypass mode: no real check
            role: 'admin',
            full_name: 'Administrator',
            signature_url: null,
            is_active: 1,
            created_at: now,
            updated_at: now
        }],
        sessions: [],
        settings_lembaga: [{
            id: '00000000-0000-0000-0000-000000000001',
            nama_lembaga: 'Rumah Qur\'an Muharrik',
            alamat: 'Jl. Contoh No. 123',
            kota: 'Jakarta',
            nomor_kontak: '021-12345678',
            nama_kepala_lembaga: 'Nama Kepala Lembaga',
            nip_kepala_lembaga: '-',
            logo_url: null,
            signature_url: null,
            bobot_akhlak: 30,
            bobot_kedisiplinan: 30,
            bobot_kognitif: 40,
            skala_penilaian: JSON.stringify({ A: 85, B: 70, C: 60, D: 0 }),
            footer_raport: '',
            tempat_tanggal_raport: null,
            created_at: now,
            updated_at: now
        }],
        academic_years: [],
        semesters: [],
        halaqah: [],
        students: [],
        teacher_assignments: [],
        tahsin_master: [
            { id: 'tm-001', nama_item: 'Mad', urutan: 1, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-002', nama_item: 'Ghunnah', urutan: 2, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-003', nama_item: 'Idgham', urutan: 4, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-004', nama_item: 'Ikhfa', urutan: 5, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-005', nama_item: 'Iqlab', urutan: 6, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-006', nama_item: 'Qalqalah', urutan: 7, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-007', nama_item: 'Tafkhim', urutan: 8, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-008', nama_item: 'Tarqiq', urutan: 9, halaqah_id: null, is_active: 1, created_at: now },
            { id: 'tm-009', nama_item: 'Waqaf & Ibtida', urutan: 10, halaqah_id: null, is_active: 1, created_at: now }
        ],
        surah_master: surah30,
        student_surah_assignment: [],
        tahfidz_progress: [],
        report_cards: [],
        uploaded_files: [],
        activity_log: []
    };
}

// ============================================================
// QUERY BUILDER (Supabase-compatible)
// ============================================================

class QueryBuilder<T = Row> {
    private filters: WhereFilter[] = [];
    private orderBy: OrderBy | null = null;
    private limitCount: number | null = null;
    private singleMode = false;
    private selectFields: string | null = null;

    constructor(
        private tableName: string,
        private db: Table
    ) {}

    select(fields = '*'): this {
        this.selectFields = fields;
        return this;
    }

    eq(field: string, value: any): this {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    neq(field: string, value: any): this {
        this.filters.push({ field, op: 'neq', value });
        return this;
    }

    in(field: string, values: any[]): this {
        this.filters.push({ field, op: 'in', value: values });
        return this;
    }

    gt(field: string, value: any): this {
        this.filters.push({ field, op: 'gt', value });
        return this;
    }

    lt(field: string, value: any): this {
        this.filters.push({ field, op: 'lt', value });
        return this;
    }

    gte(field: string, value: any): this {
        this.filters.push({ field, op: 'gte', value });
        return this;
    }

    lte(field: string, value: any): this {
        this.filters.push({ field, op: 'lte', value });
        return this;
    }

    order(field: string, opts: { ascending?: boolean } = {}): this {
        this.orderBy = { field, ascending: opts.ascending !== false };
        return this;
    }

    limit(n: number): this {
        this.limitCount = n;
        return this;
    }

    single(): Promise<{ data: T | null; error: any }> {
        this.singleMode = true;
        return this.execute();
    }

    private matchesFilter(row: Row, filter: WhereFilter): boolean {
        const val = row[filter.field];
        switch (filter.op) {
            case 'eq': return val === filter.value;
            case 'neq': return val !== filter.value;
            case 'in': return Array.isArray(filter.value) && filter.value.includes(val);
            case 'gt': return val > filter.value;
            case 'lt': return val < filter.value;
            case 'gte': return val >= filter.value;
            case 'lte': return val <= filter.value;
            default: return true;
        }
    }

    private async execute(): Promise<{ data: any; error: any }> {
        try {
            let rows = this.db[this.tableName] || [];

            // Apply filters
            for (const filter of this.filters) {
                rows = rows.filter(row => this.matchesFilter(row, filter));
            }

            // Apply order
            if (this.orderBy) {
                const { field, ascending } = this.orderBy;
                rows = [...rows].sort((a, b) => {
                    if (a[field] < b[field]) return ascending ? -1 : 1;
                    if (a[field] > b[field]) return ascending ? 1 : -1;
                    return 0;
                });
            }

            // Apply limit
            if (this.limitCount !== null) {
                rows = rows.slice(0, this.limitCount);
            }

            // Handle !inner joins (simplified - return the relation as nested)
            // We don't fully implement joins, but we let the consumer handle post-processing
            const data = this.singleMode ? (rows[0] || null) : rows;

            return { data, error: null };
        } catch (e: any) {
            return { data: null, error: e };
        }
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute().then(resolve, reject);
    }
}

class InsertBuilder {
    constructor(private tableName: string, private db: Table, private rows: Row | Row[]) {}

    select() { return this; }
    single(): Promise<{ data: any; error: any }> {
        return this.execute(true);
    }

    private async execute(returnSingle = false): Promise<{ data: any; error: any }> {
        try {
            const rowsToInsert = Array.isArray(this.rows) ? this.rows : [this.rows];
            const inserted = rowsToInsert.map(row => ({
                id: row.id || randomUUID(),
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString(),
                ...row
            }));

            if (!this.db[this.tableName]) this.db[this.tableName] = [];
            this.db[this.tableName].push(...inserted);
            saveDB(this.db);

            return {
                data: returnSingle ? inserted[0] : inserted,
                error: null
            };
        } catch (e: any) {
            return { data: null, error: e };
        }
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute(false).then(resolve, reject);
    }
}

class UpdateBuilder {
    private filters: WhereFilter[] = [];
    constructor(private tableName: string, private db: Table, private updates: Row) {}

    eq(field: string, value: any): this { this.filters.push({ field, op: 'eq', value }); return this; }
    in(field: string, values: any[]): this { this.filters.push({ field, op: 'in', value: values }); return this; }

    private async execute(): Promise<{ data: any; error: any }> {
        try {
            const rows = this.db[this.tableName] || [];
            let updatedCount = 0;
            for (const row of rows) {
                const matches = this.filters.every(f => {
                    const val = row[f.field];
                    if (f.op === 'eq') return val === f.value;
                    if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
                    return true;
                });
                if (matches) {
                    Object.assign(row, this.updates, { updated_at: new Date().toISOString() });
                    updatedCount++;
                }
            }
            saveDB(this.db);
            return { data: rows.filter(r => this.filters.every(f => {
                const val = r[f.field];
                if (f.op === 'eq') return val === f.value;
                if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
                return true;
            })), error: null };
        } catch (e: any) {
            return { data: null, error: e };
        }
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute().then(resolve, reject);
    }
}

class DeleteBuilder {
    private filters: WhereFilter[] = [];
    constructor(private tableName: string, private db: Table) {}

    eq(field: string, value: any): this { this.filters.push({ field, op: 'eq', value }); return this; }
    in(field: string, values: any[]): this { this.filters.push({ field, op: 'in', value: values }); return this; }

    private async execute(): Promise<{ data: any; error: any; count?: number }> {
        try {
            const rows = this.db[this.tableName] || [];
            const before = rows.length;
            this.db[this.tableName] = rows.filter(row => {
                return !this.filters.every(f => {
                    const val = row[f.field];
                    if (f.op === 'eq') return val === f.value;
                    if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
                    return true;
                });
            });
            saveDB(this.db);
            return { data: null, error: null, count: before - this.db[this.tableName].length };
        } catch (e: any) {
            return { data: null, error: e };
        }
    }

    then(resolve: (value: { data: any; error: any; count?: number }) => any, reject?: (err: any) => any) {
        return this.execute().then(resolve, reject);
    }
}

// ============================================================
// TABLE INTERFACE (Supabase-like .from())
// ============================================================

class TableInterface {
    constructor(private tableName: string, private db: Table) {}

    select(fields = '*') { return new QueryBuilder(this.tableName, this.db).select(fields); }
    insert(rows: Row | Row[]) { return new InsertBuilder(this.tableName, this.db, rows); }
    update(updates: Row) { return new UpdateBuilder(this.tableName, this.db, updates); }
    delete() { return new DeleteBuilder(this.tableName, this.db); }
}

// ============================================================
// STORAGE (mimics supabase.storage)
// ============================================================

const FILE_STORAGE_KEY = 'rqm_files_v1';

function loadFiles(): Record<string, string> {                          // path -> dataURL
    try {
        const raw = localStorage.getItem(FILE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveFiles(files: Record<string, string>) {
    try {
        localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(files));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
            throw new Error('LocalStorage penuh. Tidak bisa upload file.');
        }
        throw e;
    }
}

class StorageBucket {
    constructor(private bucketName: string) {}

    async upload(path: string, file: File): Promise<{ data: any; error: any }> {
        try {
            return new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const files = loadFiles();
                    files[`${this.bucketName}/${path}`] = reader.result as string;
                    saveFiles(files);
                    res({ data: { path }, error: null });
                };
                reader.onerror = () => rej({ data: null, error: reader.error });
                reader.readAsDataURL(file);
            });
        } catch (e: any) {
            return { data: null, error: e };
        }
    }

    getPublicUrl(path: string): { data: { publicUrl: string } } {
        const files = loadFiles();
        const url = files[`${this.bucketName}/${path}`] || '';
        return { data: { publicUrl: url } };
    }

    async remove(paths: string[]): Promise<{ data: any; error: any }> {
        try {
            const files = loadFiles();
            paths.forEach(p => delete files[`${this.bucketName}/${p}`]);
            saveFiles(files);
            return { data: paths.map(p => ({ name: p })), error: null };
        } catch (e: any) {
            return { data: null, error: e };
        }
    }
}

class Storage {
    from(bucketName: string) {
        return new StorageBucket(bucketName);
    }
}

// ============================================================
// AUTH (mimics supabase.auth)
// ============================================================

const FAKE_ADMIN_USER = {
    id: '00000000-0000-0000-0000-0000000000aa',
    email: 'admin@rqm.com',
    role: 'admin',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: { full_name: 'Administrator' },
    created_at: new Date().toISOString(),
};

const FAKE_ADMIN_SESSION = {
    access_token: 'bypass-token',
    refresh_token: 'bypass-refresh',
    expires_in: 999999,
    expires_at: Math.floor(Date.now() / 1000) + 999999,
    token_type: 'bearer',
    user: FAKE_ADMIN_USER,
};

class Auth {
    async signInWithPassword(credentials: { email: string; password: string }) {
        // Bypass mode: terima apa pun kecuali password kosong
        if (!credentials.email || !credentials.password) {
            return { data: null, error: { message: 'Email dan password harus diisi' } } as any;
        }

        const db = loadDB();
        const user = (db.users || []).find(u => u.email === credentials.email);

        if (!user) {
            // Auto-create user untuk demo
            const id = randomUUID();
            const now = new Date().toISOString();
            const newUser = {
                id,
                email: credentials.email,
                password_hash: null,
                role: credentials.email.includes('admin') ? 'admin' : 'guru',
                full_name: credentials.email.split('@')[0],
                signature_url: null,
                is_active: 1,
                created_at: now,
                updated_at: now
            };
            db.users.push(newUser);
            saveDB(db);

            const session = { ...FAKE_ADMIN_SESSION, user: { ...FAKE_ADMIN_USER, id, email: credentials.email, full_name: newUser.full_name } };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));

            return { data: { user: session.user, session }, error: null };
        }

        // Existing user
        const session = { ...FAKE_ADMIN_SESSION, user: { ...FAKE_ADMIN_USER, ...user } };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        return { data: { user: session.user, session }, error: null };
    }

    async signOut() {
        localStorage.removeItem(SESSION_KEY);
        return { error: null };
    }

    async getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return { data: { session: null }, error: null };
            const session = JSON.parse(raw);
            return { data: { session }, error: null };
        } catch {
            return { data: { session: null }, error: null };
        }
    }

    async getUser() {
        const { data } = await this.getSession();
        return { data: { user: data.session?.user || null }, error: null };
    }

    onAuthStateChange(callback: (event: string, session: any) => void) {
        // Polling setiap detik
        const interval = setInterval(() => {
            const raw = localStorage.getItem(SESSION_KEY);
            const session = raw ? JSON.parse(raw) : null;
            callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        }, 1000);

        return {
            data: {
                subscription: {
                    unsubscribe: () => clearInterval(interval)
                }
            }
        };
    }
}

// ============================================================
// MAIN CLIENT (Supabase-like)
// ============================================================

class LocalDBClient {
    auth = new Auth();
    storage = new Storage();

    from(tableName: string) {
        return new TableInterface(tableName, loadDB());
    }

    // RPC stub
    async rpc(name: string, params: any) {
        return { data: null, error: { message: `RPC ${name} not implemented in local-db` } };
    }
}

// ============================================================
// EXPORTS
// ============================================================

export const localDb = new LocalDBClient();

// For raw access (debugging, migrations)
export function _getRawDB() { return loadDB(); }
export function _setRawDB(db: Table) { saveDB(db); }
export function _resetDB() { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); localStorage.removeItem(FILE_STORAGE_KEY); }
export function _exportDB() { return JSON.stringify({ db: loadDB(), files: loadFiles() }, null, 2); }