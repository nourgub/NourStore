import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CurriculumDocument, ExtractionStatus, GenerationRequest, Session, SubjectId, Teacher } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "nourstore.sqlite3");
export const GENERATED_DIR = path.join(DATA_DIR, "generated");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
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
`);

// ---------- Teachers ----------

export function insertTeacher(teacher: Teacher): void {
  db.prepare(
    `INSERT INTO teachers (id, full_name, email, password_hash, password_salt, created_at)
     VALUES (@id, @fullName, @email, @passwordHash, @passwordSalt, @createdAt)`,
  ).run(teacher);
}

export function findTeacherByEmail(email: string): Teacher | null {
  const row = db.prepare(`SELECT * FROM teachers WHERE email = ?`).get(email) as
    | { id: string; full_name: string; email: string; password_hash: string; password_salt: string; created_at: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
  };
}

export function findTeacherById(id: string): Teacher | null {
  const row = db.prepare(`SELECT * FROM teachers WHERE id = ?`).get(id) as
    | { id: string; full_name: string; email: string; password_hash: string; password_salt: string; created_at: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
  };
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
