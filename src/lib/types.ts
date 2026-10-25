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

export type ExtractionStatus = "none" | "extracted" | "unsupported" | "failed";

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
