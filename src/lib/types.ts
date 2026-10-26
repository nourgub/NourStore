export type SubjectId = "math" | "arabic";

export type SubscriptionStatus = "pending" | "active" | "expired" | "rejected";

export type PlanId = "full" | "lessons_only" | "exams_only" | "grading_only";

export type UsageFeature = "lessonPrep" | "exams" | "grading";

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  subscriptionStatus: SubscriptionStatus;
  planId: PlanId | null;
  // ISO date the current subscription period ends. null means it never
  // expires (the platform owner's own admin account, or an account approved
  // before this field existed).
  subscriptionExpiresAt: string | null;
  // When the teacher's one free trial operation (any single feature, before
  // ever paying) was used. null means it's still available.
  freeTrialUsedAt: string | null;
  // Set exactly once, at signup, only when the email matched ADMIN_EMAIL AND
  // the correct ADMIN_BOOTSTRAP_TOKEN was supplied (see /api/auth/signup) —
  // never re-derived from email alone afterward, so registering an account
  // whose email merely matches ADMIN_EMAIL (without the secret token) never
  // grants admin access.
  isAdmin: boolean;
  createdAt: string;
}

export type PasswordResetStatus = "pending" | "resolved";

export interface PasswordResetRequest {
  id: string;
  teacherId: string;
  status: PasswordResetStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export type PaymentRequestStatus = "pending" | "approved" | "rejected";

export interface PaymentRequest {
  id: string;
  teacherId: string;
  requestedPlanId: PlanId;
  receiptPath: string;
  receiptMimeType: string;
  // Date (YYYY-MM-DD) the teacher declares the receipt is from — the server
  // only accepts today's date, and the admin cross-checks it against what's
  // actually printed on the receipt photo before approving.
  receiptDate: string;
  status: PaymentRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface Session {
  token: string;
  teacherId: string;
  createdAt: string;
  expiresAt: string;
}

// "scanned_no_text": the file parsed successfully (so it isn't "failed") but
// yielded no real text — the classic symptom of a scanned/photographed PDF
// with no embedded text layer. Kept distinct from "extracted" so the teacher
// is told their document needs OCR, instead of the platform silently
// proceeding as if the reference material were simply empty.
export type ExtractionStatus = "none" | "extracted" | "unsupported" | "failed" | "scanned_no_text";

export interface CurriculumDocument {
  id: string;
  teacherId: string;
  subjectId: SubjectId;
  fileName: string;
  gradeLevel: string;
  topics: string[];
  styleNotes: string;
  extractionStatus: ExtractionStatus;
  extractedText: string;
  createdAt: string;
}

export type GenerationStatus = "queued" | "running" | "done" | "failed";

export interface AgentStep {
  agent: string;
  label: string;
  status: "pending" | "running" | "done";
  detail?: string;
  startedAt?: string;
  finishedAt?: string;
}

// A stable id, assigned once when the question/rubric is first created and
// never regenerated — grading output (from Claude or Gemini) must reference
// these ids explicitly instead of being matched by array position, so a
// model that reorders, skips, or duplicates an entry is caught rather than
// silently misattributed.
export interface RubricCriterion {
  id: string;
  criterion: string;
  points: number;
}

export interface GeneratedQuestion {
  id: string;
  topic: string;
  difficulty: "سهل" | "متوسط" | "صعب";
  points: number;
  prompt: string;
  solution: string;
  rubric: RubricCriterion[];
}

export type ExamReviewStatus = "not_configured" | "not_reviewed" | "reviewing" | "reviewed" | "failed";

export type ExamIssueSeverity = "تحذير" | "خطأ";

export type ExamIssueCategory =
  | "اكتمال_المعطيات"
  | "وضوح_الصياغة"
  | "صحة_الحساب"
  | "صحة_الحل"
  | "ملاءمة_المستوى"
  | "اتساق_السلم";

export interface ExamReviewIssue {
  questionId: string;
  severity: ExamIssueSeverity;
  category: ExamIssueCategory;
  description: string;
  suggestion: string;
}

// Gemini's independent review of Claude's draft exam — solved from the
// references only, never shown Claude's own solution first. `status`
// distinguishes "never attempted" (no key / feature off) from "attempted and
// failed" so the UI never shows a fabricated "verified" badge for either.
export interface ExamReview {
  status: ExamReviewStatus;
  reviewedAt: string | null;
  model: string | null;
  failureReason: string | null;
  independentSolutions: { questionId: string; solution: string }[];
  issues: ExamReviewIssue[];
}

export function emptyExamReview(): ExamReview {
  return { status: "not_reviewed", reviewedAt: null, model: null, failureReason: null, independentSolutions: [], issues: [] };
}

export interface GenerationRequest {
  id: string;
  teacherId: string;
  subjectId: SubjectId;
  documentId: string | null;
  examTitle: string;
  gradeLevel: string;
  topics: string[];
  numQuestions: number;
  difficultyMix: "متوازن" | "سهل" | "صعب";
  status: GenerationStatus;
  failureReason: string | null;
  steps: AgentStep[];
  questions: GeneratedQuestion[];
  // Bumped only if the questions/rubric are ever edited after creation —
  // grading sessions and student papers pin the version they graded against,
  // so a later rubric edit can never silently change an already-graded paper.
  rubricVersion: number;
  review: ExamReview;
  files: { examDocx?: string; solutionDocx?: string; rubricDocx?: string };
  createdAt: string;
  finishedAt?: string;
  // Set once the teacher explicitly approves THIS rubricVersion's questions,
  // solutions and grading rubric (see approveGeneration in generation.ts).
  // null (or not matching the current rubricVersion, e.g. after an edit)
  // means the exam is still a draft — createGradingSession refuses to start
  // real student grading against a draft. Never set automatically by any AI
  // review: a second model's "no issues found" is informative, never a
  // substitute for this explicit human approval.
  approvedRubricVersion: number | null;
  approvedAt: string | null;
}

// An exam is "approved" only when the teacher approved exactly the rubric
// version currently in effect — editing questions/rubric bumps rubricVersion
// and silently reverts the exam back to draft until re-approved.
export function isExamApproved(exam: Pick<GenerationRequest, "approvedRubricVersion" | "rubricVersion">): boolean {
  return exam.approvedRubricVersion !== null && exam.approvedRubricVersion === exam.rubricVersion;
}

export interface GradingSession {
  id: string;
  teacherId: string;
  examRequestId: string;
  // The exam's rubricVersion at the moment this session was created — every
  // paper submitted into this session is graded against this exact pin.
  examVersion: number;
  title: string;
  createdAt: string;
}

export type PaperStatus = "pending" | "grading" | "graded" | "approved" | "failed";

// Per-criterion outcome of comparing Claude's and Gemini's independent
// grading. "agreed"/"disagreed" require both scores to be present (non-null);
// "unreadable"/"missing_page" mean at least one model could not locate or
// read the relevant answer — these never collapse to an automatic 0.
export type CriterionReviewStatus = "not_reviewed" | "agreed" | "disagreed" | "unreadable" | "missing_page";

export interface CriterionGradeResult {
  criterionId: string;
  criterion: string;
  maxPoints: number;
  claudeAwardedPoints: number | null;
  claudeNote: string;
  geminiAwardedPoints: number | null;
  geminiNote: string;
  status: CriterionReviewStatus;
  // Set once resolved (models agreed, or the teacher decided) — null blocks
  // approval of the paper.
  finalAwardedPoints: number | null;
  teacherOverride: boolean;
  overrideReason: string | null;
}

export interface QuestionGradeResult {
  questionId: string;
  topic: string;
  maxPoints: number;
  claudeTranscription: string;
  claudeFeedback: string;
  geminiTranscription: string;
  geminiFeedback: string;
  criteriaResults: CriterionGradeResult[];
  // Sum of criteriaResults[].finalAwardedPoints, or null while any criterion
  // in this question is still unresolved.
  awardedPoints: number | null;
  // Set when either model flagged writing in the paper that appears to
  // address the grader/AI directly rather than answer the question.
  suspiciousNote: string | null;
}

export interface GradeOverrideLogEntry {
  questionId: string;
  criterionId: string;
  previousPoints: number | null;
  newPoints: number;
  reason: string;
  changedAt: string;
}

export type GeminiReviewStatus = "not_configured" | "not_reviewed" | "reviewing" | "reviewed" | "failed";

export interface StudentPaper {
  id: string;
  sessionId: string;
  teacherId: string;
  studentName: string;
  imagePaths: string[];
  status: PaperStatus;
  failureReason: string | null;
  // The exam's rubricVersion this paper was graded against (copied from the
  // session at submission time) — approval is blocked if the exam's rubric
  // has since moved to a newer version (see GenerationRequest.rubricVersion).
  examVersion: number;
  claudeModel: string | null;
  geminiReviewStatus: GeminiReviewStatus;
  geminiModel: string | null;
  geminiFailureReason: string | null;
  questionResults: QuestionGradeResult[];
  // true while any criterion is not yet "agreed" or teacher-resolved —
  // the paper cannot be approved while this is true.
  needsReview: boolean;
  draftTotal: number | null;
  approvedTotal: number | null;
  overrideHistory: GradeOverrideLogEntry[];
  // Teacher corrections of what a question's answer actually says, when the
  // teacher could read the handwriting better than the model could (see
  // correctPaperTranscription in grading.ts). Persists across re-grades: the
  // next grading call is told to trust this text for that question instead
  // of re-reading it from the image.
  teacherCorrectedTranscriptions: { questionId: string; text: string }[];
  createdAt: string;
  gradedAt: string | null;
  approvedAt: string | null;
}

export type LessonPrepMode = "generate" | "merge";

export type LessonPrepStatus = "done" | "failed";

export interface LessonPrepSection {
  heading: string;
  body: string;
}

export interface LessonPrepTemplateSchema {
  institutionLabel: string;
  headerFields: string[];
  noteFields: string[];
  tableColumns: string[];
}

export interface LessonPrepTemplate {
  id: string;
  teacherId: string;
  subjectId: SubjectId;
  fileName: string;
  schema: LessonPrepTemplateSchema;
  createdAt: string;
}

export interface LessonPrepFieldValue {
  label: string;
  value: string;
}

export interface LessonPrepTableRow {
  cells: string[];
}

export interface LessonPrepRequest {
  id: string;
  teacherId: string;
  subjectId: SubjectId;
  mode: LessonPrepMode;
  lessonTitle: string;
  gradeLevel: string;
  sourceFileNames: string[];
  steps: AgentStep[];
  // When templateId is set, headerValues/noteValues/tableColumns/tableRows
  // carry the content (rendered to match the teacher's uploaded template);
  // otherwise `sections` carries the generic heading/body content.
  templateId: string | null;
  sections: LessonPrepSection[];
  headerValues: LessonPrepFieldValue[];
  noteValues: LessonPrepFieldValue[];
  tableColumns: string[];
  tableRows: LessonPrepTableRow[];
  status: LessonPrepStatus;
  failureReason: string | null;
  fileDocx: string | null;
  createdAt: string;
}

// ---------- Knowledge Base (Algerian curriculum reference library) ----------
//
// This is a platform-wide, admin-curated library — NOT teacher-owned data
// (unlike every table above). It backs the teacher-facing library (browsing
// verified lessons/exercises/exams) and, later, retrieval for exam
// generation. Every content row carries this same lifecycle so nothing is
// ever surfaced to a teacher or fed to a generation prompt before it has
// actually been checked:
//
//   collected -> extracted -> classified -> pending_verification
//     -> verified -> published
//                 -> needs_human_review (never silently skipped to verified)
//                 -> rejected (terminal; kept for audit, never deleted)
//
// A row only reaches "published" through this chain — never created
// directly in that state.
export type KbContentStatus =
  | "collected"
  | "extracted"
  | "classified"
  | "pending_verification"
  | "verified"
  | "needs_human_review"
  | "rejected"
  | "published";

export type KbSourceType = "official_ministry" | "trusted_educational_site" | "textbook_publisher" | "other";

// Governs whether a source document's full text may be stored (see
// KbSourceDocument.rawText). "unknown" is the safe default — treated the
// same as "restricted" by the ingestion code until a human sets it
// explicitly, never assumed permissive.
export type KbLicenseStatus = "public_domain" | "permitted_excerpt" | "unknown" | "restricted";

export type KbDocumentKind = "lesson" | "exercise_sheet" | "exam" | "model_answer" | "curriculum_reference" | "other";

export type KbExamType = "bem" | "bac" | "فرض" | "اختبار" | "other";

export interface KbSource {
  id: string;
  name: string;
  url: string;
  sourceType: KbSourceType;
  licenseStatus: KbLicenseStatus;
  // Free-text note on why this source was trusted (or not) — e.g. "موقع
  // الديوان الوطني للامتحانات والمسابقات (ONEC) الرسمي". Never left implicit.
  reliabilityNote: string;
  discoveredAt: string;
  lastCheckedAt: string | null;
}

export interface KbSourceDocument {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  fileType: "pdf" | "docx" | "html" | "image" | "text";
  subjectId: SubjectId;
  // Matches an id from the curriculum level taxonomy (see
  // src/lib/knowledgeBase/levels.ts), e.g. "4am" — validated in code, no DB
  // foreign key (same convention as subjectId elsewhere in this schema).
  educationLevelId: string;
  documentKind: KbDocumentKind;
  // The real year this document is FROM (e.g. a 2023 BEM paper) — distinct
  // from collectedAt (when this platform found it).
  contentYear: string | null;
  // Full extracted text — null whenever licenseStatus isn't clearly
  // permissive (see KbLicenseStatus), per instruction 13 (never exceed
  // copyright). excerpt still allows a short, clearly-permitted snippet.
  rawText: string | null;
  excerpt: string | null;
  // SHA-256 of rawText (or excerpt when rawText is null) — duplicate
  // detection across re-collected/mirrored copies of the same document.
  checksum: string | null;
  status: KbContentStatus;
  notes: string;
  collectedAt: string;
}

export interface KbLesson {
  id: string;
  sourceDocumentId: string | null;
  subjectId: SubjectId;
  educationLevelId: string;
  curriculumTopic: string;
  title: string;
  sections: LessonPrepSection[];
  skills: string[];
  status: KbContentStatus;
  verifiedAt: string | null;
  // Admin teacher id who performed the human_review step, if any — null
  // when the row has only passed automated/deterministic checks so far.
  verifiedBy: string | null;
  createdAt: string;
}

export interface KbExercise {
  id: string;
  sourceDocumentId: string | null;
  subjectId: SubjectId;
  educationLevelId: string;
  curriculumTopic: string;
  promptText: string;
  solutionText: string | null;
  rubric: RubricCriterion[];
  points: number;
  difficulty: "سهل" | "متوسط" | "صعب";
  status: KbContentStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

// A single exam question, folded into KbExam.questions (one JSON column)
// rather than a separate table — the same convention already used by
// requests.questions_json for teacher-generated exams.
export interface KbExamQuestion {
  id: string;
  orderIndex: number;
  promptText: string;
  points: number;
  curriculumTopic: string;
  solutionText: string | null;
  rubric: RubricCriterion[];
}

export interface KbExam {
  id: string;
  sourceDocumentId: string | null;
  title: string;
  examType: KbExamType;
  subjectId: SubjectId;
  educationLevelId: string;
  contentYear: string | null;
  questions: KbExamQuestion[];
  status: KbContentStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

export type KbVerificationTargetType = "source_document" | "lesson" | "exercise" | "exam";
export type KbVerificationMethod =
  | "deterministic_points"
  | "deterministic_completeness"
  | "deterministic_duplicate"
  | "claude_review"
  | "gemini_review"
  | "human_review";
export type KbVerificationResult = "pass" | "fail" | "inconclusive";

export interface KbVerification {
  id: string;
  targetType: KbVerificationTargetType;
  targetId: string;
  method: KbVerificationMethod;
  result: KbVerificationResult;
  detail: string;
  checkedAt: string;
  // Admin teacher id, set only for method === "human_review".
  checkedBy: string | null;
}

// The retrieval unit for the future RAG wiring (deferred past this phase) —
// a focused, independently-retrievable piece of verified content. Only ever
// created from a row that has actually reached "published" (enforced in
// knowledgeBase/service.ts, not just by convention).
export type KbChunkType = "definition" | "rule" | "example" | "exercise" | "solution" | "other";

export interface KbChunk {
  id: string;
  subjectId: SubjectId;
  educationLevelId: string;
  curriculumTopic: string;
  chunkType: KbChunkType;
  text: string;
  sourceLessonId: string | null;
  sourceExerciseId: string | null;
  sourceExamId: string | null;
  createdAt: string;
}
