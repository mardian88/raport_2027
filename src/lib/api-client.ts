/**
 * src/lib/api-client.ts — API client untuk backend Hono + Turso
 *
 * Bisa jalan kalau VITE_AUTH_MODE=api dan VITE_API_BASE_URL di-set.
 * Mirip API Supabase tapi endpoint-nya custom Hono server.
 *
 * Endpoints lengkap:
 *   GET    /auth/me                       — session info
 *   POST   /auth/login                    — login
 *   POST   /auth/logout                   — logout
 *
 *   GET    /students                      — list students (filter: halaqah_id, q)
 *   GET    /students/:id                  — detail student
 *   POST   /students                      — create (admin)
 *   PATCH  /students/:id                  — update (admin/guru)
 *   DELETE /students/:id                  — soft delete (admin)
 *
 *   GET    /report-cards                  — list (filter: student_id, semester_id)
 *   GET    /report-cards/leger            — leger nilai
 *   GET    /report-cards/peringkat        — top students
 *   POST   /report-cards                  — upsert
 *
 *   GET    /halaqah                       — list halaqah
 *   POST   /halaqah                       — create (admin)
 *
 *   GET    /semesters                     — list semesters
 *   GET    /semesters/active              — semester aktif
 *   POST   /semesters                     — create (admin)
 *   POST   /semesters/academic-years      — create academic year (admin)
 *   PATCH  /semesters/:id/activate        — activate (admin)
 *
 *   GET    /settings                      — lembaga settings
 *   PUT    /settings                      — update settings (admin)
 *
 *   GET    /users                         — list users (admin)
 *   POST   /users                         — create user (admin)
 *   PATCH  /users/:id                     — update user (admin)
 *
 *   GET    /teacher-assignments           — list assignments
 *   POST   /teacher-assignments           — create assignment (admin)
 *   DELETE /teacher-assignments/:id       — soft delete (admin)
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    query?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<{ data: T | null; error: any }> {
    try {
        const url = new URL(BASE + path);
        if (opts.query) {
            for (const [k, v] of Object.entries(opts.query)) {
                if (v !== undefined && v !== null && v !== '') {
                    url.searchParams.append(k, String(v));
                }
            }
        }

        const response = await fetch(url.toString(), {
            method: opts.method || 'GET',
            credentials: 'include', // penting: kirim cookie session
            headers: {
                'Content-Type': 'application/json',
            },
            body: opts.body ? JSON.stringify(opts.body) : undefined,
        });

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            return {
                data: null,
                error: payload?.error || `HTTP ${response.status}`,
            };
        }

        return { data: payload as T, error: null };
    } catch (err: any) {
        return { data: null, error: err.message || 'Network error' };
    }
}

// ============================================================================
// Query builder (mirip Supabase untuk backward compat)
// ============================================================================

type Filter = { field: string; op: 'eq' | 'neq' | 'in'; value: any };

class ApiQueryBuilder {
    private filters: Filter[] = [];
    private orderBy: { field: string; ascending: boolean } | null = null;
    private limitCount: number | null = null;
    private singleMode = false;

    constructor(private tableName: string) {}

    select(_fields = '*') { return this; }

    eq(field: string, value: any) {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    neq(field: string, value: any) {
        this.filters.push({ field, op: 'neq', value });
        return this;
    }

    in(field: string, values: any[]) {
        this.filters.push({ field, op: 'in', value: values });
        return this;
    }

    order(field: string, opts: { ascending?: boolean } = {}) {
        this.orderBy = { field, ascending: opts.ascending !== false };
        return this;
    }

    limit(n: number) {
        this.limitCount = n;
        return this;
    }

    single() {
        this.singleMode = true;
        return this.execute();
    }

    private async execute(): Promise<{ data: any; error: any }> {
        // Map table name → endpoint
        const endpoint = TABLE_TO_ENDPOINT[this.tableName];
        if (!endpoint) {
            return { data: null, error: `Unknown table: ${this.tableName}` };
        }

        const query: Record<string, any> = {};

        for (const f of this.filters) {
            if (f.op === 'eq') {
                query[f.field] = f.value;
            } else if (f.op === 'in') {
                query[`${f.field}_in`] = Array.isArray(f.value) ? f.value.join(',') : f.value;
            }
            // neq: belum disupport di query params sederhana
        }

        if (this.orderBy) {
            query.order = this.orderBy.field;
            query.asc = this.orderBy.ascending ? 'true' : 'false';
        }
        if (this.limitCount !== null) {
            query.limit = String(this.limitCount);
        }

        const result = await request(endpoint, { query });
        if (result.error) return { data: null, error: result.error };

        const rows = (result.data as any)?.data;
        if (this.singleMode) {
            return { data: Array.isArray(rows) ? (rows[0] || null) : rows, error: null };
        }
        return { data: rows, error: null };
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute().then(resolve, reject);
    }
}

class ApiInsertBuilder {
    constructor(private tableName: string, private rows: any) {}

    select() { return this; }
    single() { return this.execute(true); }

    private async execute(returnSingle = false): Promise<{ data: any; error: any }> {
        const endpoint = TABLE_TO_ENDPOINT[this.tableName];
        if (!endpoint) return { data: null, error: `Unknown table: ${this.tableName}` };

        const result = await request(endpoint, { method: 'POST', body: this.rows });
        if (result.error) return { data: null, error: result.error };

        const data = (result.data as any)?.data;
        return { data: returnSingle ? data : (Array.isArray(this.rows) ? [data] : data), error: null };
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute(false).then(resolve, reject);
    }
}

class ApiUpdateBuilder {
    private filters: Filter[] = [];
    constructor(private tableName: string, private updates: any) {}

    eq(field: string, value: any) {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    in(field: string, values: any[]) {
        this.filters.push({ field, op: 'in', value: values });
        return this;
    }

    private async execute(): Promise<{ data: any; error: any }> {
        const endpoint = TABLE_TO_ENDPOINT[this.tableName];
        if (!endpoint) return { data: null, error: `Unknown table: ${this.tableName}` };

        // Cari id dari filter eq
        const idFilter = this.filters.find(f => f.op === 'eq' && f.field === 'id');
        if (!idFilter) {
            return { data: null, error: 'Update via API butuh filter id=' };
        }

        const path = `${endpoint}/${idFilter.value}`;
        const result = await request(path, { method: 'PATCH', body: this.updates });
        if (result.error) return { data: null, error: result.error };

        return { data: (result.data as any)?.data || this.updates, error: null };
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute().then(resolve, reject);
    }
}

class ApiDeleteBuilder {
    private filters: Filter[] = [];
    constructor(private tableName: string) {}

    eq(field: string, value: any) {
        this.filters.push({ field, op: 'eq', value });
        return this;
    }

    in(field: string, values: any[]) {
        this.filters.push({ field, op: 'in', value: values });
        return this;
    }

    private async execute(): Promise<{ data: any; error: any }> {
        const endpoint = TABLE_TO_ENDPOINT[this.tableName];
        if (!endpoint) return { data: null, error: `Unknown table: ${this.tableName}` };

        const idFilter = this.filters.find(f => f.op === 'eq' && f.field === 'id');
        if (!idFilter) {
            return { data: null, error: 'Delete via API butuh filter id=' };
        }

        const result = await request(`${endpoint}/${idFilter.value}`, { method: 'DELETE' });
        if (result.error) return { data: null, error: result.error };
        return { data: null, error: null };
    }

    then(resolve: (value: { data: any; error: any }) => any, reject?: (err: any) => any) {
        return this.execute().then(resolve, reject);
    }
}

const TABLE_TO_ENDPOINT: Record<string, string> = {
    users: '/users',
    students: '/students',
    halaqah: '/halaqah',
    semesters: '/semesters',
    academic_years: '/semesters/academic-years',
    settings_lembaga: '/settings',
    report_cards: '/report-cards',
    teacher_assignments: '/teacher-assignments',
};

// ============================================================================
// Main client (Supabase-like)
// ============================================================================

class ApiClient {
    auth = {
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
            return request<{ user: any }>('/auth/login', {
                method: 'POST',
                body: { email, password },
            });
        },
        signOut: async () => {
            return request('/auth/logout', { method: 'POST' });
        },
        getSession: async () => {
            const r = await request<{ user: any }>('/auth/me');
            // Map ke format Supabase
            return {
                data: {
                    session: r.data?.user ? {
                        access_token: 'cookie',
                        user: r.data.user,
                    } : null,
                },
                error: r.error,
            };
        },
        getUser: async () => {
            const r = await this.auth.getSession();
            return { data: { user: r.data.session?.user || null }, error: r.error };
        },
        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            // Polling fallback (cookie-based tidak bisa detect perubahan realtime)
            const interval = setInterval(async () => {
                const r = await this.auth.getSession();
                callback(r.data.session ? 'SIGNED_IN' : 'SIGNED_OUT', r.data.session);
            }, 2000);
            return {
                data: {
                    subscription: {
                        unsubscribe: () => clearInterval(interval),
                    },
                },
            };
        },
    };

    storage = {
        from: (_bucket: string) => ({
            upload: async (path: string, _file: File) => ({ data: { path }, error: null }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
            remove: async (_paths: string[]) => ({ data: [], error: null }),
        }),
    };

    from(tableName: string) {
        return {
            select: (_fields?: string) => new ApiQueryBuilder(tableName),
            insert: (rows: any) => new ApiInsertBuilder(tableName, rows),
            update: (updates: any) => new ApiUpdateBuilder(tableName, updates),
            delete: () => new ApiDeleteBuilder(tableName),
        };
    }

    rpc(_name: string, _params: any) {
        return Promise.resolve({ data: null, error: { message: 'RPC belum diimplementasi di api-client' } });
    }
}

export const apiClient = new ApiClient();

// Direct helpers (lebih sederhana, tidak lewat query builder)
export const api = {
    get: <T = any>(path: string, query?: Record<string, any>) => request<T>(path, { query }),
    post: <T = any>(path: string, body: any) => request<T>(path, { method: 'POST', body }),
    patch: <T = any>(path: string, body: any) => request<T>(path, { method: 'PATCH', body }),
    put: <T = any>(path: string, body: any) => request<T>(path, { method: 'PUT', body }),
    delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
};
