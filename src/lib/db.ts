import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type {
  CurriculumDocument,
  ExtractionStatus,
  GenerationRequest,
  PaymentRequest,
  PaymentRequestStatus,
  Session,
  SubjectId,
  SubscriptionStatus,
  Teacher,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "nourstore.sqlite3");
export const GENERATED_DIR = path.join(DATA_DIR, "generated");
export const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });
fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Next.js runs multiple worker processes, each opening its own connection to
// this same (possibly brand-new) file. busy_timeout covers ordinary
// read/write contention, but the one-time switch to WAL mode needs an
// exclusive lock that can fail immediately with SQLITE_BUSY even with
// busy_timeout set — so retry that step by hand instead of racing on it.
function withBusyRetry<T>(fn: () => T, attempts = 5): T {
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      const isBusy = err instanceof Error && "code" in err && err.code === "SQLITE_BUSY";
      if (!isBusy || i === attempts - 1) throw err;
      sleepSync(100 * (i + 1));
    }
  }
  throw new Error("unreachable");
}

const db = new Database(DB_FILE);
db.pragma("busy_timeout = 5000");
withBusyRetry(() => db.pragma("journal_mode = WAL"));
db.pragma("foreign_keys = ON");

withBusyRetry(() =>
  db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions(teacher_id);

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    topics_json TEXT NOT NULL,
    style_notes TEXT NOT NULL,
    extraction_status TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_documents_teacher_subject ON documents(teacher_id, subject_id);

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    document_id TEXT,
    exam_title TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    topics_json TEXT NOT NULL,
    num_questions INTEGER NOT NULL,
    difficulty_mix TEXT NOT NULL,
    status TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    files_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_requests_teacher_subject ON requests(teacher_id, subject_id);

  CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    receipt_path TEXT NOT NULL,
    receipt_mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    reviewed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
  CREATE INDEX IF NOT EXISTS idx_payment_requests_teacher ON payment_requests(teacher_id);
`),
);

// Forward-compatible column add for DBs created before subscription_status
// existed — CREATE TABLE IF NOT EXISTS above won't alter an existing table.
const teacherColumns = db.prepare(`PRAGMA table_info(teachers)`).all() as { name: string }[];
if (!teacherColumns.some((c) => c.name === "subscription_status")) {
  withBusyRetry(() => db.exec(`ALTER TABLE teachers ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'pending'`));
}

// ---------- Teachers ----------

interface TeacherRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

function rowToTeacher(row: TeacherRow): Teacher {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    subscriptionStatus: row.subscription_status,
    createdAt: row.created_at,
  };
}

export function insertTeacher(teacher: Teacher): void {
  db.prepare(
    `INSERT INTO teachers (id, full_name, email, password_hash, password_salt, subscription_status, created_at)
     VALUES (@id, @fullName, @email, @passwordHash, @passwordSalt, @subscriptionStatus, @createdAt)`,
  ).run(teacher);
}

export function findTeacherByEmail(email: string): Teacher | null {
  const row = db.prepare(`SELECT * FROM teachers WHERE email = ?`).get(email) as TeacherRow | undefined;
  return row ? rowToTeacher(row) : null;
}

export function findTeacherById(id: string): Teacher | null {
  const row = db.prepare(`SELECT * FROM teachers WHERE id = ?`).get(id) as TeacherRow | undefined;
  return row ? rowToTeacher(row) : null;
}

export function updateTeacherSubscriptionStatus(teacherId: string, status: SubscriptionStatus): void {
  db.prepare(`UPDATE teachers SET subscription_status = ? WHERE id = ?`).run(status, teacherId);
}

// ---------- Sessions ----------

export function insertSession(session: Session): void {
  db.prepare(
    `INSERT INTO sessions (token, teacher_id, created_at, expires_at) VALUES (@token, @teacherId, @createdAt, @expiresAt)`,
  ).run(session);
}

export function findSession(token: string): Session | null {
  const row = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token) as
    | { token: string; teacher_id: string; created_at: string; expires_at: string }
    | undefined;
  if (!row) return null;
  return { token: row.token, teacherId: row.teacher_id, createdAt: row.created_at, expiresAt: row.expires_at };
}

export function deleteSession(token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

// ---------- Curriculum documents ----------

interface DocumentRow {
  id: string;
  teacher_id: string;
  subject_id: string;
  file_name: string;
  grade_level: string;
  topics_json: string;
  style_notes: string;
  extraction_status: ExtractionStatus;
  extracted_text: string;
  created_at: string;
}

function rowToDocument(row: DocumentRow): CurriculumDocument {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    subjectId: row.subject_id as SubjectId,
    fileName: row.file_name,
    gradeLevel: row.grade_level,
    topics: JSON.parse(row.topics_json),
    styleNotes: row.style_notes,
    extractionStatus: row.extraction_status,
    extractedText: row.extracted_text,
    createdAt: row.created_at,
  };
}

export function insertDocument(doc: CurriculumDocument): void {
  db.prepare(
    `INSERT INTO documents (id, teacher_id, subject_id, file_name, grade_level, topics_json, style_notes, extraction_status, extracted_text, created_at)
     VALUES (@id, @teacherId, @subjectId, @fileName, @gradeLevel, @topicsJson, @styleNotes, @extractionStatus, @extractedText, @createdAt)`,
  ).run({ ...doc, topicsJson: JSON.stringify(doc.topics) });
}

export function listDocuments(teacherId: string, subjectId: SubjectId): CurriculumDocument[] {
  const rows = db
    .prepare(`SELECT * FROM documents WHERE teacher_id = ? AND subject_id = ? ORDER BY created_at DESC`)
    .all(teacherId, subjectId) as DocumentRow[];
  return rows.map(rowToDocument);
}

export function findDocument(id: string, teacherId: string): CurriculumDocument | null {
  const row = db.prepare(`SELECT * FROM documents WHERE id = ? AND teacher_id = ?`).get(id, teacherId) as
    | DocumentRow
    | undefined;
  return row ? rowToDocument(row) : null;
}

// ---------- Generation requests ----------

interface RequestRow {
  id: string;
  teacher_id: string;
  subject_id: string;
  document_id: string | null;
  exam_title: string;
  grade_level: string;
  topics_json: string;
  num_questions: number;
  difficulty_mix: GenerationRequest["difficultyMix"];
  status: GenerationRequest["status"];
  steps_json: string;
  questions_json: string;
  files_json: string;
  created_at: string;
  finished_at: string | null;
}

function rowToRequest(row: RequestRow): GenerationRequest {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    subjectId: row.subject_id as SubjectId,
    documentId: row.document_id,
    examTitle: row.exam_title,
    gradeLevel: row.grade_level,
    topics: JSON.parse(row.topics_json),
    numQuestions: row.num_questions,
    difficultyMix: row.difficulty_mix,
    status: row.status,
    steps: JSON.parse(row.steps_json),
    questions: JSON.parse(row.questions_json),
    files: JSON.parse(row.files_json),
    createdAt: row.created_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

export function insertRequest(request: GenerationRequest): void {
  db.prepare(
    `INSERT INTO requests (id, teacher_id, subject_id, document_id, exam_title, grade_level, topics_json, num_questions, difficulty_mix, status, steps_json, questions_json, files_json, created_at, finished_at)
     VALUES (@id, @teacherId, @subjectId, @documentId, @examTitle, @gradeLevel, @topicsJson, @numQuestions, @difficultyMix, @status, @stepsJson, @questionsJson, @filesJson, @createdAt, @finishedAt)`,
  ).run({
    ...request,
    documentId: request.documentId ?? null,
    topicsJson: JSON.stringify(request.topics),
    stepsJson: JSON.stringify(request.steps),
    questionsJson: JSON.stringify(request.questions),
    filesJson: JSON.stringify(request.files),
    finishedAt: request.finishedAt ?? null,
  });
}

export function listRequests(teacherId: string, subjectId: SubjectId): GenerationRequest[] {
  const rows = db
    .prepare(`SELECT * FROM requests WHERE teacher_id = ? AND subject_id = ? ORDER BY created_at DESC`)
    .all(teacherId, subjectId) as RequestRow[];
  return rows.map(rowToRequest);
}

export function findRequest(id: string, teacherId: string): GenerationRequest | null {
  const row = db.prepare(`SELECT * FROM requests WHERE id = ? AND teacher_id = ?`).get(id, teacherId) as
    | RequestRow
    | undefined;
  return row ? rowToRequest(row) : null;
}

// ---------- Payment requests (manual BaridiMob/CCP receipt review) ----------

interface PaymentRequestRow {
  id: string;
  teacher_id: string;
  receipt_path: string;
  receipt_mime_type: string;
  status: PaymentRequestStatus;
  created_at: string;
  reviewed_at: string | null;
}

function rowToPaymentRequest(row: PaymentRequestRow): PaymentRequest {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    receiptPath: row.receipt_path,
    receiptMimeType: row.receipt_mime_type,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function insertPaymentRequest(request: PaymentRequest): void {
  db.prepare(
    `INSERT INTO payment_requests (id, teacher_id, receipt_path, receipt_mime_type, status, created_at, reviewed_at)
     VALUES (@id, @teacherId, @receiptPath, @receiptMimeType, @status, @createdAt, @reviewedAt)`,
  ).run(request);
}

export function listPendingPaymentRequests(): (PaymentRequest & { teacherName: string; teacherEmail: string })[] {
  const rows = db
    .prepare(
      `SELECT pr.*, t.full_name AS teacher_full_name, t.email AS teacher_email
       FROM payment_requests pr JOIN teachers t ON t.id = pr.teacher_id
       WHERE pr.status = 'pending'
       ORDER BY pr.created_at ASC`,
    )
    .all() as (PaymentRequestRow & { teacher_full_name: string; teacher_email: string })[];
  return rows.map((row) => ({
    ...rowToPaymentRequest(row),
    teacherName: row.teacher_full_name,
    teacherEmail: row.teacher_email,
  }));
}

export function findPaymentRequest(id: string): PaymentRequest | null {
  const row = db.prepare(`SELECT * FROM payment_requests WHERE id = ?`).get(id) as PaymentRequestRow | undefined;
  return row ? rowToPaymentRequest(row) : null;
}

export function findLatestPaymentRequestForTeacher(teacherId: string): PaymentRequest | null {
  const row = db
    .prepare(`SELECT * FROM payment_requests WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(teacherId) as PaymentRequestRow | undefined;
  return row ? rowToPaymentRequest(row) : null;
}

export function updatePaymentRequestStatus(id: string, status: PaymentRequestStatus): void {
  db.prepare(`UPDATE payment_requests SET status = ?, reviewed_at = ? WHERE id = ?`).run(
    status,
    new Date().toISOString(),
    id,
  );
}
