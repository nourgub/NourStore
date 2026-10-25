import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  PAPERS_DIR,
  approveStudentPaper,
  clearStudentPaperImagePaths,
  findGradingSession,
  findRequest,
  findStudentPaper,
  findStudentPaperById,
  getStudentPaperRawGrade,
  insertGradingSession,
  insertStudentPaper,
  listApprovedPapersForImageCleanup,
  listGradingSessions,
  listStudentPapers,
  updateStudentPaperFields,
  updateStudentPaperRawGrade,
} from "./db";
import { enqueue, registerJobHandler } from "./jobs";
import { gradeStudentPaper, isGradingConfigured, GradingAgentError } from "./agents/gradingAgent";
import { reviewStudentPaperWithGemini, isGeminiConfigured, GeminiReviewError } from "./agents/geminiPaperReviewAgent";
import { mergePaperGrades } from "./agents/gradingManager";
import { reserveUsage, releaseUsage } from "./usage";
import { computeClassAnalytics, type ClassAnalytics } from "./classAnalytics";
import { buildSessionResultsCsv } from "./sessionExport";
import { recordAiUsage } from "./aiUsageLog";
import type { IndependentPaperGrade } from "./agents/independentGradeTypes";
import { isExamApproved } from "./types";
import type {
  GeneratedQuestion,
  GenerationRequest,
  GradeOverrideLogEntry,
  GradingSession,
  StudentPaper,
  Teacher,
} from "./types";

export class GradingError extends Error {}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png"]);
export const MAX_PAPER_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per page (pre-compression upload limit)
// Raised from 4 to 10 at the teacher's explicit request (student papers can
// run 4-10 pages) — each extra page is a real per-paper cost increase (more
// vision tokens sent to both Claude and Gemini), a deliberate tradeoff
// accepted here over the earlier cost-control cap.
const MAX_PAGES_PER_PAPER = 10;

// Claude's vision pipeline resizes images to fit within ~1568px on the long
// edge before reading them — anything bigger costs more tokens (and more
// storage) with no accuracy benefit. Re-encoding every page to this size as
// JPEG also caps per-customer storage growth, since nothing here is ever
// deleted automatically.
const MAX_IMAGE_DIMENSION = 1568;

// The student's real name is never sent to Claude or Gemini — only used for
// the teacher's own UI and exports. The model only needs a stable label to
// refer to "this paper" by in its narration; it never needs the real
// identity, and grading/feedback quality is unaffected by swapping it.
// Derived from the paper's own id so it's stable across retries/re-grades of
// the same paper without needing to store anything extra.
export function pseudonymizeStudent(paperId: string): string {
  return `تلميذ (مُعرّف الورقة: ${paperId.slice(-8)})`;
}

// Claude is the primary grader whenever it's configured — Gemini then plays
// its original role, an independent second opinion. When Claude isn't
// configured (no paid key), Gemini takes over the primary slot entirely
// instead of grading being unavailable, since Gemini's free tier is a fully
// real, capable model — never a mock. A true independent review needs TWO
// distinct models, so it only ever runs when both are configured; with
// Gemini alone in the primary slot there is no second model left to review
// it.
export function isPrimaryGraderClaude(): boolean {
  return isGradingConfigured();
}

export function shouldRunIndependentGeminiReview(): boolean {
  return isGradingConfigured() && isGeminiConfigured();
}

// Shared input shape for both gradeStudentPaper and
// reviewStudentPaperWithGemini — kept in one place so the student's real
// name can never accidentally be reintroduced at one of the two call sites
// without the other.
export function buildIndependentGradeCallInput(
  paper: StudentPaper,
  exam: GenerationRequest,
): {
  examTitle: string;
  gradeLevel: string;
  studentName: string;
  questions: GeneratedQuestion[];
  imagePaths: string[];
  imageMimeTypes: string[];
  knownTranscriptions?: { questionId: string; text: string }[];
} {
  return {
    examTitle: exam.examTitle,
    gradeLevel: exam.gradeLevel,
    studentName: pseudonymizeStudent(paper.id),
    questions: exam.questions,
    imagePaths: paper.imagePaths,
    imageMimeTypes: paper.imagePaths.map(() => "image/jpeg"),
    knownTranscriptions:
      paper.teacherCorrectedTranscriptions.length > 0 ? paper.teacherCorrectedTranscriptions : undefined,
  };
}
const JPEG_QUALITY = 82;

function validatePaperImageFiles(files: File[]): void {
  if (files.length === 0) throw new GradingError("أرفق صورة واحدة على الأقل من ورقة الإجابة");
  if (files.length > MAX_PAGES_PER_PAPER) throw new GradingError(`الحد الأقصى ${MAX_PAGES_PER_PAPER} صفحات لكل ورقة`);
  for (const file of files) {
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      throw new GradingError("صيغة الصورة غير مدعومة — يُقبل فقط JPG أو PNG");
    }
    if (file.size > MAX_PAPER_IMAGE_BYTES) {
      throw new GradingError("حجم إحدى الصور يتجاوز الحد المسموح (10 ميغابايت)");
    }
  }
}

async function writePaperImages(paperDir: string, files: File[]): Promise<string[]> {
  fs.mkdirSync(paperDir, { recursive: true });
  const imagePaths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imagePath = path.join(paperDir, `page-${i + 1}.jpg`);
    const original = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(original)
      .rotate() // respect EXIF orientation from phone cameras before stripping metadata
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    fs.writeFileSync(imagePath, resized);
    imagePaths.push(imagePath);
  }
  return imagePaths;
}

// Shared reset applied whenever a paper is sent back through grading (plain
// retry, after a corrected transcription, or after replacement images) — a
// stale grade must never linger next to a "grading" status.
function resetPaperForRegrade(paperId: string): void {
  updateStudentPaperFields(paperId, {
    status: "grading",
    failureReason: null,
    claudeModel: null,
    questionResults: [],
    needsReview: false,
    draftTotal: null,
    gradedAt: null,
    geminiReviewStatus: shouldRunIndependentGeminiReview() ? "not_reviewed" : "not_configured",
    geminiModel: null,
    geminiFailureReason: null,
  });
  enqueueClaudeGradeJob(paperId, true);
  if (shouldRunIndependentGeminiReview()) {
    enqueueGeminiReviewJob(paperId, true);
  }
}

export async function createGradingSession(
  teacherId: string,
  examRequestId: string,
  title: string,
): Promise<GradingSession> {
  const exam = findRequest(examRequestId, teacherId);
  if (!exam) throw new GradingError("الامتحان المرتبط غير موجود");
  if (exam.questions.length === 0) throw new GradingError("هذا الامتحان لا يحتوي على أسئلة لتصحيحها");
  if (!isExamApproved(exam)) {
    throw new GradingError(
      "هذا الامتحان ما يزال مسودة — راجع الأسئلة والحلول وسلم التنقيط واعتمده أولًا قبل بدء تصحيح حقيقي لأوراق التلاميذ",
    );
  }

  const session: GradingSession = {
    id: `grd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId,
    examRequestId,
    examVersion: exam.rubricVersion,
    title: title.trim() || exam.examTitle,
    createdAt: new Date().toISOString(),
  };
  insertGradingSession(session);
  return session;
}

export function getGradingSessionsForTeacher(teacherId: string): GradingSession[] {
  return listGradingSessions(teacherId);
}

export function getGradingSessionsForExam(examRequestId: string, teacherId: string): GradingSession[] {
  return listGradingSessions(teacherId).filter((s) => s.examRequestId === examRequestId);
}

export function getGradingSession(sessionId: string, teacherId: string): GradingSession | null {
  return findGradingSession(sessionId, teacherId);
}

export function getPapersForSession(sessionId: string, teacherId: string): StudentPaper[] {
  return listStudentPapers(sessionId, teacherId);
}

export function getStudentPaper(paperId: string, teacherId: string): StudentPaper | null {
  return findStudentPaper(paperId, teacherId);
}

// Pedagogical follow-up (class results distribution, recurring weak
// criteria) — computed ONLY from approved papers, per this project's rule
// that a draft grade must never feed a number the teacher might act on, and
// only once enough papers are approved to say anything meaningful (see
// MIN_PAPERS_FOR_ANALYTICS in classAnalytics.ts). Returns null only if the
// session/exam itself can't be found or isn't this teacher's.
export function getClassAnalytics(sessionId: string, teacherId: string): ClassAnalytics | null {
  const session = findGradingSession(sessionId, teacherId);
  if (!session) return null;
  const exam = findRequest(session.examRequestId, teacherId);
  if (!exam) return null;

  const papers = listStudentPapers(sessionId, teacherId);
  const totalPoints = exam.questions.reduce((s, q) => s + q.points, 0);
  return computeClassAnalytics(papers, exam.questions, totalPoints);
}

// CSV export of every paper in the session (draft and approved alike, each
// clearly labeled) — the caller is responsible for the UTF-8 BOM Excel needs
// for Arabic text. Returns null for the same not-found/not-yours cases as
// getClassAnalytics.
export function exportSessionResultsCsv(sessionId: string, teacherId: string): string | null {
  const session = findGradingSession(sessionId, teacherId);
  if (!session) return null;
  const exam = findRequest(session.examRequestId, teacherId);
  if (!exam) return null;

  const papers = listStudentPapers(sessionId, teacherId);
  return buildSessionResultsCsv(papers, exam.questions);
}

export async function submitStudentPaper(
  teacher: Teacher,
  sessionId: string,
  studentName: string,
  files: File[],
): Promise<StudentPaper> {
  const teacherId = teacher.id;
  const session = findGradingSession(sessionId, teacherId);
  if (!session) throw new GradingError("جلسة التصحيح غير موجودة");
  if (!studentName.trim()) throw new GradingError("اسم التلميذ مطلوب");
  validatePaperImageFiles(files);

  const exam = findRequest(session.examRequestId, teacherId);
  if (!exam) throw new GradingError("الامتحان المرتبط بجلسة التصحيح لم يعد موجودًا");

  const paperId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Reserved atomically right after all cheap validation and before any
  // file I/O — the paper's own id doubles as the usage-reservation id, so
  // the background grading job can release it later (on permanent failure)
  // by that same id alone, and a client retry of this exact submission can
  // never double-charge. May throw UsageLimitError — left to propagate as-is
  // (not wrapped into GradingError) so callers can tell a quota rejection
  // (403) apart from an ordinary validation error (400), same as every
  // other usage-gated route in this app.
  const { release } = reserveUsage(teacher, "grading", paperId);

  try {
    const paperDir = path.join(PAPERS_DIR, teacherId, paperId);
    const imagePaths = await writePaperImages(paperDir, files);

    const paper: StudentPaper = {
      id: paperId,
      sessionId,
      teacherId,
      studentName: studentName.trim(),
      imagePaths,
      status: "grading",
      failureReason: null,
      examVersion: session.examVersion,
      claudeModel: null,
      geminiReviewStatus: shouldRunIndependentGeminiReview() ? "not_reviewed" : "not_configured",
      geminiModel: null,
      geminiFailureReason: null,
      questionResults: [],
      needsReview: false,
      draftTotal: null,
      approvedTotal: null,
      overrideHistory: [],
      teacherCorrectedTranscriptions: [],
      createdAt: new Date().toISOString(),
      gradedAt: null,
      approvedAt: null,
    };
    insertStudentPaper(paper);

    // Grading runs entirely in the background — this returns as soon as the
    // work is queued. The paper stays "grading" until the Claude job (and,
    // if configured, the Gemini review job) complete. The usage slot stays
    // reserved from here on; handleClaudeGradeJob releases it if Claude's
    // grading permanently fails (see below) — a successful submission that
    // simply hasn't finished grading yet is not a failure.
    enqueueClaudeGradeJob(paperId, false);
    if (shouldRunIndependentGeminiReview()) {
      enqueueGeminiReviewJob(paperId, false);
    }
    return paper;
  } catch (err) {
    release();
    throw err;
  }
}

function enqueueClaudeGradeJob(paperId: string, isRetry: boolean): void {
  const suffix = isRetry ? `:retry:${Date.now()}` : "";
  enqueue({
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "grade_paper_claude",
    idempotencyKey: `grade_paper_claude:${paperId}${suffix}`,
    payload: { paperId },
  });
}

function enqueueGeminiReviewJob(paperId: string, isRetry: boolean): void {
  const suffix = isRetry ? `:retry:${Date.now()}` : "";
  enqueue({
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "review_paper_gemini",
    idempotencyKey: `review_paper_gemini:${paperId}${suffix}`,
    payload: { paperId },
  });
}

/** Re-enqueues a failed Claude grading and/or Gemini review job for a paper — the UI's "retry" action. */
export function retryPaperGrading(paperId: string, teacherId: string): StudentPaper {
  const paper = findStudentPaper(paperId, teacherId);
  if (!paper) throw new GradingError("الورقة غير موجودة");
  if (paper.status === "approved") throw new GradingError("لا يمكن إعادة تصحيح ورقة مُعتمدة بالفعل");

  resetPaperForRegrade(paperId);
  return findStudentPaper(paperId, teacherId)!;
}

/**
 * Replaces a paper's page images (e.g. a blurry scan, the wrong page, a
 * photo taken sideways) and triggers a full re-grade from scratch — this is
 * the "إعادة رفع الصورة" half of the unreadable-answer workflow: a bad photo
 * is not the student's fault, and should never need a whole new paper
 * submission (and a second quota charge) to fix.
 */
export async function replacePaperImages(teacherId: string, paperId: string, files: File[]): Promise<StudentPaper> {
  const paper = findStudentPaper(paperId, teacherId);
  if (!paper) throw new GradingError("الورقة غير موجودة");
  if (paper.status === "approved") throw new GradingError("لا يمكن استبدال صور ورقة مُعتمدة بالفعل");
  validatePaperImageFiles(files);

  const oldImagePaths = paper.imagePaths;
  const paperDir = path.join(PAPERS_DIR, teacherId, paperId);
  const newImagePaths = await writePaperImages(paperDir, files);

  updateStudentPaperFields(paperId, { imagePaths: newImagePaths });
  for (const oldPath of oldImagePaths) {
    if (newImagePaths.includes(oldPath)) continue; // writePaperImages reuses the same page-N.jpg names
    try {
      fs.unlinkSync(oldPath);
    } catch {
      // Already missing — nothing to clean up.
    }
  }

  resetPaperForRegrade(paperId);
  return findStudentPaper(paperId, teacherId)!;
}

/**
 * Records the teacher's correction of what a specific question's answer
 * actually says (the "تصحيح النص المستخرج" half of the unreadable-answer
 * workflow — used when the teacher can read the handwriting but the model
 * couldn't) and triggers a full re-grade: both gradeStudentPaper and the
 * Gemini reviewer are told to trust this text for this question instead of
 * re-reading it from the image (see knownTranscriptions in GradePaperInput).
 */
export function correctPaperTranscription(
  teacherId: string,
  paperId: string,
  questionId: string,
  correctedText: string,
): StudentPaper {
  const paper = findStudentPaper(paperId, teacherId);
  if (!paper) throw new GradingError("الورقة غير موجودة");
  if (paper.status === "approved") throw new GradingError("لا يمكن تصحيح نص ورقة مُعتمدة بالفعل");
  if (!correctedText.trim()) throw new GradingError("النص المصحَّح لا يمكن أن يكون فارغًا");

  const session = findGradingSession(paper.sessionId, teacherId);
  const exam = session ? findRequest(session.examRequestId, teacherId) : null;
  if (!exam || !exam.questions.some((q) => q.id === questionId)) {
    throw new GradingError("السؤال المحدَّد غير موجود في هذا الامتحان");
  }

  const corrections = paper.teacherCorrectedTranscriptions.filter((c) => c.questionId !== questionId);
  corrections.push({ questionId, text: correctedText.trim() });
  updateStudentPaperFields(paperId, { teacherCorrectedTranscriptions: corrections });

  resetPaperForRegrade(paperId);
  return findStudentPaper(paperId, teacherId)!;
}

// ---------- Background job handlers (registered once at server startup — see src/instrumentation.ts) ----------

async function handleClaudeGradeJob(
  payload: Record<string, unknown>,
  job: { attempts: number; maxAttempts: number },
): Promise<Record<string, unknown>> {
  const paperId = String(payload.paperId);
  const isLastAttempt = job.attempts >= job.maxAttempts;
  const paper = findStudentPaperById(paperId);
  if (!paper) throw new Error("الورقة غير موجودة");
  if (paper.status === "approved") return { skipped: true };

  const session = findGradingSession(paper.sessionId, paper.teacherId);
  const exam = session ? findRequest(session.examRequestId, paper.teacherId) : null;
  if (!exam) {
    const reason = session ? "الامتحان المرتبط لم يعد موجودًا" : "جلسة التصحيح لم تعد موجودة";
    if (isLastAttempt) {
      updateStudentPaperFields(paperId, { status: "failed", failureReason: reason });
      releaseUsage(paperId); // a permanent failure must never cost the teacher their quota
    }
    throw new Error(reason);
  }

  let claudeGrade: IndependentPaperGrade;
  const startedAt = Date.now();
  const useClaude = isPrimaryGraderClaude();
  try {
    const { grade, usage } = useClaude
      ? await gradeStudentPaper(buildIndependentGradeCallInput(paper, exam))
      : await reviewStudentPaperWithGemini(buildIndependentGradeCallInput(paper, exam));
    claudeGrade = grade;
    recordAiUsage({
      teacherId: paper.teacherId,
      feature: "grading",
      operationId: paperId,
      provider: useClaude ? "claude" : "gemini",
      model: grade.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      durationMs: Date.now() - startedAt,
      pageCount: paper.imagePaths.length,
    });
  } catch (err) {
    const failureReason =
      err instanceof GradingAgentError || err instanceof GeminiReviewError || err instanceof Error
        ? err.message
        : "خطأ غير معروف أثناء التصحيح";
    // Only write a user-visible "failed" once retries are exhausted — an
    // attempt the queue will silently retry shouldn't flash "failed" at the
    // teacher in between. Same point: only a *permanent* failure refunds the
    // reserved usage slot, matching the status change it's tied to.
    if (isLastAttempt) {
      updateStudentPaperFields(paperId, { status: "failed", failureReason });
      releaseUsage(paperId);
    }
    throw err instanceof Error ? err : new Error(failureReason);
  }

  applyMerge(paperId, exam.questions, claudeGrade, "claude");
  updateStudentPaperFields(paperId, { claudeModel: claudeGrade.model });
  return { ok: true };
}

async function handleGeminiReviewJob(
  payload: Record<string, unknown>,
  job: { attempts: number; maxAttempts: number },
): Promise<Record<string, unknown>> {
  const paperId = String(payload.paperId);
  const isLastAttempt = job.attempts >= job.maxAttempts;
  const paper = findStudentPaperById(paperId);
  if (!paper) throw new Error("الورقة غير موجودة");
  if (paper.status === "approved") return { skipped: true };

  updateStudentPaperFields(paperId, { geminiReviewStatus: "reviewing" });

  const session = findGradingSession(paper.sessionId, paper.teacherId);
  const exam = session ? findRequest(session.examRequestId, paper.teacherId) : null;
  if (!exam) {
    const reason = "الامتحان المرتبط لم يعد موجودًا";
    if (isLastAttempt) updateStudentPaperFields(paperId, { geminiReviewStatus: "failed", geminiFailureReason: reason });
    throw new Error(reason);
  }

  let geminiGrade: IndependentPaperGrade;
  const startedAt = Date.now();
  try {
    const { grade, usage } = await reviewStudentPaperWithGemini(buildIndependentGradeCallInput(paper, exam));
    geminiGrade = grade;
    recordAiUsage({
      teacherId: paper.teacherId,
      feature: "grading",
      operationId: paperId,
      provider: "gemini",
      model: grade.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      durationMs: Date.now() - startedAt,
      pageCount: paper.imagePaths.length,
    });
  } catch (err) {
    const failureReason =
      err instanceof GeminiReviewError || err instanceof Error ? err.message : "فشلت المراجعة لسبب غير معروف";
    if (isLastAttempt) {
      updateStudentPaperFields(paperId, { geminiReviewStatus: "failed", geminiFailureReason: failureReason });
    }
    throw err instanceof Error ? err : new Error(failureReason);
  }

  applyMerge(paperId, exam.questions, geminiGrade, "gemini");
  updateStudentPaperFields(paperId, { geminiReviewStatus: "reviewed", geminiModel: geminiGrade.model });
  return { ok: true };
}

/**
 * Persists this model's raw independent grade, re-reads whatever the other
 * model has already produced (if anything), re-runs the pure-code manager
 * over both, and writes back the merged view. Everything here is
 * synchronous (no `await` between any read and its write), so the two
 * background jobs can never clobber each other even though they run
 * concurrently against the same paper.
 */
function applyMerge(
  paperId: string,
  questions: GeneratedQuestion[],
  grade: IndependentPaperGrade,
  source: "claude" | "gemini",
): void {
  updateStudentPaperRawGrade(paperId, source, grade);

  const current = findStudentPaperById(paperId);
  if (!current) return;

  const claudeGrade =
    source === "claude" ? grade : (getStudentPaperRawGrade(paperId, "claude") as IndependentPaperGrade | null);
  const geminiGrade =
    source === "gemini" ? grade : (getStudentPaperRawGrade(paperId, "gemini") as IndependentPaperGrade | null);

  // Only fold Gemini in once it has actually finished successfully — while
  // it's still "reviewing" (or never configured/failed), grading proceeds
  // on Claude alone and criteria are marked "not_reviewed", not blocked.
  const geminiAvailable = source === "gemini" || current.geminiReviewStatus === "reviewed";

  const { questionResults, needsReview, draftTotal } = mergePaperGrades({
    questions,
    claude: claudeGrade,
    gemini: geminiAvailable ? geminiGrade : null,
    geminiAvailable,
  });

  updateStudentPaperFields(paperId, {
    status: claudeGrade ? "graded" : "grading",
    questionResults,
    needsReview,
    draftTotal,
    gradedAt: new Date().toISOString(),
  });
}

export function registerGradingJobHandlers(): void {
  registerJobHandler("grade_paper_claude", handleClaudeGradeJob);
  registerJobHandler("review_paper_gemini", handleGeminiReviewJob);
}

export const DEFAULT_IMAGE_RETENTION_DAYS = 90;

// Admin-triggered cleanup (never runs automatically): deletes the stored
// page photos of papers approved more than `olderThanDays` ago. The grade,
// transcription and feedback for each paper are kept — only the raw images
// (the sensitive, storage-heavy part) are removed.
export function cleanupOldApprovedPaperImages(olderThanDays: number = DEFAULT_IMAGE_RETENTION_DAYS): {
  papersCleaned: number;
  filesDeleted: number;
  bytesFreed: number;
} {
  const cutoffIso = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const papers = listApprovedPapersForImageCleanup(cutoffIso);

  let filesDeleted = 0;
  let bytesFreed = 0;
  for (const paper of papers) {
    for (const imagePath of paper.imagePaths) {
      try {
        const stat = fs.statSync(imagePath);
        fs.unlinkSync(imagePath);
        bytesFreed += stat.size;
        filesDeleted++;
      } catch {
        // Already missing — nothing to free, still clear the DB reference below.
      }
    }
    clearStudentPaperImagePaths(paper.id);
  }

  return { papersCleaned: papers.length, filesDeleted, bytesFreed };
}

export interface GradeOverrideInput {
  questionId: string;
  criterionId: string;
  newPoints: number;
  reason: string;
}

/**
 * Approves a paper's final grade. Every number is recomputed server-side —
 * the client sends only which criteria the teacher is overriding and why;
 * it never sends a trusted total. Blocks approval if: the paper isn't in a
 * approvable state, any criterion is still unresolved (needsReview) and not
 * covered by an override, an override's points are out of range, or the
 * exam's rubric has moved to a newer version since this paper was graded.
 */
export function approvePaperGrade(paperId: string, teacherId: string, overrides: GradeOverrideInput[]): StudentPaper {
  const paper = findStudentPaper(paperId, teacherId);
  if (!paper) throw new GradingError("الورقة غير موجودة");
  if (paper.status === "approved") throw new GradingError("تم اعتماد هذه الورقة مسبقًا");
  if (paper.status !== "graded") throw new GradingError("لا يمكن اعتماد ورقة لم يكتمل تصحيحها بعد");

  const session = findGradingSession(paper.sessionId, teacherId);
  if (!session) throw new GradingError("جلسة التصحيح لم تعد موجودة");
  const exam = findRequest(session.examRequestId, teacherId);
  if (!exam) throw new GradingError("الامتحان المرتبط لم يعد موجودًا");
  if (exam.rubricVersion !== paper.examVersion) {
    throw new GradingError(
      "تغيّر سلم تنقيط هذا الامتحان منذ تصحيح هذه الورقة — يجب إعادة تصحيحها على السلم الجديد قبل الاعتماد",
    );
  }

  const overrideByKey = new Map(overrides.map((o) => [`${o.questionId}:${o.criterionId}`, o]));
  const seenKeys = new Set<string>();
  const logEntries: GradeOverrideLogEntry[] = [];
  const now = new Date().toISOString();

  const finalQuestionResults = paper.questionResults.map((q) => {
    const criteriaResults = q.criteriaResults.map((c) => {
      const key = `${q.questionId}:${c.criterionId}`;
      const override = overrideByKey.get(key);
      if (!override) return c;

      seenKeys.add(key);
      if (!Number.isFinite(override.newPoints) || override.newPoints < 0) {
        throw new GradingError(`قيمة نقطة غير صالحة للمعيار "${c.criterion}"`);
      }
      if (override.newPoints > c.maxPoints + 1e-9) {
        throw new GradingError(`النقطة المعطاة للمعيار "${c.criterion}" تتجاوز حده الأقصى (${c.maxPoints})`);
      }
      if (!override.reason.trim()) {
        throw new GradingError(`يجب كتابة سبب تعديل النقطة للمعيار "${c.criterion}"`);
      }

      const newPoints = Math.round(override.newPoints * 100) / 100;
      logEntries.push({
        questionId: q.questionId,
        criterionId: c.criterionId,
        previousPoints: c.finalAwardedPoints,
        newPoints,
        reason: override.reason.trim(),
        changedAt: now,
      });

      return { ...c, finalAwardedPoints: newPoints, teacherOverride: true, overrideReason: override.reason.trim() };
    });

    const awardedPoints = Math.round(criteriaResults.reduce((s, c) => s + (c.finalAwardedPoints ?? 0), 0) * 100) / 100;
    return { ...q, criteriaResults, awardedPoints };
  });

  for (const key of overrideByKey.keys()) {
    if (!seenKeys.has(key)) {
      throw new GradingError("أحد التعديلات يشير إلى معيار غير موجود في هذه الورقة");
    }
  }

  const stillUnresolved = finalQuestionResults.some((q) => q.criteriaResults.some((c) => c.finalAwardedPoints === null));
  if (stillUnresolved) {
    throw new GradingError(
      "توجد معايير بلا نقطة نهائية بعد (غير مقروءة، صفحة مفقودة، أو خلاف بين النموذجين) — يجب حسمها جميعًا قبل الاعتماد",
    );
  }

  const approvedTotal = Math.round(finalQuestionResults.reduce((s, q) => s + (q.awardedPoints ?? 0), 0) * 100) / 100;
  const overrideHistory = [...paper.overrideHistory, ...logEntries];

  approveStudentPaper(paperId, approvedTotal, finalQuestionResults, overrideHistory);
  return { ...paper, status: "approved", approvedTotal, questionResults: finalQuestionResults, overrideHistory };
}
