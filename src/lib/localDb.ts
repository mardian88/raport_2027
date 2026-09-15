// ============================================================
// LOCAL DATABASE - replaces Supabase with localStorage
// ============================================================
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  students: 'rqm_students',
  halaqah: 'rqm_halaqah',
  users: 'rqm_users',
  academic_years: 'rqm_academic_years',
  semesters: 'rqm_semesters',
  report_cards: 'rqm_report_cards',
  tahfidz_progress: 'rqm_tahfidz_progress',
  surah_master: 'rqm_surah_master',
  tahsin_master: 'rqm_tahsin_master',
  teacher_assignments: 'rqm_teacher_assignments',
  student_surah_assignment: 'rqm_student_surah_assignment',
  settings_lembaga: 'rqm_settings_lembaga',
};

function readTable<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function writeTable<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}
function readSingle<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function writeSingle<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---- SEED DATA ----
const SURAH_SEED = [
  // JUZ 27
  {id:'s001',juz:27,nama_surah:'Adz-Dzariyat',nomor_surah:51,urutan_dalam_juz:1,is_active:true},
  {id:'s002',juz:27,nama_surah:'Ath-Thur',nomor_surah:52,urutan_dalam_juz:2,is_active:true},
  {id:'s003',juz:27,nama_surah:'An-Najm',nomor_surah:53,urutan_dalam_juz:3,is_active:true},
  {id:'s004',juz:27,nama_surah:'Al-Qamar',nomor_surah:54,urutan_dalam_juz:4,is_active:true},
  {id:'s005',juz:27,nama_surah:'Ar-Rahman',nomor_surah:55,urutan_dalam_juz:5,is_active:true},
  {id:'s006',juz:27,nama_surah:'Al-Waqiah',nomor_surah:56,urutan_dalam_juz:6,is_active:true},
  {id:'s007',juz:27,nama_surah:'Al-Hadid',nomor_surah:57,urutan_dalam_juz:7,is_active:true},
  // JUZ 28
  {id:'s008',juz:28,nama_surah:'Al-Mujadila',nomor_surah:58,urutan_dalam_juz:1,is_active:true},
  {id:'s009',juz:28,nama_surah:'Al-Hasyr',nomor_surah:59,urutan_dalam_juz:2,is_active:true},
  {id:'s010',juz:28,nama_surah:'Al-Mumtahanah',nomor_surah:60,urutan_dalam_juz:3,is_active:true},
  {id:'s011',juz:28,nama_surah:'Ash-Shaff',nomor_surah:61,urutan_dalam_juz:4,is_active:true},
  {id:'s012',juz:28,nama_surah:'Al-Jumuah',nomor_surah:62,urutan_dalam_juz:5,is_active:true},
  {id:'s013',juz:28,nama_surah:'Al-Munafiqun',nomor_surah:63,urutan_dalam_juz:6,is_active:true},
  {id:'s014',juz:28,nama_surah:'At-Taghabun',nomor_surah:64,urutan_dalam_juz:7,is_active:true},
  {id:'s015',juz:28,nama_surah:'Ath-Thalaq',nomor_surah:65,urutan_dalam_juz:8,is_active:true},
  {id:'s016',juz:28,nama_surah:'At-Tahrim',nomor_surah:66,urutan_dalam_juz:9,is_active:true},
  // JUZ 29
  {id:'s017',juz:29,nama_surah:'Al-Mulk',nomor_surah:67,urutan_dalam_juz:1,is_active:true},
  {id:'s018',juz:29,nama_surah:'Al-Qalam',nomor_surah:68,urutan_dalam_juz:2,is_active:true},
  {id:'s019',juz:29,nama_surah:'Al-Haqqah',nomor_surah:69,urutan_dalam_juz:3,is_active:true},
  {id:'s020',juz:29,nama_surah:'Al-Maarij',nomor_surah:70,urutan_dalam_juz:4,is_active:true},
  {id:'s021',juz:29,nama_surah:'Nuh',nomor_surah:71,urutan_dalam_juz:5,is_active:true},
  {id:'s022',juz:29,nama_surah:'Al-Jinn',nomor_surah:72,urutan_dalam_juz:6,is_active:true},
  {id:'s023',juz:29,nama_surah:'Al-Muzzammil',nomor_surah:73,urutan_dalam_juz:7,is_active:true},
  {id:'s024',juz:29,nama_surah:'Al-Muddaththir',nomor_surah:74,urutan_dalam_juz:8,is_active:true},
  {id:'s025',juz:29,nama_surah:'Al-Qiyamah',nomor_surah:75,urutan_dalam_juz:9,is_active:true},
  {id:'s026',juz:29,nama_surah:'Al-Insan',nomor_surah:76,urutan_dalam_juz:10,is_active:true},
  {id:'s027',juz:29,nama_surah:'Al-Mursalat',nomor_surah:77,urutan_dalam_juz:11,is_active:true},
  // JUZ 30
  {id:'s028',juz:30,nama_surah:'An-Naba',nomor_surah:78,urutan_dalam_juz:1,is_active:true},
  {id:'s029',juz:30,nama_surah:'An-Naziat',nomor_surah:79,urutan_dalam_juz:2,is_active:true},
  {id:'s030',juz:30,nama_surah:'Abasa',nomor_surah:80,urutan_dalam_juz:3,is_active:true},
  {id:'s031',juz:30,nama_surah:'At-Takwir',nomor_surah:81,urutan_dalam_juz:4,is_active:true},
  {id:'s032',juz:30,nama_surah:'Al-Infithar',nomor_surah:82,urutan_dalam_juz:5,is_active:true},
  {id:'s033',juz:30,nama_surah:'Al-Mutaffifin',nomor_surah:83,urutan_dalam_juz:6,is_active:true},
  {id:'s034',juz:30,nama_surah:'Al-Insyiqaq',nomor_surah:84,urutan_dalam_juz:7,is_active:true},
  {id:'s035',juz:30,nama_surah:'Al-Buruj',nomor_surah:85,urutan_dalam_juz:8,is_active:true},
  {id:'s036',juz:30,nama_surah:'Ath-Thariq',nomor_surah:86,urutan_dalam_juz:9,is_active:true},
  {id:'s037',juz:30,nama_surah:'Al-Ala',nomor_surah:87,urutan_dalam_juz:10,is_active:true},
  {id:'s038',juz:30,nama_surah:'Al-Ghasyiyah',nomor_surah:88,urutan_dalam_juz:11,is_active:true},
  {id:'s039',juz:30,nama_surah:'Al-Fajr',nomor_surah:89,urutan_dalam_juz:12,is_active:true},
  {id:'s040',juz:30,nama_surah:'Al-Balad',nomor_surah:90,urutan_dalam_juz:13,is_active:true},
  {id:'s041',juz:30,nama_surah:'Asy-Syams',nomor_surah:91,urutan_dalam_juz:14,is_active:true},
  {id:'s042',juz:30,nama_surah:'Al-Lail',nomor_surah:92,urutan_dalam_juz:15,is_active:true},
  {id:'s043',juz:30,nama_surah:'Ad-Dhuha',nomor_surah:93,urutan_dalam_juz:16,is_active:true},
  {id:'s044',juz:30,nama_surah:'Al-Insyirah',nomor_surah:94,urutan_dalam_juz:17,is_active:true},
  {id:'s045',juz:30,nama_surah:'At-Tin',nomor_surah:95,urutan_dalam_juz:18,is_active:true},
  {id:'s046',juz:30,nama_surah:'Al-Alaq',nomor_surah:96,urutan_dalam_juz:19,is_active:true},
  {id:'s047',juz:30,nama_surah:'Al-Qadr',nomor_surah:97,urutan_dalam_juz:20,is_active:true},
  {id:'s048',juz:30,nama_surah:'Al-Bayyinah',nomor_surah:98,urutan_dalam_juz:21,is_active:true},
  {id:'s049',juz:30,nama_surah:'Az-Zalzalah',nomor_surah:99,urutan_dalam_juz:22,is_active:true},
  {id:'s050',juz:30,nama_surah:'Al-Adiyat',nomor_surah:100,urutan_dalam_juz:23,is_active:true},
  {id:'s051',juz:30,nama_surah:'Al-Qariah',nomor_surah:101,urutan_dalam_juz:24,is_active:true},
  {id:'s052',juz:30,nama_surah:'At-Takathur',nomor_surah:102,urutan_dalam_juz:25,is_active:true},
  {id:'s053',juz:30,nama_surah:'Al-Asr',nomor_surah:103,urutan_dalam_juz:26,is_active:true},
  {id:'s054',juz:30,nama_surah:'Al-Humazah',nomor_surah:104,urutan_dalam_juz:27,is_active:true},
  {id:'s055',juz:30,nama_surah:'Al-Fil',nomor_surah:105,urutan_dalam_juz:28,is_active:true},
  {id:'s056',juz:30,nama_surah:'Quraisy',nomor_surah:106,urutan_dalam_juz:29,is_active:true},
  {id:'s057',juz:30,nama_surah:'Al-Maun',nomor_surah:107,urutan_dalam_juz:30,is_active:true},
  {id:'s058',juz:30,nama_surah:'Al-Kautsar',nomor_surah:108,urutan_dalam_juz:31,is_active:true},
  {id:'s059',juz:30,nama_surah:'Al-Kafirun',nomor_surah:109,urutan_dalam_juz:32,is_active:true},
  {id:'s060',juz:30,nama_surah:'An-Nashr',nomor_surah:110,urutan_dalam_juz:33,is_active:true},
  {id:'s061',juz:30,nama_surah:'Al-Masad',nomor_surah:111,urutan_dalam_juz:34,is_active:true},
  {id:'s062',juz:30,nama_surah:'Al-Ikhlas',nomor_surah:112,urutan_dalam_juz:35,is_active:true},
  {id:'s063',juz:30,nama_surah:'Al-Falaq',nomor_surah:113,urutan_dalam_juz:36,is_active:true},
  {id:'s064',juz:30,nama_surah:'An-Nas',nomor_surah:114,urutan_dalam_juz:37,is_active:true},
];

function initSeedData() {
  if (!localStorage.getItem(KEYS.surah_master)) {
    writeTable(KEYS.surah_master, SURAH_SEED);
  }
  if (!localStorage.getItem(KEYS.settings_lembaga)) {
    writeSingle(KEYS.settings_lembaga, {
      id: uuidv4(),
      nama_lembaga: 'Rumah Quran',
      alamat: '',
      kota: '',
      nomor_kontak: '',
      nama_kepala_lembaga: '',
      nip_kepala_lembaga: '',
      logo_url: '',
      bobot_akhlak: 30,
      bobot_kedisiplinan: 30,
      bobot_kognitif: 40,
      skala_penilaian: { A: 90, B: 80, C: 70, D: 0 },
      footer_raport: '',
      tempat_tanggal_raport: '',
      show_uas_lisan: true,
    });
  }
}
initSeedData();

// ---- RELATION RESOLVER ----
// @ts-ignore - TableName used for documentation
type _TableName = keyof typeof KEYS | 'view_leger_nilai';
const TABLE_MAP: Record<string, string> = {
  'halaqah': KEYS.halaqah,
  'surah_master': KEYS.surah_master,
  'academic_years': KEYS.academic_years,
};

function resolveRelation(row: any, relSpec: string, currentTable: string): any {
  // relSpec like: "alias:table(fields)" or "table(fields)"
  const match = relSpec.match(/^(?:(\w+):)?(\w+)\((.+)\)$/);
  if (!match) return row;
  let [, alias, refTable, _fields] = match;
  if (!alias) alias = refTable;

  const refKey = TABLE_MAP[refTable] || `rqm_${refTable}`;
  const refData = readTable<any>(refKey);

  // Find Many-to-One (FK on current row)
  const fkCandidates = [
    `${alias.replace('_data','')}_id`, 
    `${refTable.replace('_data','')}_id`,
    `${alias}_id`,
    `${refTable}_id`
  ];
  let fkVal: string | undefined;
  for (const fk of fkCandidates) {
    if (row[fk] !== undefined) { fkVal = row[fk]; break; }
  }

  if (fkVal) {
    const related = refData.find((r: any) => r.id === fkVal) || null;
    return { ...row, [alias]: related };
  }

  // Find One-to-Many (FK on target table)
  let singularCurrent = currentTable;
  if (singularCurrent.endsWith('s')) singularCurrent = singularCurrent.slice(0, -1);
  const reverseFkCandidates = [`${singularCurrent}_id`, `${currentTable}_id`];
  
  const rowId = row.id;
  if (rowId) {
    const relatedList = refData.filter((r: any) => {
      for (const rFk of reverseFkCandidates) {
        if (r[rFk] === rowId) return true;
      }
      return false;
    });
    return { ...row, [alias]: relatedList };
  }

  return { ...row, [alias]: [] };
}

function parseColumns(columnsStr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < columnsStr.length; i++) {
    const char = columnsStr[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function applySelect(rows: any[], columns: string, currentTable: string): any[] {
  if (!columns || columns.trim() === '*') return rows;
  const parts = parseColumns(columns);
  const relations = parts.filter(p => p.includes('(') && p.includes(')'));
  if (relations.length === 0) return rows;
  return rows.map(row => {
    let r = { ...row };
    for (const rel of relations) r = resolveRelation(r, rel, currentTable);
    return r;
  });
}

// ---- QUERY BUILDER ----
class QueryBuilder {
  private _table: string;
  private _isSingle = false;
  private _error: any = null;
  private _columns = '*';
  private _filters: Array<(r: any) => boolean> = [];
  private _orderCol: string | null = null;
  private _orderAsc = true;
  private _limitN: number | null = null;

  constructor(table: string) {
    this._table = table;
  }

  select(columns = '*') {
    this._columns = columns;
    return this;
  }

  eq(col: string, val: any) {
    this._filters.push(r => r[col] == val);
    return this;
  }

  neq(col: string, val: any) {
    this._filters.push(r => r[col] != val);
    return this;
  }

  in(col: string, vals: any[]) {
    this._filters.push(r => vals.includes(r[col]));
    return this;
  }

  is(col: string, val: null | boolean) {
    if (val === null) this._filters.push(r => r[col] === null || r[col] === undefined);
    else this._filters.push(r => r[col] === val);
    return this;
  }

  or(filterStr: string) {
    // Basic support for "halaqah_id.is.null,halaqah_id.eq.XXXXX"
    const parts = filterStr.split(',').map(s => s.trim());
    this._filters.push(row => parts.some(p => {
      const segs = p.split('.');
      if (segs.length < 3) return false;
      const [col, op, ...rest] = segs;
      const val = rest.join('.');
      if (op === 'is' && val === 'null') return row[col] === null || row[col] === undefined;
      if (op === 'eq') return String(row[col]) === val;
      return false;
    }));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col;
    this._orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this._limitN = n;
    return this;
  }

  single() {
    this._isSingle = true;
    return this;
  }

  private _exec(): any[] {
    let rows: any[];
    if (this._table === 'view_leger_nilai') {
      rows = computeLeger();
    } else if (this._table === 'settings_lembaga') {
      const s = readSingle<any>(KEYS.settings_lembaga);
      rows = s ? [s] : [];
    } else {
      const key = (KEYS as any)[this._table] || `rqm_${this._table}`;
      rows = readTable<any>(key);
    }
    for (const f of this._filters) rows = rows.filter(f);
    if (this._orderCol) {
      const col = this._orderCol;
      const asc = this._orderAsc;
      rows = [...rows].sort((a, b) => {
        const av = a[col], bv = b[col];
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
      });
    }
    if (this._limitN !== null) rows = rows.slice(0, this._limitN);
    rows = applySelect(rows, this._columns, this._table);
    return rows;
  }

  // Terminal: then-able
  then(resolve: (v: any) => void, reject?: (e: any) => void) {
    try {
      const rows = this._exec();
      if (this._isSingle) {
        const item = rows[0] || null;
        resolve({ data: item, error: this._error });
      } else {
        resolve({ data: rows, error: this._error });
      }
    } catch (e) {
      if (reject) reject(e);
      else resolve({ data: null, error: e });
    }
  }

  // insert - returns MutationBuilder to support .select().single() chaining
  insert(records: any[]): MutationBuilder {
    return new MutationBuilder(this._table, records);
  }

  // update
  update(data: Partial<any>): UpdateBuilder {
    return new UpdateBuilder(this._table, data, this._filters);
  }

  // delete
  delete(): DeleteBuilder {
    return new DeleteBuilder(this._table, this._filters);
  }

  // upsert
  async upsert(records: any[], opts?: { onConflict?: string }): Promise<{ data: any; error: any }> {
    try {
      const key = (KEYS as any)[this._table] || `rqm_${this._table}`;
      let existing = readTable<any>(key);
      const conflictKey = opts?.onConflict;
      for (const rec of records) {
        const newRec = { ...rec, id: rec.id || uuidv4() };
        if (conflictKey) {
          const conflictCols = conflictKey.split(',').map((s: string) => s.trim());
          const idx = existing.findIndex((e: any) => conflictCols.every((c: string) => e[c] === newRec[c]));
          if (idx >= 0) { existing[idx] = { ...existing[idx], ...newRec }; }
          else { existing.push(newRec); }
        } else {
          const idx = existing.findIndex((e: any) => e.id === newRec.id);
          if (idx >= 0) { existing[idx] = { ...existing[idx], ...newRec }; }
          else { existing.push(newRec); }
        }
      }
      writeTable(key, existing);
      return { data: records, error: null };
    } catch (e) { return { data: null, error: e }; }
  }
}

class UpdateBuilder {
  private _table: string;
  private _data: any;
  private _filters: Array<(r: any) => boolean>;
  private _isSingle = false;
  private _hasSelect = false;

  constructor(table: string, data: any, filters: Array<(r: any) => boolean>) {
    this._table = table; this._data = data; this._filters = [...filters];
  }

  eq(col: string, val: any) { this._filters.push(r => r[col] == val); return this; }
  select() { this._hasSelect = true; return this; }
  single() { this._isSingle = true; return this; }

  private _run(): { data: any; error: any } {
    try {
      if (this._table === 'settings_lembaga') {
        const s = readSingle<any>(KEYS.settings_lembaga) || {};
        const updated = { ...s, ...this._data };
        writeSingle(KEYS.settings_lembaga, updated);
        return { data: this._hasSelect ? updated : null, error: null };
      }
      const key = (KEYS as any)[this._table] || `rqm_${this._table}`;
      let rows = readTable<any>(key);
      let updatedRows: any[] = [];
      rows = rows.map(r => {
        if (this._filters.every(f => f(r))) {
          const u = { ...r, ...this._data };
          updatedRows.push(u);
          return u;
        }
        return r;
      });
      writeTable(key, rows);
      if (this._hasSelect) {
        const result = this._isSingle ? (updatedRows[0] || null) : updatedRows;
        return { data: result, error: null };
      }
      return { data: null, error: null };
    } catch (e) { return { data: null, error: e }; }
  }

  then(resolve: (v: any) => void) {
    resolve(this._run());
  }
}

class DeleteBuilder {
  private _table: string;
  private _filters: Array<(r: any) => boolean>;

  constructor(table: string, filters: Array<(r: any) => boolean>) {
    this._table = table; this._filters = [...filters];
  }

  eq(col: string, val: any) { this._filters.push(r => r[col] == val); return this; }

  then(resolve: (v: any) => void) {
    try {
      const key = (KEYS as any)[this._table] || `rqm_${this._table}`;
      let rows = readTable<any>(key);
      rows = rows.filter(r => !this._filters.every(f => f(r)));
      writeTable(key, rows);
      resolve({ data: null, error: null });
    } catch (e) { resolve({ data: null, error: e }); }
  }
}

class MutationBuilder {
  private _table: string;
  private _records: any[];

  constructor(table: string, records: any[]) {
    this._table = table; this._records = records;
  }

  select() { return this; }
  single() { return this; }

  then(resolve: (v: any) => void) {
    try {
      const key = (KEYS as any)[this._table] || `rqm_${this._table}`;
      const existing = readTable<any>(key);
      const newRows = this._records.map(r => ({ ...r, id: r.id || uuidv4(), created_at: new Date().toISOString() }));
      writeTable(key, [...existing, ...newRows]);
      resolve({ data: newRows.length === 1 ? newRows[0] : newRows, error: null });
    } catch (e) { resolve({ data: null, error: e }); }
  }
}

// ---- LEGER VIEW (replaces view_leger_nilai) ----
function computeLeger(): any[] {
  const reportCards = readTable<any>(KEYS.report_cards);
  const students = readTable<any>(KEYS.students);
  const halaqahs = readTable<any>(KEYS.halaqah);
  const semesters = readTable<any>(KEYS.semesters);

  return reportCards.map(rc => {
    const student = students.find((s: any) => s.id === rc.student_id);
    const halaqah = halaqahs.find((h: any) => h.id === student?.halaqah_id);
    const semester = semesters.find((s: any) => s.id === rc.semester_id);
    const totalAkhlak = (rc.nilai_akhir_akhlak || 0);
    const totalKedisiplinan = (rc.nilai_akhir_kedisiplinan || 0);
    const totalKognitif = (rc.nilai_akhir_kognitif || 0);
    // Use stored weights or default 30/30/40
    const settings = readSingle<any>(KEYS.settings_lembaga);
    const bobotAkhlak = (settings?.bobot_akhlak || 30) / 100;
    const bobotKedisiplinan = (settings?.bobot_kedisiplinan || 30) / 100;
    const bobotKognitif = (settings?.bobot_kognitif || 40) / 100;
    const total = (totalAkhlak * bobotAkhlak) + (totalKedisiplinan * bobotKedisiplinan) + (totalKognitif * bobotKognitif);

    return {
      student_id: rc.student_id,
      student_name: student?.nama || '',
      nis: student?.nis || '',
      halaqah_id: student?.halaqah_id || null,
      halaqah_name: halaqah?.nama || '',
      semester_id: rc.semester_id,
      tahun_ajaran: semester?.academic_year?.tahun_ajaran || '',
      nilai_akhir_akhlak: totalAkhlak,
      nilai_akhir_kedisiplinan: totalKedisiplinan,
      nilai_akhir_kognitif: totalKognitif,
      nilai_akhir_total: total,
    };
  });
}

// ---- STORAGE STUB (for signature upload - converts to base64) ----
export const localStorageClient = {
  storage: {
    from: (_bucket: string) => ({
      upload: async (path: string, file: File) => {
        return new Promise<{ error: any }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            localStorage.setItem(`rqm_file_${path}`, reader.result as string);
            resolve({ error: null });
          };
          reader.onerror = () => resolve({ error: new Error('File read failed') });
          reader.readAsDataURL(file);
        });
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: localStorage.getItem(`rqm_file_${path}`) || '' }
      }),
    }),
  },
};

// ---- MAIN EXPORT ----
export const localDb = {
  from: (table: string) => new QueryBuilder(table),
  storage: localStorageClient.storage,
  // stub for rpc (assign_juz_to_student, unassign_juz_from_student)
  rpc: async (fn: string, params: any): Promise<{ error: any }> => {
    try {
      const { p_student_id, p_juz } = params;
      const allSurah = readTable<any>(KEYS.surah_master).filter((s: any) => s.juz === p_juz && s.is_active);
      const assignments = readTable<any>(KEYS.student_surah_assignment);

      if (fn === 'assign_juz_to_student') {
        const updated = [...assignments];
        for (const surah of allSurah) {
          const idx = updated.findIndex((a: any) => a.student_id === p_student_id && a.surah_id === surah.id);
          if (idx >= 0) { updated[idx] = { ...updated[idx], is_active: true }; }
          else { updated.push({ id: uuidv4(), student_id: p_student_id, surah_id: surah.id, is_active: true }); }
        }
        writeTable(KEYS.student_surah_assignment, updated);
      } else if (fn === 'unassign_juz_from_student') {
        const updated = assignments.map((a: any) => {
          if (a.student_id === p_student_id && allSurah.find((s: any) => s.id === a.surah_id)) {
            return { ...a, is_active: false };
          }
          return a;
        });
        writeTable(KEYS.student_surah_assignment, updated);
      }
      return { error: null };
    } catch (e) { return { error: e }; }
  },
  auth: { getSession: async () => ({ data: { session: null }, error: null }) },
};

export { uuidv4 };
