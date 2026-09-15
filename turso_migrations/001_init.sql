-- ============================================================
-- Migration 001: Initial Schema for Turso (SQLite/libSQL)
-- ============================================================
-- Sistem Informasi Raport RQM
-- Source: PostgreSQL (Supabase) → SQLite (Turso/libSQL)
-- Tanggal: 2026-09-10
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS (menggantikan auth.users + public.users)
-- ============================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                       -- NULL untuk user yang di-invite (belum set password)
  role TEXT NOT NULL CHECK(role IN ('admin','guru','viewer','pembimbing')),
  full_name TEXT,
  signature_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- SESSIONS (custom auth)
-- ============================================================
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                       -- 32 bytes hex random
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- SETTINGS LEMBAGA
-- ============================================================
CREATE TABLE settings_lembaga (
  id TEXT PRIMARY KEY,
  nama_lembaga TEXT NOT NULL,
  alamat TEXT,
  kota TEXT,
  nomor_kontak TEXT,
  nama_kepala_lembaga TEXT,
  nip_kepala_lembaga TEXT,
  logo_url TEXT,
  signature_url TEXT,
  bobot_akhlak REAL NOT NULL DEFAULT 30,
  bobot_kedisiplinan REAL NOT NULL DEFAULT 30,
  bobot_kognitif REAL NOT NULL DEFAULT 40,
  skala_penilaian TEXT NOT NULL DEFAULT '{"A":85,"B":70,"C":60,"D":0}',
  footer_raport TEXT,
  tempat_tanggal_raport TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ============================================================
-- ACADEMIC YEARS
-- ============================================================
CREATE TABLE academic_years (
  id TEXT PRIMARY KEY,
  tahun_ajaran TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_academic_years_active ON academic_years(is_active);

-- ============================================================
-- SEMESTERS
-- ============================================================
CREATE TABLE semesters (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL,
  nama TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  jumlah_hari_efektif INTEGER DEFAULT 120,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE INDEX idx_semesters_active ON semesters(is_active);
CREATE INDEX idx_semesters_ay ON semesters(academic_year_id);

-- ============================================================
-- HALAQAH
-- ============================================================
CREATE TABLE halaqah (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  guru_id TEXT,
  shift TEXT CHECK(shift IN ('Siang','Sore','Malam')) DEFAULT 'Sore',
  tahsin_items TEXT DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_halaqah_active ON halaqah(is_active);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  nis TEXT UNIQUE,
  halaqah_id TEXT,
  jenis_kelamin TEXT,
  tanggal_lahir TEXT,
  nama_orang_tua TEXT,
  shift TEXT CHECK(shift IN ('Siang','Sore','Malam')) DEFAULT 'Sore',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE SET NULL
);

CREATE INDEX idx_students_halaqah ON students(halaqah_id);
CREATE INDEX idx_students_active ON students(is_active);

-- ============================================================
-- TEACHER ASSIGNMENTS
-- ============================================================
CREATE TABLE teacher_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  halaqah_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('guru','pembimbing','keduanya')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, halaqah_id, subject)
);

CREATE INDEX idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_halaqah ON teacher_assignments(halaqah_id);

-- ============================================================
-- TAHSIN MASTER
-- ============================================================
CREATE TABLE tahsin_master (
  id TEXT PRIMARY KEY,
  nama_item TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0,
  halaqah_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (halaqah_id) REFERENCES halaqah(id) ON DELETE CASCADE
);

CREATE INDEX idx_tahsin_master_halaqah ON tahsin_master(halaqah_id);
CREATE INDEX idx_tahsin_master_active ON tahsin_master(is_active);

-- ============================================================
-- SURAH MASTER
-- ============================================================
CREATE TABLE surah_master (
  id TEXT PRIMARY KEY,
  nama_surah TEXT NOT NULL,
  juz INTEGER NOT NULL,
  urutan_dalam_juz INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_surah_master_juz ON surah_master(juz);

-- ============================================================
-- STUDENT SURAH ASSIGNMENT
-- ============================================================
CREATE TABLE student_surah_assignment (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  surah_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (surah_id) REFERENCES surah_master(id) ON DELETE CASCADE,
  UNIQUE(student_id, surah_id)
);

CREATE INDEX idx_surah_assignment_student ON student_surah_assignment(student_id);
CREATE INDEX idx_surah_assignment_active ON student_surah_assignment(is_active);

-- ============================================================
-- TAHFIDZ PROGRESS
-- ============================================================
CREATE TABLE tahfidz_progress (
  id TEXT PRIMARY KEY,
  report_card_id TEXT,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  surah_id TEXT NOT NULL,
  kb REAL NOT NULL DEFAULT 0 CHECK(kb >= 0 AND kb <= 100),
  kh REAL NOT NULL DEFAULT 0 CHECK(kh >= 0 AND kh <= 100),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  FOREIGN KEY (surah_id) REFERENCES surah_master(id) ON DELETE CASCADE
);

CREATE INDEX idx_tahfidz_report ON tahfidz_progress(report_card_id);
CREATE INDEX idx_tahfidz_student_semester ON tahfidz_progress(student_id, semester_id);

-- ============================================================
-- REPORT CARDS
-- ============================================================
CREATE TABLE report_cards (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  semester_id TEXT NOT NULL,
  akhlak TEXT DEFAULT '{}',
  kedisiplinan TEXT DEFAULT '{}',
  kognitif TEXT DEFAULT '{}',
  uas_tulis REAL DEFAULT 0,
  uas_lisan REAL DEFAULT 0,
  nilai_akhir_akhlak REAL DEFAULT 0,
  nilai_akhir_kedisiplinan REAL DEFAULT 0,
  nilai_akhir_kognitif REAL DEFAULT 0,
  sakit INTEGER DEFAULT 0,
  izin INTEGER DEFAULT 0,
  alpa INTEGER DEFAULT 0,
  catatan TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(student_id, semester_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_cards_student ON report_cards(student_id);
CREATE INDEX idx_report_cards_semester ON report_cards(semester_id);

-- ============================================================
-- UPLOADED FILES (metadata untuk storage custom)
-- ============================================================
CREATE TABLE uploaded_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  bucket TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_bucket ON uploaded_files(bucket);

-- ============================================================
-- ACTIVITY LOG (audit trail)
-- ============================================================
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,                      -- 'create', 'update', 'delete', 'login', 'logout'
  resource TEXT NOT NULL,                    -- 'student', 'report_card', etc.
  resource_id TEXT,
  details TEXT,                              -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_resource ON activity_log(resource, resource_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
