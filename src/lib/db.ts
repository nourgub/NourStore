import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type {
  CurriculumDocument,
  ExtractionStatus,
  GenerationRequest,
  GradingSession,
  KbChunk,
  KbContentStatus,
  KbExam,
  KbExercise,
  KbLesson,
  KbSource,
  KbSourceDocument,
  KbVerification,
  KbVerificationTargetType,
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

// Overridable so tests (and operators who want the DB/uploads on a separate
// disk/volume) don't have to share the default in-repo `data/` directory.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
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
    free_trial_used_at TEXT,
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
    failure_reason TEXT,
    steps_json TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    rubric_version INTEGER NOT NULL DEFAULT 1,
    review_json TEXT NOT NULL DEFAULT '{"status":"not_reviewed","reviewedAt":null,"model":null,"failureReason":null,"independentSolutions":[],"issues":[]}',
    files_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT,
    approved_rubric_version INTEGER,
    approved_at TEXT
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

  -- One row per attempted usage-consuming operation (an exam generation
  -- request, a lesson prep, a submitted student paper), keyed by that
  -- operation's own id. Lets reserveUsage/releaseUsage be both atomic
  -- (reserve-then-act, never check-then-act across an await boundary) and
  -- idempotent (releasing the same operation id twice, or an id that was
  -- never reserved, is always a safe no-op) — see src/lib/usage.ts.
  CREATE TABLE IF NOT EXISTS usage_reservations (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    feature TEXT NOT NULL,
    is_free_trial INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved',
    created_at TEXT NOT NULL,
    released_at TEXT
  );

  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_status ON password_reset_requests(status);

  -- Self-service reset tokens (only ever created/consumed when SMTP_* is
  -- configured — see src/lib/email.ts). Kept separate from
  -- password_reset_requests (the admin-assisted fallback) so neither path
  -- interferes with the other.
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_teacher ON password_reset_tokens(teacher_id);

  CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grading_sessions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    exam_request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    exam_version INTEGER NOT NULL DEFAULT 1,
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
    exam_version INTEGER NOT NULL DEFAULT 1,
    claude_model TEXT,
    gemini_review_status TEXT NOT NULL DEFAULT 'not_configured',
    gemini_model TEXT,
    gemini_failure_reason TEXT,
    question_results_json TEXT NOT NULL DEFAULT '[]',
    needs_review INTEGER NOT NULL DEFAULT 0,
    draft_total REAL,
    approved_total REAL,
    override_history_json TEXT NOT NULL DEFAULT '[]',
    claude_raw_grade_json TEXT,
    gemini_raw_grade_json TEXT,
    teacher_corrected_transcriptions_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    graded_at TEXT,
    approved_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_student_papers_session ON student_papers(session_id);

  -- One row per actual AI provider call (never per feature-level operation —
  -- a single paper grading produces one Claude row and, separately, one
  -- Gemini row). estimated_cost_usd is exactly that: an estimate from a
  -- pricing table that must be kept in sync with the provider's own pricing
  -- page, never treated as an authoritative bill.
  CREATE TABLE IF NOT EXISTS ai_usage_log (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    estimated_cost_usd REAL NOT NULL,
    duration_ms INTEGER NOT NULL,
    page_count INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ai_usage_log_teacher ON ai_usage_log(teacher_id, created_at);

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    locked_at TEXT,
    lease_expires_at TEXT,
    result_json TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

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

  -- Knowledge base: a platform-wide, admin-curated library (not teacher
  -- data) — see the "Knowledge Base" block in types.ts for the full
  -- lifecycle this schema enforces (collected -> ... -> published).
  CREATE TABLE IF NOT EXISTS kb_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL,
    license_status TEXT NOT NULL DEFAULT 'unknown',
    reliability_note TEXT NOT NULL DEFAULT '',
    discovered_at TEXT NOT NULL,
    last_checked_at TEXT
  );

  CREATE TABLE IF NOT EXISTS kb_source_documents (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES kb_sources(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    education_level_id TEXT NOT NULL,
    document_kind TEXT NOT NULL,
    content_year TEXT,
    raw_text TEXT,
    excerpt TEXT,
    checksum TEXT,
    status TEXT NOT NULL DEFAULT 'collected',
    notes TEXT NOT NULL DEFAULT '',
    collected_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kb_source_documents_source ON kb_source_documents(source_id);
  CREATE INDEX IF NOT EXISTS idx_kb_source_documents_level ON kb_source_documents(subject_id, education_level_id);
  CREATE INDEX IF NOT EXISTS idx_kb_source_documents_status ON kb_source_documents(status);
  -- Partial unique index: only enforced once a checksum is actually known
  -- (NULL checksums — not-yet-extracted rows — never collide with NULL).
  CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_source_documents_checksum ON kb_source_documents(checksum) WHERE checksum IS NOT NULL;

  CREATE TABLE IF NOT EXISTS kb_lessons (
    id TEXT PRIMARY KEY,
    source_document_id TEXT REFERENCES kb_source_documents(id) ON DELETE SET NULL,
    subject_id TEXT NOT NULL,
    education_level_id TEXT NOT NULL,
    curriculum_topic TEXT NOT NULL,
    title TEXT NOT NULL,
    sections_json TEXT NOT NULL DEFAULT '[]',
    skills_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'collected',
    verified_at TEXT,
    verified_by TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kb_lessons_level_topic ON kb_lessons(subject_id, education_level_id, curriculum_topic);
  CREATE INDEX IF NOT EXISTS idx_kb_lessons_status ON kb_lessons(status);

  CREATE TABLE IF NOT EXISTS kb_exercises (
    id TEXT PRIMARY KEY,
    source_document_id TEXT REFERENCES kb_source_documents(id) ON DELETE SET NULL,
    subject_id TEXT NOT NULL,
    education_level_id TEXT NOT NULL,
    curriculum_topic TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    solution_text TEXT,
    rubric_json TEXT NOT NULL DEFAULT '[]',
    points REAL NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'متوسط',
    status TEXT NOT NULL DEFAULT 'collected',
    verified_at TEXT,
    verified_by TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kb_exercises_level_topic ON kb_exercises(subject_id, education_level_id, curriculum_topic);
  CREATE INDEX IF NOT EXISTS idx_kb_exercises_status ON kb_exercises(status);

  CREATE TABLE IF NOT EXISTS kb_exams (
    id TEXT PRIMARY KEY,
    source_document_id TEXT REFERENCES kb_source_documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    education_level_id TEXT NOT NULL,
    content_year TEXT,
    questions_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'collected',
    verified_at TEXT,
    verified_by TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kb_exams_level ON kb_exams(subject_id, education_level_id);
  CREATE INDEX IF NOT EXISTS idx_kb_exams_status ON kb_exams(status);

  CREATE TABLE IF NOT EXISTS kb_verifications (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    method TEXT NOT NULL,
    result TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    checked_at TEXT NOT NULL,
    checked_by TEXT REFERENCES teachers(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kb_verifications_target ON kb_verifications(target_type, target_id);

  CREATE TABLE IF NOT EXISTS kb_chunks (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    education_level_id TEXT NOT NULL,
    curriculum_topic TEXT NOT NULL,
    chunk_type TEXT NOT NULL,
    text TEXT NOT NULL,
    source_lesson_id TEXT REFERENCES kb_lessons(id) ON DELETE CASCADE,
    source_exercise_id TEXT REFERENCES kb_exercises(id) ON DELETE CASCADE,
    source_exam_id TEXT REFERENCES kb_exams(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kb_chunks_level_topic ON kb_chunks(subject_id, education_level_id, curriculum_topic);
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
if (!teacherColumns.some((c) => c.name === "free_trial_used_at")) {
  withBusyRetry(() => db.exec(`ALTER TABLE teachers ADD COLUMN free_trial_used_at TEXT`));
}
if (!teacherColumns.some((c) => c.name === "is_admin")) {
  withBusyRetry(() => db.exec(`ALTER TABLE teachers ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`));
  // One-time grandfather: before this migration, admin access was granted
  // dynamically to *whoever currently owns an account whose email matches
  // ADMIN_EMAIL* — a real signup-time takeover risk (anyone who learns the
  // admin's email could have registered it first and been treated as admin
  // forever, with no way for the real owner to reclaim it). From here on,
  // is_admin is a one-time flag set at signup only when ADMIN_BOOTSTRAP_TOKEN
  // is also proven (see /api/auth/signup), never derived from email alone.
  // This UPDATE preserves access for whichever account already legitimately
  // holds that email in an existing deployment, so this fix never locks out
  // a real admin who signed up before it shipped.
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    withBusyRetry(() => db.prepare(`UPDATE teachers SET is_admin = 1 WHERE LOWER(email) = ?`).run(adminEmail));
  }
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

const requestColumns = db.prepare(`PRAGMA table_info(requests)`).all() as { name: string }[];
if (!requestColumns.some((c) => c.name === "failure_reason")) {
  withBusyRetry(() => db.exec(`ALTER TABLE requests ADD COLUMN failure_reason TEXT`));
}
if (!requestColumns.some((c) => c.name === "rubric_version")) {
  withBusyRetry(() => db.exec(`ALTER TABLE requests ADD COLUMN rubric_version INTEGER NOT NULL DEFAULT 1`));
}
if (!requestColumns.some((c) => c.name === "review_json")) {
  withBusyRetry(() =>
    db.exec(
      `ALTER TABLE requests ADD COLUMN review_json TEXT NOT NULL DEFAULT '{"status":"not_reviewed","reviewedAt":null,"model":null,"failureReason":null,"independentSolutions":[],"issues":[]}'`,
    ),
  );
}
// Draft-until-approved: an exam generated before this migration ships stays
// a draft (approved_rubric_version IS NULL) until the teacher explicitly
// approves it — this is a deliberate behavior change (see
// approveGenerationRequest below), not a bug: new grading sessions can no
// longer start against an exam the teacher never actually reviewed.
if (!requestColumns.some((c) => c.name === "approved_rubric_version")) {
  withBusyRetry(() => db.exec(`ALTER TABLE requests ADD COLUMN approved_rubric_version INTEGER`));
}
if (!requestColumns.some((c) => c.name === "approved_at")) {
  withBusyRetry(() => db.exec(`ALTER TABLE requests ADD COLUMN approved_at TEXT`));
}

const gradingSessionColumns = db.prepare(`PRAGMA table_info(grading_sessions)`).all() as { name: string }[];
if (!gradingSessionColumns.some((c) => c.name === "exam_version")) {
  withBusyRetry(() => db.exec(`ALTER TABLE grading_sessions ADD COLUMN exam_version INTEGER NOT NULL DEFAULT 1`));
}

const studentPaperColumns = db.prepare(`PRAGMA table_info(student_papers)`).all() as { name: string }[];
if (!studentPaperColumns.some((c) => c.name === "exam_version")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN exam_version INTEGER NOT NULL DEFAULT 1`));
}
if (!studentPaperColumns.some((c) => c.name === "claude_model")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN claude_model TEXT`));
}
if (!studentPaperColumns.some((c) => c.name === "gemini_review_status")) {
  withBusyRetry(() =>
    db.exec(`ALTER TABLE student_papers ADD COLUMN gemini_review_status TEXT NOT NULL DEFAULT 'not_configured'`),
  );
}
if (!studentPaperColumns.some((c) => c.name === "gemini_model")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN gemini_model TEXT`));
}
if (!studentPaperColumns.some((c) => c.name === "gemini_failure_reason")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN gemini_failure_reason TEXT`));
}
if (!studentPaperColumns.some((c) => c.name === "needs_review")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0`));
}
if (!studentPaperColumns.some((c) => c.name === "override_history_json")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN override_history_json TEXT NOT NULL DEFAULT '[]'`));
}
if (!studentPaperColumns.some((c) => c.name === "claude_raw_grade_json")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN claude_raw_grade_json TEXT`));
}
if (!studentPaperColumns.some((c) => c.name === "gemini_raw_grade_json")) {
  withBusyRetry(() => db.exec(`ALTER TABLE student_papers ADD COLUMN gemini_raw_grade_json TEXT`));
}
if (!studentPaperColumns.some((c) => c.name === "teacher_corrected_transcriptions_json")) {
  withBusyRetry(() =>
    db.exec(`ALTER TABLE student_papers ADD COLUMN teacher_corrected_transcriptions_json TEXT NOT NULL DEFAULT '[]'`),
  );
}
// Must run after the needs_review column migration above (not in the initial
// CREATE TABLE block) — on a database that already had student_papers before
// this column existed, creating this index any earlier would fail outright.
withBusyRetry(() =>
  db.exec(`CREATE INDEX IF NOT EXISTS idx_student_papers_needs_review ON student_papers(teacher_id, needs_review)`),
);

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
  free_trial_used_at: string | null;
  is_admin: number;
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
    freeTrialUsedAt: row.free_trial_used_at,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
}

export function insertTeacher(teacher: Teacher): void {
  db.prepare(
    `INSERT INTO teachers (id, full_name, email, password_hash, password_salt, subscription_status, plan_id, subscription_expires_at, free_trial_used_at, is_admin, created_at)
     VALUES (@id, @fullName, @email, @passwordHash, @passwordSalt, @subscriptionStatus, @planId, @subscriptionExpiresAt, @freeTrialUsedAt, @isAdmin, @createdAt)`,
  ).run({
    ...teacher,
    planId: teacher.planId ?? null,
    subscriptionExpiresAt: teacher.subscriptionExpiresAt ?? null,
    freeTrialUsedAt: teacher.freeTrialUsedAt ?? null,
    isAdmin: teacher.isAdmin ? 1 : 0,
  });
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
  failure_reason: string | null;
  steps_json: string;
  questions_json: string;
  rubric_version: number;
  review_json: string;
  files_json: string;
  created_at: string;
  finished_at: string | null;
  approved_rubric_version: number | null;
  approved_at: string | null;
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
    failureReason: row.failure_reason,
    steps: JSON.parse(row.steps_json),
    questions: JSON.parse(row.questions_json),
    rubricVersion: row.rubric_version,
    review: JSON.parse(row.review_json),
    files: JSON.parse(row.files_json),
    createdAt: row.created_at,
    finishedAt: row.finished_at ?? undefined,
    approvedRubricVersion: row.approved_rubric_version,
    approvedAt: row.approved_at,
  };
}

export function insertRequest(request: GenerationRequest): void {
  db.prepare(
    `INSERT INTO requests (id, teacher_id, subject_id, document_id, exam_title, grade_level, topics_json, num_questions, difficulty_mix, status, failure_reason, steps_json, questions_json, rubric_version, review_json, files_json, created_at, finished_at, approved_rubric_version, approved_at)
     VALUES (@id, @teacherId, @subjectId, @documentId, @examTitle, @gradeLevel, @topicsJson, @numQuestions, @difficultyMix, @status, @failureReason, @stepsJson, @questionsJson, @rubricVersion, @reviewJson, @filesJson, @createdAt, @finishedAt, @approvedRubricVersion, @approvedAt)`,
  ).run({
    ...request,
    documentId: request.documentId ?? null,
    failureReason: request.failureReason ?? null,
    topicsJson: JSON.stringify(request.topics),
    stepsJson: JSON.stringify(request.steps),
    questionsJson: JSON.stringify(request.questions),
    reviewJson: JSON.stringify(request.review),
    filesJson: JSON.stringify(request.files),
    finishedAt: request.finishedAt ?? null,
    approvedRubricVersion: request.approvedRubricVersion ?? null,
    approvedAt: request.approvedAt ?? null,
  });
}

export function updateRequestReview(id: string, review: GenerationRequest["review"]): void {
  db.prepare(`UPDATE requests SET review_json = ? WHERE id = ?`).run(JSON.stringify(review), id);
}

// Approves the exam at exactly `expectedRubricVersion` — guards against a
// stale approval (the teacher had an old version of the page open, the exam
// was edited in another tab since) silently approving the wrong version.
// Returns false (no-op) if the exam's rubric has moved on since the teacher
// last loaded it; the caller should tell them to refresh and re-check.
export function approveGenerationRequest(id: string, teacherId: string, expectedRubricVersion: number): boolean {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE requests SET approved_rubric_version = ?, approved_at = ?
       WHERE id = ? AND teacher_id = ? AND rubric_version = ? AND status = 'done'`,
    )
    .run(expectedRubricVersion, now, id, teacherId, expectedRubricVersion);
  return result.changes > 0;
}

// Persists a teacher's edit to an exam's questions/rubric (see
// src/lib/generation.ts's updateExamQuestions) and bumps rubricVersion in
// the same write — grading_sessions/student_papers pin the rubricVersion
// they were created/graded against, so this can never silently change an
// already-graded paper's recorded result (approvePaperGrade's version check
// blocks approval if a paper's grading ever becomes stale relative to it).
export function updateRequestQuestions(id: string, questions: GenerationRequest["questions"], rubricVersion: number): void {
  db.prepare(`UPDATE requests SET questions_json = ?, rubric_version = ? WHERE id = ?`).run(
    JSON.stringify(questions),
    rubricVersion,
    id,
  );
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

// Internal use only (background review jobs don't carry a teacherId check —
// the job payload itself was created from an authenticated request).
export function findRequestById(id: string): GenerationRequest | null {
  const row = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id) as RequestRow | undefined;
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
  exam_version: number;
  title: string;
  created_at: string;
}

function rowToGradingSession(row: GradingSessionRow): GradingSession {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    examRequestId: row.exam_request_id,
    examVersion: row.exam_version,
    title: row.title,
    createdAt: row.created_at,
  };
}

export function insertGradingSession(session: GradingSession): void {
  db.prepare(
    `INSERT INTO grading_sessions (id, teacher_id, exam_request_id, exam_version, title, created_at)
     VALUES (@id, @teacherId, @examRequestId, @examVersion, @title, @createdAt)`,
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
  exam_version: number;
  claude_model: string | null;
  gemini_review_status: StudentPaper["geminiReviewStatus"];
  gemini_model: string | null;
  gemini_failure_reason: string | null;
  question_results_json: string;
  needs_review: number;
  draft_total: number | null;
  approved_total: number | null;
  override_history_json: string;
  teacher_corrected_transcriptions_json: string;
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
    examVersion: row.exam_version,
    claudeModel: row.claude_model,
    geminiReviewStatus: row.gemini_review_status,
    geminiModel: row.gemini_model,
    geminiFailureReason: row.gemini_failure_reason,
    questionResults: JSON.parse(row.question_results_json) as QuestionGradeResult[],
    needsReview: Boolean(row.needs_review),
    draftTotal: row.draft_total,
    approvedTotal: row.approved_total,
    overrideHistory: JSON.parse(row.override_history_json),
    teacherCorrectedTranscriptions: JSON.parse(row.teacher_corrected_transcriptions_json),
    createdAt: row.created_at,
    gradedAt: row.graded_at,
    approvedAt: row.approved_at,
  };
}

export function insertStudentPaper(paper: StudentPaper): void {
  db.prepare(
    `INSERT INTO student_papers (id, session_id, teacher_id, student_name, image_paths_json, status, failure_reason, exam_version, claude_model, gemini_review_status, gemini_model, gemini_failure_reason, question_results_json, needs_review, draft_total, approved_total, override_history_json, teacher_corrected_transcriptions_json, created_at, graded_at, approved_at)
     VALUES (@id, @sessionId, @teacherId, @studentName, @imagePathsJson, @status, @failureReason, @examVersion, @claudeModel, @geminiReviewStatus, @geminiModel, @geminiFailureReason, @questionResultsJson, @needsReview, @draftTotal, @approvedTotal, @overrideHistoryJson, @teacherCorrectedTranscriptionsJson, @createdAt, @gradedAt, @approvedAt)`,
  ).run({
    ...paper,
    imagePathsJson: JSON.stringify(paper.imagePaths),
    questionResultsJson: JSON.stringify(paper.questionResults),
    needsReview: paper.needsReview ? 1 : 0,
    overrideHistoryJson: JSON.stringify(paper.overrideHistory),
    teacherCorrectedTranscriptionsJson: JSON.stringify(paper.teacherCorrectedTranscriptions),
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

// Internal use only (background jobs carry no teacherId check of their own —
// the job payload itself was created from an authenticated request).
export function findStudentPaperById(id: string): StudentPaper | null {
  const row = db.prepare(`SELECT * FROM student_papers WHERE id = ?`).get(id) as StudentPaperRow | undefined;
  return row ? rowToStudentPaper(row) : null;
}

type StudentPaperFieldUpdate = Partial<{
  status: PaperStatus;
  failureReason: string | null;
  claudeModel: string | null;
  geminiReviewStatus: StudentPaper["geminiReviewStatus"];
  geminiModel: string | null;
  geminiFailureReason: string | null;
  questionResults: QuestionGradeResult[];
  needsReview: boolean;
  draftTotal: number | null;
  gradedAt: string | null;
  imagePaths: string[];
  teacherCorrectedTranscriptions: StudentPaper["teacherCorrectedTranscriptions"];
}>;

const FIELD_TO_COLUMN: Record<keyof StudentPaperFieldUpdate, string> = {
  status: "status",
  failureReason: "failure_reason",
  claudeModel: "claude_model",
  geminiReviewStatus: "gemini_review_status",
  geminiModel: "gemini_model",
  geminiFailureReason: "gemini_failure_reason",
  questionResults: "question_results_json",
  needsReview: "needs_review",
  draftTotal: "draft_total",
  gradedAt: "graded_at",
  imagePaths: "image_paths_json",
  teacherCorrectedTranscriptions: "teacher_corrected_transcriptions_json",
};

// A paper is written to by two independent background jobs (Claude grading,
// Gemini review) that may finish in either order. Both read-modify-write the
// full row synchronously (better-sqlite3 has no async gap between read and
// write), so this partial update never clobbers a field the caller didn't
// touch.
export function updateStudentPaperFields(id: string, fields: StudentPaperFieldUpdate): void {
  const keys = Object.keys(fields) as (keyof StudentPaperFieldUpdate)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${FIELD_TO_COLUMN[k]} = ?`).join(", ");
  const values = keys.map((k) => {
    const v = fields[k];
    if (k === "questionResults" || k === "imagePaths" || k === "teacherCorrectedTranscriptions") return JSON.stringify(v);
    if (k === "needsReview") return v ? 1 : 0;
    return v as string | number | null;
  });
  db.prepare(`UPDATE student_papers SET ${setClause} WHERE id = ?`).run(...values, id);
}

// Internal merge state (not part of the teacher-facing StudentPaper type):
// each independent grader's raw, unmerged output, kept so the two background
// jobs can re-run the pure-code manager correctly however they interleave,
// without reconstructing lossy approximations from the already-merged view.
export function getStudentPaperRawGrade(id: string, source: "claude" | "gemini"): unknown | null {
  const column = source === "claude" ? "claude_raw_grade_json" : "gemini_raw_grade_json";
  const row = db.prepare(`SELECT ${column} AS raw FROM student_papers WHERE id = ?`).get(id) as
    | { raw: string | null }
    | undefined;
  return row?.raw ? JSON.parse(row.raw) : null;
}

export function updateStudentPaperRawGrade(id: string, source: "claude" | "gemini", grade: unknown): void {
  const column = source === "claude" ? "claude_raw_grade_json" : "gemini_raw_grade_json";
  db.prepare(`UPDATE student_papers SET ${column} = ? WHERE id = ?`).run(JSON.stringify(grade), id);
}

export function approveStudentPaper(
  id: string,
  approvedTotal: number,
  questionResults: QuestionGradeResult[],
  overrideHistory: StudentPaper["overrideHistory"],
): void {
  db.prepare(
    `UPDATE student_papers SET status = 'approved', approved_total = ?, question_results_json = ?, override_history_json = ?, approved_at = ? WHERE id = ?`,
  ).run(approvedTotal, JSON.stringify(questionResults), JSON.stringify(overrideHistory), new Date().toISOString(), id);
}

// Papers approved long enough ago that their source images (sensitive,
// never deleted otherwise) are due for cleanup. The grades/feedback/
// transcription stay forever — only the raw photos are removed.
export function listApprovedPapersForImageCleanup(cutoffIso: string): StudentPaper[] {
  const rows = db
    .prepare(
      `SELECT * FROM student_papers WHERE status = 'approved' AND approved_at < ? AND image_paths_json != '[]'`,
    )
    .all(cutoffIso) as StudentPaperRow[];
  return rows.map(rowToStudentPaper);
}

export function clearStudentPaperImagePaths(id: string): void {
  db.prepare(`UPDATE student_papers SET image_paths_json = '[]' WHERE id = ?`).run(id);
}

export function countPapersNeedingReviewForTeacher(teacherId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM student_papers WHERE teacher_id = ? AND needs_review = 1`)
    .get(teacherId) as { n: number };
  return row.n;
}

// ---------- Background jobs ----------
//
// A minimal DB-backed queue for the two independent, parallelizable grading
// calls (Claude grade, Gemini review). No Redis/external broker — state lives
// entirely in this table, so a server restart loses nothing: any job still
// "running" past its lease simply becomes claimable again.

export type JobType = "grade_paper_claude" | "review_paper_gemini" | "review_exam_gemini";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: string;
  type: JobType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lockedAt: string | null;
  leaseExpiresAt: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobRow {
  id: string;
  type: JobType;
  idempotency_key: string;
  payload_json: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  lease_expires_at: string | null;
  result_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    idempotencyKey: row.idempotency_key,
    payload: JSON.parse(row.payload_json),
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lockedAt: row.locked_at,
    leaseExpiresAt: row.lease_expires_at,
    result: row.result_json ? JSON.parse(row.result_json) : null,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Inserting with an idempotency key that already exists is a silent no-op
// (INSERT OR IGNORE) — the caller can always re-enqueue defensively without
// ever creating a duplicate job for the same paper/question.
export function enqueueJob(job: {
  id: string;
  type: JobType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
}): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO jobs (id, type, idempotency_key, payload_json, status, attempts, max_attempts, created_at, updated_at)
     VALUES (@id, @type, @idempotencyKey, @payloadJson, 'queued', 0, @maxAttempts, @now, @now)`,
  ).run({
    id: job.id,
    type: job.type,
    idempotencyKey: job.idempotencyKey,
    payloadJson: JSON.stringify(job.payload),
    maxAttempts: job.maxAttempts ?? 3,
    now,
  });
}

// Atomically claims up to `limit` jobs that are queued, or were left
// "running" past their lease (a crashed/restarted worker) — this is what
// makes the queue resumable after a server restart with no extra bookkeeping.
export function claimJobs(limit: number, leaseMs: number): Job[] {
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();

  const candidates = db
    .prepare(
      `SELECT * FROM jobs
       WHERE (status = 'queued' OR (status = 'running' AND lease_expires_at < ?))
         AND attempts < max_attempts
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(nowIso, limit) as JobRow[];

  const claimed: Job[] = [];
  for (const row of candidates) {
    const result = db
      .prepare(
        `UPDATE jobs SET status = 'running', attempts = attempts + 1, locked_at = ?, lease_expires_at = ?, updated_at = ?
         WHERE id = ? AND status = ?`,
      )
      .run(nowIso, leaseExpiresAt, nowIso, row.id, row.status);
    if (result.changes > 0) {
      claimed.push(rowToJob({ ...row, status: "running", attempts: row.attempts + 1 }));
    }
  }
  return claimed;
}

export function completeJob(id: string, result: Record<string, unknown>): void {
  db.prepare(`UPDATE jobs SET status = 'done', result_json = ?, error = NULL, updated_at = ? WHERE id = ?`).run(
    JSON.stringify(result),
    new Date().toISOString(),
    id,
  );
}

// A job whose attempts are exhausted is marked permanently 'failed'; one that
// still has attempts left goes back to 'queued' for the next poll — this is
// the queue's limited-retry behavior, never retried unboundedly.
export function failOrRequeueJob(id: string, error: string): void {
  const row = db.prepare(`SELECT attempts, max_attempts FROM jobs WHERE id = ?`).get(id) as
    | { attempts: number; max_attempts: number }
    | undefined;
  if (!row) return;
  const status: JobStatus = row.attempts >= row.max_attempts ? "failed" : "queued";
  db.prepare(`UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?`).run(
    status,
    error,
    new Date().toISOString(),
    id,
  );
}

export function findJobByIdempotencyKey(key: string): Job | null {
  const row = db.prepare(`SELECT * FROM jobs WHERE idempotency_key = ?`).get(key) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

// ---------- AI usage/cost log ----------

export interface AiUsageLogEntry {
  id: string;
  teacherId: string;
  feature: string;
  operationId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  pageCount: number | null;
  createdAt: string;
}

export function insertAiUsageLog(entry: AiUsageLogEntry): void {
  db.prepare(
    `INSERT INTO ai_usage_log (id, teacher_id, feature, operation_id, provider, model, input_tokens, output_tokens, estimated_cost_usd, duration_ms, page_count, created_at)
     VALUES (@id, @teacherId, @feature, @operationId, @provider, @model, @inputTokens, @outputTokens, @estimatedCostUsd, @durationMs, @pageCount, @createdAt)`,
  ).run({ ...entry, pageCount: entry.pageCount ?? null });
}

export interface AiUsageCostSummary {
  totalCostUsd: number;
  totalCalls: number;
  totalDurationMs: number;
  byFeature: { feature: string; costUsd: number; calls: number }[];
}

function summarizeAiUsageRows(
  rows: { feature: string; estimated_cost_usd: number; duration_ms: number }[],
): AiUsageCostSummary {
  const byFeatureMap = new Map<string, { costUsd: number; calls: number }>();
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  for (const row of rows) {
    totalCostUsd += row.estimated_cost_usd;
    totalDurationMs += row.duration_ms;
    const existing = byFeatureMap.get(row.feature) ?? { costUsd: 0, calls: 0 };
    existing.costUsd += row.estimated_cost_usd;
    existing.calls += 1;
    byFeatureMap.set(row.feature, existing);
  }

  return {
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalCalls: rows.length,
    totalDurationMs,
    byFeature: Array.from(byFeatureMap.entries()).map(([feature, v]) => ({
      feature,
      costUsd: Math.round(v.costUsd * 10000) / 10000,
      calls: v.calls,
    })),
  };
}

// Scoped to a billing/quota period (same `period` string convention as
// usage_counters: "YYYY-MM-DD" subscription-cycle start, or "YYYY-MM" for a
// never-expiring account) via a createdAt range the caller computes — kept
// here as a plain date range rather than importing usage.ts's period logic,
// to avoid a dependency cycle between db.ts and the feature layer above it.
export function getAiUsageCostSummary(teacherId: string, sinceIso: string): AiUsageCostSummary {
  const rows = db
    .prepare(`SELECT feature, estimated_cost_usd, duration_ms FROM ai_usage_log WHERE teacher_id = ? AND created_at >= ?`)
    .all(teacherId, sinceIso) as { feature: string; estimated_cost_usd: number; duration_ms: number }[];
  return summarizeAiUsageRows(rows);
}

// Platform-wide (all teachers) — for the admin operational cost view only.
export function getPlatformAiUsageCostSummary(sinceIso: string): AiUsageCostSummary {
  const rows = db
    .prepare(`SELECT feature, estimated_cost_usd, duration_ms FROM ai_usage_log WHERE created_at >= ?`)
    .all(sinceIso) as { feature: string; estimated_cost_usd: number; duration_ms: number }[];
  return summarizeAiUsageRows(rows);
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

// Atomically checks the monthly cap AND consumes one slot in a single
// SQLite transaction (better-sqlite3's db.transaction wraps this in
// BEGIN/COMMIT, and SQLite serializes writers), so two concurrent requests
// racing to reserve the last slot can never both succeed — one necessarily
// sees the other's write. `operationId` (e.g. a specific exam-generation
// request id, a specific student-paper id) makes this idempotent: reserving
// the same operation twice is a safe no-op that returns the first outcome,
// so a client retry of the same operation can never double-charge.
// Returns true if a slot was reserved (or already had been, for this exact
// operationId), false if the plan's monthly cap was reached.
export function reserveUsageAtomic(
  operationId: string,
  teacherId: string,
  period: string,
  feature: UsageFeature,
  limit: number,
): boolean {
  const run = db.transaction((): boolean => {
    const existing = db.prepare(`SELECT status FROM usage_reservations WHERE id = ?`).get(operationId) as
      | { status: string }
      | undefined;
    if (existing) return true; // already reserved (or released) under this id — never double-charge

    const row = db.prepare(`SELECT count FROM usage_counters WHERE teacher_id = ? AND period = ? AND feature = ?`).get(
      teacherId,
      period,
      feature,
    ) as { count: number } | undefined;
    const current = row?.count ?? 0;
    if (current >= limit) return false;

    incrementUsageCount(teacherId, period, feature);
    db.prepare(
      `INSERT INTO usage_reservations (id, teacher_id, period, feature, is_free_trial, status, created_at)
       VALUES (?, ?, ?, ?, 0, 'reserved', ?)`,
    ).run(operationId, teacherId, period, feature, new Date().toISOString());
    return true;
  });
  return run();
}

// Same reserve idempotency guarantee as above, for the one-time free trial
// (a boolean on teachers, not a counted quota) — also recorded in
// usage_reservations (is_free_trial=1) so releaseUsageAtomic can release
// *either* kind of reservation by operationId alone, without the caller
// needing to remember which path was used. This matters for a reservation
// released from code that only knows the operationId, far from where it was
// made (e.g. a background grading job releasing a paper's reservation on
// final failure, long after the HTTP request that created it returned).
// The conditional WHERE…IS NULL makes the teachers-row update itself atomic
// against concurrent first-ever requests from the same brand-new teacher.
export function reserveFreeTrialAtomic(operationId: string, teacherId: string): boolean {
  const run = db.transaction((): boolean => {
    const existing = db.prepare(`SELECT status FROM usage_reservations WHERE id = ?`).get(operationId) as
      | { status: string }
      | undefined;
    if (existing) return true;

    const result = db
      .prepare(`UPDATE teachers SET free_trial_used_at = ? WHERE id = ? AND free_trial_used_at IS NULL`)
      .run(new Date().toISOString(), teacherId);
    if (result.changes === 0) return false;

    db.prepare(
      `INSERT INTO usage_reservations (id, teacher_id, period, feature, is_free_trial, status, created_at)
       VALUES (?, ?, '', 'freeTrial', 1, 'reserved', ?)`,
    ).run(operationId, teacherId, new Date().toISOString());
    return true;
  });
  return run();
}

// Releases a previously reserved slot — plan-based usage or free trial,
// whichever this operationId was reserved as — safe to call even if the
// operation was never reserved, or was already released (both are no-ops),
// so a defensive double-release (e.g. a job retried after already failing
// once) can never credit back more than was actually charged.
export function releaseUsageAtomic(operationId: string): void {
  db.transaction(() => {
    const reservation = db.prepare(`SELECT * FROM usage_reservations WHERE id = ? AND status = 'reserved'`).get(
      operationId,
    ) as { teacher_id: string; period: string; feature: UsageFeature; is_free_trial: number } | undefined;
    if (!reservation) return;

    if (reservation.is_free_trial) {
      db.prepare(`UPDATE teachers SET free_trial_used_at = NULL WHERE id = ?`).run(reservation.teacher_id);
    } else {
      db.prepare(
        `UPDATE usage_counters SET count = MAX(0, count - 1) WHERE teacher_id = ? AND period = ? AND feature = ?`,
      ).run(reservation.teacher_id, reservation.period, reservation.feature);
    }
    db.prepare(`UPDATE usage_reservations SET status = 'released', released_at = ? WHERE id = ?`).run(
      new Date().toISOString(),
      operationId,
    );
  })();
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

// ---------- Self-service password reset tokens (email path only) ----------

interface PasswordResetTokenRow {
  token: string;
  teacher_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export interface PasswordResetToken {
  token: string;
  teacherId: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

function rowToPasswordResetToken(row: PasswordResetTokenRow): PasswordResetToken {
  return {
    token: row.token,
    teacherId: row.teacher_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

export function insertPasswordResetToken(entry: {
  token: string;
  teacherId: string;
  createdAt: string;
  expiresAt: string;
}): void {
  db.prepare(
    `INSERT INTO password_reset_tokens (token, teacher_id, created_at, expires_at, used_at)
     VALUES (@token, @teacherId, @createdAt, @expiresAt, NULL)`,
  ).run(entry);
}

// Returns the token row only if it exists, is unused, and hasn't expired —
// every other case (unknown/used/expired) returns null so callers can give a
// single generic "invalid or expired" error without distinguishing why.
export function findValidPasswordResetToken(token: string): PasswordResetToken | null {
  const row = db.prepare(`SELECT * FROM password_reset_tokens WHERE token = ?`).get(token) as
    | PasswordResetTokenRow
    | undefined;
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return rowToPasswordResetToken(row);
}

export function markPasswordResetTokenUsed(token: string): void {
  db.prepare(`UPDATE password_reset_tokens SET used_at = ? WHERE token = ?`).run(new Date().toISOString(), token);
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

// ---------- Knowledge base ----------
// Platform-wide, admin-curated library — every function here deliberately
// takes no teacherId (unlike almost everything above this section): these
// rows aren't scoped to one teacher's data, they ARE the shared library.
// Write access is gated in the service layer (knowledgeBase/*.ts) by admin
// checks, not by a DB-level teacherId filter.

interface KbSourceRow {
  id: string;
  name: string;
  url: string;
  source_type: KbSource["sourceType"];
  license_status: KbSource["licenseStatus"];
  reliability_note: string;
  discovered_at: string;
  last_checked_at: string | null;
}

function rowToKbSource(row: KbSourceRow): KbSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    sourceType: row.source_type,
    licenseStatus: row.license_status,
    reliabilityNote: row.reliability_note,
    discoveredAt: row.discovered_at,
    lastCheckedAt: row.last_checked_at,
  };
}

export function insertKbSource(source: KbSource): void {
  db.prepare(
    `INSERT INTO kb_sources (id, name, url, source_type, license_status, reliability_note, discovered_at, last_checked_at)
     VALUES (@id, @name, @url, @sourceType, @licenseStatus, @reliabilityNote, @discoveredAt, @lastCheckedAt)`,
  ).run(source);
}

export function listKbSources(): KbSource[] {
  const rows = db.prepare(`SELECT * FROM kb_sources ORDER BY discovered_at DESC`).all() as KbSourceRow[];
  return rows.map(rowToKbSource);
}

export function getKbSource(id: string): KbSource | null {
  const row = db.prepare(`SELECT * FROM kb_sources WHERE id = ?`).get(id) as KbSourceRow | undefined;
  return row ? rowToKbSource(row) : null;
}

export function findKbSourceByUrl(url: string): KbSource | null {
  const row = db.prepare(`SELECT * FROM kb_sources WHERE url = ?`).get(url) as KbSourceRow | undefined;
  return row ? rowToKbSource(row) : null;
}

export function touchKbSourceLastChecked(id: string, lastCheckedAt: string): void {
  db.prepare(`UPDATE kb_sources SET last_checked_at = ? WHERE id = ?`).run(lastCheckedAt, id);
}

export function updateKbSourceLicense(id: string, licenseStatus: KbSource["licenseStatus"], lastCheckedAt: string): void {
  db.prepare(`UPDATE kb_sources SET license_status = ?, last_checked_at = ? WHERE id = ?`).run(licenseStatus, lastCheckedAt, id);
}

// Appends to the existing note rather than replacing it — each research
// pass adds what it actually found without erasing an earlier pass's
// findings (or a human reviewer's own notes).
export function appendKbSourceReliabilityNote(id: string, additionalNote: string, lastCheckedAt: string): void {
  const row = db.prepare(`SELECT reliability_note FROM kb_sources WHERE id = ?`).get(id) as { reliability_note: string } | undefined;
  if (!row) return;
  const updated = `${row.reliability_note}\n\n[تحديث ${lastCheckedAt.slice(0, 10)}]: ${additionalNote}`;
  db.prepare(`UPDATE kb_sources SET reliability_note = ?, last_checked_at = ? WHERE id = ?`).run(updated, lastCheckedAt, id);
}

interface KbSourceDocumentRow {
  id: string;
  source_id: string;
  url: string;
  title: string;
  file_type: KbSourceDocument["fileType"];
  subject_id: SubjectId;
  education_level_id: string;
  document_kind: KbSourceDocument["documentKind"];
  content_year: string | null;
  raw_text: string | null;
  excerpt: string | null;
  checksum: string | null;
  status: KbContentStatus;
  notes: string;
  collected_at: string;
}

function rowToKbSourceDocument(row: KbSourceDocumentRow): KbSourceDocument {
  return {
    id: row.id,
    sourceId: row.source_id,
    url: row.url,
    title: row.title,
    fileType: row.file_type,
    subjectId: row.subject_id,
    educationLevelId: row.education_level_id,
    documentKind: row.document_kind,
    contentYear: row.content_year,
    rawText: row.raw_text,
    excerpt: row.excerpt,
    checksum: row.checksum,
    status: row.status,
    notes: row.notes,
    collectedAt: row.collected_at,
  };
}

export function insertKbSourceDocument(doc: KbSourceDocument): void {
  db.prepare(
    `INSERT INTO kb_source_documents
       (id, source_id, url, title, file_type, subject_id, education_level_id, document_kind, content_year, raw_text, excerpt, checksum, status, notes, collected_at)
     VALUES (@id, @sourceId, @url, @title, @fileType, @subjectId, @educationLevelId, @documentKind, @contentYear, @rawText, @excerpt, @checksum, @status, @notes, @collectedAt)`,
  ).run(doc);
}

export function getKbSourceDocument(id: string): KbSourceDocument | null {
  const row = db.prepare(`SELECT * FROM kb_source_documents WHERE id = ?`).get(id) as KbSourceDocumentRow | undefined;
  return row ? rowToKbSourceDocument(row) : null;
}

export function listKbSourceDocuments(filter?: { subjectId?: SubjectId; educationLevelId?: string; status?: KbContentStatus }): KbSourceDocument[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (filter?.subjectId) {
    conditions.push("subject_id = @subjectId");
    params.subjectId = filter.subjectId;
  }
  if (filter?.educationLevelId) {
    conditions.push("education_level_id = @educationLevelId");
    params.educationLevelId = filter.educationLevelId;
  }
  if (filter?.status) {
    conditions.push("status = @status");
    params.status = filter.status;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM kb_source_documents ${where} ORDER BY collected_at DESC`).all(params) as KbSourceDocumentRow[];
  return rows.map(rowToKbSourceDocument);
}

export function findKbSourceDocumentByChecksum(checksum: string): KbSourceDocument | null {
  const row = db.prepare(`SELECT * FROM kb_source_documents WHERE checksum = ?`).get(checksum) as
    | KbSourceDocumentRow
    | undefined;
  return row ? rowToKbSourceDocument(row) : null;
}

export function updateKbSourceDocumentExtraction(args: {
  id: string;
  rawText: string | null;
  excerpt: string | null;
  checksum: string | null;
  status: KbContentStatus;
}): void {
  db.prepare(
    `UPDATE kb_source_documents SET raw_text = @rawText, excerpt = @excerpt, checksum = @checksum, status = @status WHERE id = @id`,
  ).run(args);
}

export function updateKbSourceDocumentStatus(id: string, status: KbContentStatus, notes?: string): void {
  if (notes !== undefined) {
    db.prepare(`UPDATE kb_source_documents SET status = ?, notes = ? WHERE id = ?`).run(status, notes, id);
  } else {
    db.prepare(`UPDATE kb_source_documents SET status = ? WHERE id = ?`).run(status, id);
  }
}

interface KbLessonRow {
  id: string;
  source_document_id: string | null;
  subject_id: SubjectId;
  education_level_id: string;
  curriculum_topic: string;
  title: string;
  sections_json: string;
  skills_json: string;
  status: KbContentStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

function rowToKbLesson(row: KbLessonRow): KbLesson {
  return {
    id: row.id,
    sourceDocumentId: row.source_document_id,
    subjectId: row.subject_id,
    educationLevelId: row.education_level_id,
    curriculumTopic: row.curriculum_topic,
    title: row.title,
    sections: JSON.parse(row.sections_json),
    skills: JSON.parse(row.skills_json),
    status: row.status,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
  };
}

export function insertKbLesson(lesson: KbLesson): void {
  db.prepare(
    `INSERT INTO kb_lessons (id, source_document_id, subject_id, education_level_id, curriculum_topic, title, sections_json, skills_json, status, verified_at, verified_by, created_at)
     VALUES (@id, @sourceDocumentId, @subjectId, @educationLevelId, @curriculumTopic, @title, @sectionsJson, @skillsJson, @status, @verifiedAt, @verifiedBy, @createdAt)`,
  ).run({ ...lesson, sectionsJson: JSON.stringify(lesson.sections), skillsJson: JSON.stringify(lesson.skills) });
}

export function getKbLesson(id: string): KbLesson | null {
  const row = db.prepare(`SELECT * FROM kb_lessons WHERE id = ?`).get(id) as KbLessonRow | undefined;
  return row ? rowToKbLesson(row) : null;
}

export function listKbLessons(filter?: { subjectId?: SubjectId; educationLevelId?: string; status?: KbContentStatus }): KbLesson[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (filter?.subjectId) {
    conditions.push("subject_id = @subjectId");
    params.subjectId = filter.subjectId;
  }
  if (filter?.educationLevelId) {
    conditions.push("education_level_id = @educationLevelId");
    params.educationLevelId = filter.educationLevelId;
  }
  if (filter?.status) {
    conditions.push("status = @status");
    params.status = filter.status;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM kb_lessons ${where} ORDER BY created_at DESC`).all(params) as KbLessonRow[];
  return rows.map(rowToKbLesson);
}

export function updateKbLessonStatus(args: { id: string; status: KbContentStatus; verifiedAt?: string | null; verifiedBy?: string | null }): void {
  if (args.verifiedAt !== undefined || args.verifiedBy !== undefined) {
    db.prepare(`UPDATE kb_lessons SET status = @status, verified_at = @verifiedAt, verified_by = @verifiedBy WHERE id = @id`).run({
      id: args.id,
      status: args.status,
      verifiedAt: args.verifiedAt ?? null,
      verifiedBy: args.verifiedBy ?? null,
    });
  } else {
    db.prepare(`UPDATE kb_lessons SET status = ? WHERE id = ?`).run(args.status, args.id);
  }
}

interface KbExerciseRow {
  id: string;
  source_document_id: string | null;
  subject_id: SubjectId;
  education_level_id: string;
  curriculum_topic: string;
  prompt_text: string;
  solution_text: string | null;
  rubric_json: string;
  points: number;
  difficulty: KbExercise["difficulty"];
  status: KbContentStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

function rowToKbExercise(row: KbExerciseRow): KbExercise {
  return {
    id: row.id,
    sourceDocumentId: row.source_document_id,
    subjectId: row.subject_id,
    educationLevelId: row.education_level_id,
    curriculumTopic: row.curriculum_topic,
    promptText: row.prompt_text,
    solutionText: row.solution_text,
    rubric: JSON.parse(row.rubric_json),
    points: row.points,
    difficulty: row.difficulty,
    status: row.status,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
  };
}

export function insertKbExercise(ex: KbExercise): void {
  db.prepare(
    `INSERT INTO kb_exercises (id, source_document_id, subject_id, education_level_id, curriculum_topic, prompt_text, solution_text, rubric_json, points, difficulty, status, verified_at, verified_by, created_at)
     VALUES (@id, @sourceDocumentId, @subjectId, @educationLevelId, @curriculumTopic, @promptText, @solutionText, @rubricJson, @points, @difficulty, @status, @verifiedAt, @verifiedBy, @createdAt)`,
  ).run({ ...ex, rubricJson: JSON.stringify(ex.rubric) });
}

export function getKbExercise(id: string): KbExercise | null {
  const row = db.prepare(`SELECT * FROM kb_exercises WHERE id = ?`).get(id) as KbExerciseRow | undefined;
  return row ? rowToKbExercise(row) : null;
}

export function listKbExercises(filter?: { subjectId?: SubjectId; educationLevelId?: string; status?: KbContentStatus }): KbExercise[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (filter?.subjectId) {
    conditions.push("subject_id = @subjectId");
    params.subjectId = filter.subjectId;
  }
  if (filter?.educationLevelId) {
    conditions.push("education_level_id = @educationLevelId");
    params.educationLevelId = filter.educationLevelId;
  }
  if (filter?.status) {
    conditions.push("status = @status");
    params.status = filter.status;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM kb_exercises ${where} ORDER BY created_at DESC`).all(params) as KbExerciseRow[];
  return rows.map(rowToKbExercise);
}

export function updateKbExerciseStatus(args: { id: string; status: KbContentStatus; verifiedAt?: string | null; verifiedBy?: string | null }): void {
  if (args.verifiedAt !== undefined || args.verifiedBy !== undefined) {
    db.prepare(`UPDATE kb_exercises SET status = @status, verified_at = @verifiedAt, verified_by = @verifiedBy WHERE id = @id`).run({
      id: args.id,
      status: args.status,
      verifiedAt: args.verifiedAt ?? null,
      verifiedBy: args.verifiedBy ?? null,
    });
  } else {
    db.prepare(`UPDATE kb_exercises SET status = ? WHERE id = ?`).run(args.status, args.id);
  }
}

interface KbExamRow {
  id: string;
  source_document_id: string | null;
  title: string;
  exam_type: KbExam["examType"];
  subject_id: SubjectId;
  education_level_id: string;
  content_year: string | null;
  questions_json: string;
  status: KbContentStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

function rowToKbExam(row: KbExamRow): KbExam {
  return {
    id: row.id,
    sourceDocumentId: row.source_document_id,
    title: row.title,
    examType: row.exam_type,
    subjectId: row.subject_id,
    educationLevelId: row.education_level_id,
    contentYear: row.content_year,
    questions: JSON.parse(row.questions_json),
    status: row.status,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
  };
}

export function insertKbExam(exam: KbExam): void {
  db.prepare(
    `INSERT INTO kb_exams (id, source_document_id, title, exam_type, subject_id, education_level_id, content_year, questions_json, status, verified_at, verified_by, created_at)
     VALUES (@id, @sourceDocumentId, @title, @examType, @subjectId, @educationLevelId, @contentYear, @questionsJson, @status, @verifiedAt, @verifiedBy, @createdAt)`,
  ).run({ ...exam, questionsJson: JSON.stringify(exam.questions) });
}

export function getKbExam(id: string): KbExam | null {
  const row = db.prepare(`SELECT * FROM kb_exams WHERE id = ?`).get(id) as KbExamRow | undefined;
  return row ? rowToKbExam(row) : null;
}

export function listKbExams(filter?: { subjectId?: SubjectId; educationLevelId?: string; status?: KbContentStatus }): KbExam[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (filter?.subjectId) {
    conditions.push("subject_id = @subjectId");
    params.subjectId = filter.subjectId;
  }
  if (filter?.educationLevelId) {
    conditions.push("education_level_id = @educationLevelId");
    params.educationLevelId = filter.educationLevelId;
  }
  if (filter?.status) {
    conditions.push("status = @status");
    params.status = filter.status;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM kb_exams ${where} ORDER BY created_at DESC`).all(params) as KbExamRow[];
  return rows.map(rowToKbExam);
}

export function updateKbExamStatus(args: { id: string; status: KbContentStatus; verifiedAt?: string | null; verifiedBy?: string | null }): void {
  if (args.verifiedAt !== undefined || args.verifiedBy !== undefined) {
    db.prepare(`UPDATE kb_exams SET status = @status, verified_at = @verifiedAt, verified_by = @verifiedBy WHERE id = @id`).run({
      id: args.id,
      status: args.status,
      verifiedAt: args.verifiedAt ?? null,
      verifiedBy: args.verifiedBy ?? null,
    });
  } else {
    db.prepare(`UPDATE kb_exams SET status = ? WHERE id = ?`).run(args.status, args.id);
  }
}

interface KbVerificationRow {
  id: string;
  target_type: KbVerificationTargetType;
  target_id: string;
  method: KbVerification["method"];
  result: KbVerification["result"];
  detail: string;
  checked_at: string;
  checked_by: string | null;
}

function rowToKbVerification(row: KbVerificationRow): KbVerification {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    method: row.method,
    result: row.result,
    detail: row.detail,
    checkedAt: row.checked_at,
    checkedBy: row.checked_by,
  };
}

export function insertKbVerification(v: KbVerification): void {
  db.prepare(
    `INSERT INTO kb_verifications (id, target_type, target_id, method, result, detail, checked_at, checked_by)
     VALUES (@id, @targetType, @targetId, @method, @result, @detail, @checkedAt, @checkedBy)`,
  ).run(v);
}

export function listKbVerificationsForTarget(targetType: KbVerificationTargetType, targetId: string): KbVerification[] {
  const rows = db
    .prepare(`SELECT * FROM kb_verifications WHERE target_type = ? AND target_id = ? ORDER BY checked_at ASC`)
    .all(targetType, targetId) as KbVerificationRow[];
  return rows.map(rowToKbVerification);
}

interface KbChunkRow {
  id: string;
  subject_id: SubjectId;
  education_level_id: string;
  curriculum_topic: string;
  chunk_type: KbChunk["chunkType"];
  text: string;
  source_lesson_id: string | null;
  source_exercise_id: string | null;
  source_exam_id: string | null;
  created_at: string;
}

function rowToKbChunk(row: KbChunkRow): KbChunk {
  return {
    id: row.id,
    subjectId: row.subject_id,
    educationLevelId: row.education_level_id,
    curriculumTopic: row.curriculum_topic,
    chunkType: row.chunk_type,
    text: row.text,
    sourceLessonId: row.source_lesson_id,
    sourceExerciseId: row.source_exercise_id,
    sourceExamId: row.source_exam_id,
    createdAt: row.created_at,
  };
}

export function insertKbChunk(chunk: KbChunk): void {
  db.prepare(
    `INSERT INTO kb_chunks (id, subject_id, education_level_id, curriculum_topic, chunk_type, text, source_lesson_id, source_exercise_id, source_exam_id, created_at)
     VALUES (@id, @subjectId, @educationLevelId, @curriculumTopic, @chunkType, @text, @sourceLessonId, @sourceExerciseId, @sourceExamId, @createdAt)`,
  ).run(chunk);
}

// Lexical substring search only (SQL LIKE) — a real semantic/vector search
// is a separate infrastructure decision (see knowledgeBase/README notes),
// deliberately deferred rather than faked with a keyword match dressed up
// as "retrieval".
export function searchKbChunks(args: { subjectId: SubjectId; educationLevelId?: string; query: string; limit?: number }): KbChunk[] {
  const conditions = ["subject_id = @subjectId", "text LIKE @query"];
  const params: Record<string, string | number> = { subjectId: args.subjectId, query: `%${args.query}%`, limit: args.limit ?? 20 };
  if (args.educationLevelId) {
    conditions.push("education_level_id = @educationLevelId");
    params.educationLevelId = args.educationLevelId;
  }
  const rows = db
    .prepare(`SELECT * FROM kb_chunks WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT @limit`)
    .all(params) as KbChunkRow[];
  return rows.map(rowToKbChunk);
}

export function listKbChunks(filter?: { subjectId?: SubjectId; educationLevelId?: string }): KbChunk[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (filter?.subjectId) {
    conditions.push("subject_id = @subjectId");
    params.subjectId = filter.subjectId;
  }
  if (filter?.educationLevelId) {
    conditions.push("education_level_id = @educationLevelId");
    params.educationLevelId = filter.educationLevelId;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM kb_chunks ${where} ORDER BY created_at DESC`).all(params) as KbChunkRow[];
  return rows.map(rowToKbChunk);
}

export function countKbRows(): {
  sources: number;
  sourceDocuments: number;
  lessons: number;
  exercises: number;
  exams: number;
  chunks: number;
  byStatus: Record<string, number>;
} {
  const sources = (db.prepare(`SELECT COUNT(*) AS c FROM kb_sources`).get() as { c: number }).c;
  const sourceDocuments = (db.prepare(`SELECT COUNT(*) AS c FROM kb_source_documents`).get() as { c: number }).c;
  const lessons = (db.prepare(`SELECT COUNT(*) AS c FROM kb_lessons`).get() as { c: number }).c;
  const exercises = (db.prepare(`SELECT COUNT(*) AS c FROM kb_exercises`).get() as { c: number }).c;
  const exams = (db.prepare(`SELECT COUNT(*) AS c FROM kb_exams`).get() as { c: number }).c;
  const chunks = (db.prepare(`SELECT COUNT(*) AS c FROM kb_chunks`).get() as { c: number }).c;
  const statusRows = db
    .prepare(
      `SELECT status, COUNT(*) AS c FROM (
         SELECT status FROM kb_source_documents
         UNION ALL SELECT status FROM kb_lessons
         UNION ALL SELECT status FROM kb_exercises
         UNION ALL SELECT status FROM kb_exams
       ) GROUP BY status`,
    )
    .all() as { status: string; c: number }[];
  const byStatus: Record<string, number> = {};
  for (const row of statusRows) byStatus[row.status] = row.c;
  return { sources, sourceDocuments, lessons, exercises, exams, chunks, byStatus };
}
