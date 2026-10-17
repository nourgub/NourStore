import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type {
  CurriculumDocument,
  ExtractionStatus,
  GenerationRequest,
  GradingSession,
  LessonPrepFieldValue,
  LessonPrepRequest,
  LessonPrepSection,
  LessonPrepStatus,
  LessonPrepTableRow,
  LessonPrepTemplate,
  LessonPrepTemplateSchema,
  PaperStatus,
  PasswordResetRequest,
  PasswordResetStatus,
  PaymentRequest,
  PaymentRequestStatus,
  PlanId,
  QuestionGradeResult,
  Session,
  StudentPaper,
  SubjectId,
  SubscriptionStatus,
  Teacher,
  UsageFeature,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "nourstore.sqlite3");
export const GENERATED_DIR = path.join(DATA_DIR, "generated");
export const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");
export const PAPERS_DIR = path.join(DATA_DIR, "papers");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(GENERATED_DIR, { recursive: true });
fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
fs.mkdirSync(PAPERS_DIR, { recursive: true });

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
    subscription_expires_at TEXT,
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
    requested_plan_id TEXT NOT NULL DEFAULT 'full',
    receipt_path TEXT NOT NULL,
    receipt_mime_type TEXT NOT NULL,
    receipt_date TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    reviewed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
  CREATE INDEX IF NOT EXISTS idx_payment_requests_teacher ON payment_requests(teacher_id);

  CREATE TABLE IF NOT EXISTS usage_counters (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    feature TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(teacher_id, period, feature)
  );
  CREATE INDEX IF NOT EXISTS idx_usage_counters_teacher_period ON usage_counters(teacher_id, period);

  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_status ON password_reset_requests(status);

  CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grading_sessions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    exam_request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_grading_sessions_teacher ON grading_sessions(teacher_id);

  CREATE TABLE IF NOT EXISTS student_papers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES grading_sessions(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    image_paths_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    failure_reason TEXT,
    question_results_json TEXT NOT NULL DEFAULT '[]',
    draft_total REAL,
    approved_total REAL,
    created_at TEXT NOT NULL,
    graded_at TEXT,
    approved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_student_papers_session ON student_papers(session_id);

  CREATE TABLE IF NOT EXISTS lesson_preps (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    lesson_title TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    source_file_names_json TEXT NOT NULL DEFAULT '[]',
    steps_json TEXT NOT NULL DEFAULT '[]',
    template_id TEXT,
    sections_json TEXT NOT NULL DEFAULT '[]',
    header_values_json TEXT NOT NULL DEFAULT '[]',
    note_values_json TEXT NOT NULL DEFAULT '[]',
    table_columns_json TEXT NOT NULL DEFAULT '[]',
    table_rows_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    failure_reason TEXT,
    file_docx TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lesson_preps_teacher_subject ON lesson_preps(teacher_id, subject_id);

  CREATE TABLE IF NOT EXISTS lesson_prep_templates (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    schema_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lesson_prep_templates_teacher_subject ON lesson_prep_templates(teacher_id, subject_id);
`),
);

// Forward-compatible column add for DBs created before subscription_status
// existed — CREATE TABLE IF NOT EXISTS above won't alter an existing table.
const teacherColumns = db.prepare(`PRAGMA table_info(teachers)`).all() as { name: string }[];
if (!teacherColumns.some((c) => c.name === "subscription_status")) {
  withBusyRetry(() => db.exec(`ALTER TABLE teachers ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'pending'`));
}
if (!teacherColumns.some((c) => c.name === "plan_id")) {
  withBusyRetry(() => db.exec(`ALTER TABLE teachers ADD COLUMN plan_id TEXT`));
}
if (!teacherColumns.some((c) => c.name === "subscription_expires_at")) {
  withBusyRetry(() => db.exec(`ALTER TABLE teachers ADD COLUMN subscription_expires_at TEXT`));
}

const paymentRequestColumns = db.prepare(`PRAGMA table_info(payment_requests)`).all() as { name: string }[];
if (!paymentRequestColumns.some((c) => c.name === "requested_plan_id")) {
  withBusyRetry(() =>
    db.exec(`ALTER TABLE payment_requests ADD COLUMN requested_plan_id TEXT NOT NULL DEFAULT 'full'`),
  );
}
if (!paymentRequestColumns.some((c) => c.name === "receipt_date")) {
  withBusyRetry(() => db.exec(`ALTER TABLE payment_requests ADD COLUMN receipt_date TEXT NOT NULL DEFAULT ''`));
}

// ---------- Teachers ----------

interface TeacherRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  subscription_status: SubscriptionStatus;
  plan_id: PlanId | null;
  subscription_expires_at: string | null;
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
    planId: row.plan_id,
    subscriptionExpiresAt: row.subscription_expires_at,
    createdAt: row.created_at,
  };
}

export function insertTeacher(teacher: Teacher): void {
  db.prepare(
    `INSERT INTO teachers (id, full_name, email, password_hash, password_salt, subscription_status, plan_id, subscription_expires_at, created_at)
     VALUES (@id, @fullName, @email, @passwordHash, @passwordSalt, @subscriptionStatus, @planId, @subscriptionExpiresAt, @createdAt)`,
  ).run({ ...teacher, planId: teacher.planId ?? null, subscriptionExpiresAt: teacher.subscriptionExpiresAt ?? null });
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

// Activates (or renews) a subscription through the given expiry date.
export function activateTeacherSubscription(teacherId: string, expiresAt: string): void {
  db.prepare(`UPDATE teachers SET subscription_status = 'active', subscription_expires_at = ? WHERE id = ?`).run(
    expiresAt,
    teacherId,
  );
}

export function updateTeacherPlan(teacherId: string, planId: PlanId): void {
  db.prepare(`UPDATE teachers SET plan_id = ? WHERE id = ?`).run(planId, teacherId);
}

export function updateTeacherPassword(teacherId: string, passwordHash: string, passwordSalt: string): void {
  db.prepare(`UPDATE teachers SET password_hash = ?, password_salt = ? WHERE id = ?`).run(
    passwordHash,
    passwordSalt,
    teacherId,
  );
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
  requested_plan_id: PlanId;
  receipt_path: string;
  receipt_mime_type: string;
  receipt_date: string;
  status: PaymentRequestStatus;
  created_at: string;
  reviewed_at: string | null;
}

function rowToPaymentRequest(row: PaymentRequestRow): PaymentRequest {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    requestedPlanId: row.requested_plan_id,
    receiptPath: row.receipt_path,
    receiptMimeType: row.receipt_mime_type,
    receiptDate: row.receipt_date,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export function insertPaymentRequest(request: PaymentRequest): void {
  db.prepare(
    `INSERT INTO payment_requests (id, teacher_id, requested_plan_id, receipt_path, receipt_mime_type, receipt_date, status, created_at, reviewed_at)
     VALUES (@id, @teacherId, @requestedPlanId, @receiptPath, @receiptMimeType, @receiptDate, @status, @createdAt, @reviewedAt)`,
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

// ---------- Grading sessions & student papers ----------

interface GradingSessionRow {
  id: string;
  teacher_id: string;
  exam_request_id: string;
  title: string;
  created_at: string;
}

function rowToGradingSession(row: GradingSessionRow): GradingSession {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    examRequestId: row.exam_request_id,
    title: row.title,
    createdAt: row.created_at,
  };
}

export function insertGradingSession(session: GradingSession): void {
  db.prepare(
    `INSERT INTO grading_sessions (id, teacher_id, exam_request_id, title, created_at)
     VALUES (@id, @teacherId, @examRequestId, @title, @createdAt)`,
  ).run(session);
}

export function listGradingSessions(teacherId: string): GradingSession[] {
  const rows = db
    .prepare(`SELECT * FROM grading_sessions WHERE teacher_id = ? ORDER BY created_at DESC`)
    .all(teacherId) as GradingSessionRow[];
  return rows.map(rowToGradingSession);
}

export function findGradingSession(id: string, teacherId: string): GradingSession | null {
  const row = db.prepare(`SELECT * FROM grading_sessions WHERE id = ? AND teacher_id = ?`).get(id, teacherId) as
    | GradingSessionRow
    | undefined;
  return row ? rowToGradingSession(row) : null;
}

interface StudentPaperRow {
  id: string;
  session_id: string;
  teacher_id: string;
  student_name: string;
  image_paths_json: string;
  status: PaperStatus;
  failure_reason: string | null;
  question_results_json: string;
  draft_total: number | null;
  approved_total: number | null;
  created_at: string;
  graded_at: string | null;
  approved_at: string | null;
}

function rowToStudentPaper(row: StudentPaperRow): StudentPaper {
  return {
    id: row.id,
    sessionId: row.session_id,
    teacherId: row.teacher_id,
    studentName: row.student_name,
    imagePaths: JSON.parse(row.image_paths_json),
    status: row.status,
    failureReason: row.failure_reason,
    questionResults: JSON.parse(row.question_results_json) as QuestionGradeResult[],
    draftTotal: row.draft_total,
    approvedTotal: row.approved_total,
    createdAt: row.created_at,
    gradedAt: row.graded_at,
    approvedAt: row.approved_at,
  };
}

export function insertStudentPaper(paper: StudentPaper): void {
  db.prepare(
    `INSERT INTO student_papers (id, session_id, teacher_id, student_name, image_paths_json, status, failure_reason, question_results_json, draft_total, approved_total, created_at, graded_at, approved_at)
     VALUES (@id, @sessionId, @teacherId, @studentName, @imagePathsJson, @status, @failureReason, @questionResultsJson, @draftTotal, @approvedTotal, @createdAt, @gradedAt, @approvedAt)`,
  ).run({
    ...paper,
    imagePathsJson: JSON.stringify(paper.imagePaths),
    questionResultsJson: JSON.stringify(paper.questionResults),
  });
}

export function listStudentPapers(sessionId: string, teacherId: string): StudentPaper[] {
  const rows = db
    .prepare(`SELECT * FROM student_papers WHERE session_id = ? AND teacher_id = ? ORDER BY created_at ASC`)
    .all(sessionId, teacherId) as StudentPaperRow[];
  return rows.map(rowToStudentPaper);
}

export function findStudentPaper(id: string, teacherId: string): StudentPaper | null {
  const row = db.prepare(`SELECT * FROM student_papers WHERE id = ? AND teacher_id = ?`).get(id, teacherId) as
    | StudentPaperRow
    | undefined;
  return row ? rowToStudentPaper(row) : null;
}

export function updateStudentPaperGraded(
  id: string,
  result: { status: PaperStatus; questionResults: QuestionGradeResult[]; draftTotal: number | null; failureReason: string | null },
): void {
  db.prepare(
    `UPDATE student_papers
     SET status = ?, question_results_json = ?, draft_total = ?, failure_reason = ?, graded_at = ?
     WHERE id = ?`,
  ).run(
    result.status,
    JSON.stringify(result.questionResults),
    result.draftTotal,
    result.failureReason,
    new Date().toISOString(),
    id,
  );
}

export function approveStudentPaper(id: string, approvedTotal: number, questionResults: QuestionGradeResult[]): void {
  db.prepare(
    `UPDATE student_papers SET status = 'approved', approved_total = ?, question_results_json = ?, approved_at = ? WHERE id = ?`,
  ).run(approvedTotal, JSON.stringify(questionResults), new Date().toISOString(), id);
}

// ---------- Lesson prep ----------

interface LessonPrepRow {
  id: string;
  teacher_id: string;
  subject_id: string;
  mode: LessonPrepRequest["mode"];
  lesson_title: string;
  grade_level: string;
  source_file_names_json: string;
  steps_json: string;
  template_id: string | null;
  sections_json: string;
  header_values_json: string;
  note_values_json: string;
  table_columns_json: string;
  table_rows_json: string;
  status: LessonPrepStatus;
  failure_reason: string | null;
  file_docx: string | null;
  created_at: string;
}

function rowToLessonPrep(row: LessonPrepRow): LessonPrepRequest {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    subjectId: row.subject_id as SubjectId,
    mode: row.mode,
    lessonTitle: row.lesson_title,
    gradeLevel: row.grade_level,
    sourceFileNames: JSON.parse(row.source_file_names_json),
    steps: JSON.parse(row.steps_json),
    templateId: row.template_id,
    sections: JSON.parse(row.sections_json) as LessonPrepSection[],
    headerValues: JSON.parse(row.header_values_json) as LessonPrepFieldValue[],
    noteValues: JSON.parse(row.note_values_json) as LessonPrepFieldValue[],
    tableColumns: JSON.parse(row.table_columns_json),
    tableRows: JSON.parse(row.table_rows_json) as LessonPrepTableRow[],
    status: row.status,
    failureReason: row.failure_reason,
    fileDocx: row.file_docx,
    createdAt: row.created_at,
  };
}

export function insertLessonPrep(request: LessonPrepRequest): void {
  db.prepare(
    `INSERT INTO lesson_preps (id, teacher_id, subject_id, mode, lesson_title, grade_level, source_file_names_json, steps_json, template_id, sections_json, header_values_json, note_values_json, table_columns_json, table_rows_json, status, failure_reason, file_docx, created_at)
     VALUES (@id, @teacherId, @subjectId, @mode, @lessonTitle, @gradeLevel, @sourceFileNamesJson, @stepsJson, @templateId, @sectionsJson, @headerValuesJson, @noteValuesJson, @tableColumnsJson, @tableRowsJson, @status, @failureReason, @fileDocx, @createdAt)`,
  ).run({
    ...request,
    sourceFileNamesJson: JSON.stringify(request.sourceFileNames),
    stepsJson: JSON.stringify(request.steps),
    templateId: request.templateId ?? null,
    sectionsJson: JSON.stringify(request.sections),
    headerValuesJson: JSON.stringify(request.headerValues),
    noteValuesJson: JSON.stringify(request.noteValues),
    tableColumnsJson: JSON.stringify(request.tableColumns),
    tableRowsJson: JSON.stringify(request.tableRows),
  });
}

export function listLessonPreps(teacherId: string, subjectId: SubjectId): LessonPrepRequest[] {
  const rows = db
    .prepare(`SELECT * FROM lesson_preps WHERE teacher_id = ? AND subject_id = ? ORDER BY created_at DESC`)
    .all(teacherId, subjectId) as LessonPrepRow[];
  return rows.map(rowToLessonPrep);
}

export function findLessonPrep(id: string, teacherId: string): LessonPrepRequest | null {
  const row = db.prepare(`SELECT * FROM lesson_preps WHERE id = ? AND teacher_id = ?`).get(id, teacherId) as
    | LessonPrepRow
    | undefined;
  return row ? rowToLessonPrep(row) : null;
}

// ---------- Lesson prep templates (teacher's own uploaded blank form) ----------

interface LessonPrepTemplateRow {
  id: string;
  teacher_id: string;
  subject_id: string;
  file_name: string;
  schema_json: string;
  created_at: string;
}

function rowToLessonPrepTemplate(row: LessonPrepTemplateRow): LessonPrepTemplate {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    subjectId: row.subject_id as SubjectId,
    fileName: row.file_name,
    schema: JSON.parse(row.schema_json) as LessonPrepTemplateSchema,
    createdAt: row.created_at,
  };
}

export function insertLessonPrepTemplate(template: LessonPrepTemplate): void {
  db.prepare(
    `INSERT INTO lesson_prep_templates (id, teacher_id, subject_id, file_name, schema_json, created_at)
     VALUES (@id, @teacherId, @subjectId, @fileName, @schemaJson, @createdAt)`,
  ).run({ ...template, schemaJson: JSON.stringify(template.schema) });
}

export function findLatestLessonPrepTemplate(teacherId: string, subjectId: SubjectId): LessonPrepTemplate | null {
  const row = db
    .prepare(
      `SELECT * FROM lesson_prep_templates WHERE teacher_id = ? AND subject_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(teacherId, subjectId) as LessonPrepTemplateRow | undefined;
  return row ? rowToLessonPrepTemplate(row) : null;
}

export function findLessonPrepTemplate(id: string, teacherId: string): LessonPrepTemplate | null {
  const row = db.prepare(`SELECT * FROM lesson_prep_templates WHERE id = ? AND teacher_id = ?`).get(id, teacherId) as
    | LessonPrepTemplateRow
    | undefined;
  return row ? rowToLessonPrepTemplate(row) : null;
}

export function deleteLessonPrepTemplate(id: string, teacherId: string): void {
  db.prepare(`DELETE FROM lesson_prep_templates WHERE id = ? AND teacher_id = ?`).run(id, teacherId);
}

// ---------- Usage counters (monthly plan caps) ----------

export function getUsageCount(teacherId: string, period: string, feature: UsageFeature): number {
  const row = db
    .prepare(`SELECT count FROM usage_counters WHERE teacher_id = ? AND period = ? AND feature = ?`)
    .get(teacherId, period, feature) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function incrementUsageCount(teacherId: string, period: string, feature: UsageFeature): void {
  db.prepare(
    `INSERT INTO usage_counters (id, teacher_id, period, feature, count)
     VALUES (@id, @teacherId, @period, @feature, 1)
     ON CONFLICT(teacher_id, period, feature) DO UPDATE SET count = count + 1`,
  ).run({
    id: `uc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId,
    period,
    feature,
  });
}

// ---------- Password reset requests (admin-assisted — no email infra exists) ----------

interface PasswordResetRequestRow {
  id: string;
  teacher_id: string;
  status: PasswordResetStatus;
  created_at: string;
  resolved_at: string | null;
}

function rowToPasswordResetRequest(row: PasswordResetRequestRow): PasswordResetRequest {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export function insertPasswordResetRequest(request: PasswordResetRequest): void {
  db.prepare(
    `INSERT INTO password_reset_requests (id, teacher_id, status, created_at, resolved_at)
     VALUES (@id, @teacherId, @status, @createdAt, @resolvedAt)`,
  ).run(request);
}

export function listPendingPasswordResetRequests(): (PasswordResetRequest & {
  teacherName: string;
  teacherEmail: string;
})[] {
  const rows = db
    .prepare(
      `SELECT prr.*, t.full_name AS teacher_full_name, t.email AS teacher_email
       FROM password_reset_requests prr JOIN teachers t ON t.id = prr.teacher_id
       WHERE prr.status = 'pending'
       ORDER BY prr.created_at ASC`,
    )
    .all() as (PasswordResetRequestRow & { teacher_full_name: string; teacher_email: string })[];
  return rows.map((row) => ({
    ...rowToPasswordResetRequest(row),
    teacherName: row.teacher_full_name,
    teacherEmail: row.teacher_email,
  }));
}

export function findPasswordResetRequest(id: string): PasswordResetRequest | null {
  const row = db.prepare(`SELECT * FROM password_reset_requests WHERE id = ?`).get(id) as
    | PasswordResetRequestRow
    | undefined;
  return row ? rowToPasswordResetRequest(row) : null;
}

export function resolvePasswordResetRequestStatus(id: string): void {
  db.prepare(`UPDATE password_reset_requests SET status = 'resolved', resolved_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    id,
  );
}

// ---------- Rate limiting (DB-backed, no Redis available) ----------

export function checkAndIncrementRateLimit(key: string, maxAttempts: number, windowSeconds: number): boolean {
  const now = Date.now();
  const row = db.prepare(`SELECT count, window_start FROM rate_limit_attempts WHERE key = ?`).get(key) as
    | { count: number; window_start: string }
    | undefined;

  if (!row) {
    db.prepare(`INSERT INTO rate_limit_attempts (key, count, window_start) VALUES (?, 1, ?)`).run(
      key,
      new Date(now).toISOString(),
    );
    return true;
  }

  const windowStartMs = new Date(row.window_start).getTime();
  if (now - windowStartMs > windowSeconds * 1000) {
    db.prepare(`UPDATE rate_limit_attempts SET count = 1, window_start = ? WHERE key = ?`).run(
      new Date(now).toISOString(),
      key,
    );
    return true;
  }

  if (row.count >= maxAttempts) return false;
  db.prepare(`UPDATE rate_limit_attempts SET count = count + 1 WHERE key = ?`).run(key);
  return true;
}
