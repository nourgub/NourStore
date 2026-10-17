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

export interface GeneratedQuestion {
  id: string;
  topic: string;
  difficulty: "سهل" | "متوسط" | "صعب";
  points: number;
  prompt: string;
  solution: string;
  rubric: { criterion: string; points: number }[];
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
  steps: AgentStep[];
  questions: GeneratedQuestion[];
  files: { examDocx?: string; solutionDocx?: string; rubricDocx?: string };
  createdAt: string;
  finishedAt?: string;
}

export interface GradingSession {
  id: string;
  teacherId: string;
  examRequestId: string;
  title: string;
  createdAt: string;
}

export type PaperStatus = "pending" | "grading" | "graded" | "approved" | "failed";

export interface QuestionGradeResult {
  questionId: string;
  topic: string;
  maxPoints: number;
  awardedPoints: number;
  transcription: string;
  feedback: string;
  criteriaResults: { criterion: string; maxPoints: number; awardedPoints: number; note: string }[];
}

export interface StudentPaper {
  id: string;
  sessionId: string;
  teacherId: string;
  studentName: string;
  imagePaths: string[];
  status: PaperStatus;
  failureReason: string | null;
  questionResults: QuestionGradeResult[];
  draftTotal: number | null;
  approvedTotal: number | null;
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
