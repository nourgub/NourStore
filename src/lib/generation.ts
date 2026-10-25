import fs from "node:fs";
import path from "node:path";
import {
  GENERATED_DIR,
  approveGenerationRequest,
  findDocument,
  findRequest,
  insertRequest,
  listRequests,
  updateRequestQuestions,
  updateRequestReview,
} from "./db";
import { runAgentPipeline, runGivenExercisesPipeline, runExamImportPipeline } from "./agents/pipeline";
import { buildExamDocx } from "./docx/buildExamDocx";
import { buildSolutionDocx } from "./docx/buildSolutionDocx";
import { buildRubricDocx } from "./docx/buildRubricDocx";
import { emptyExamReview, type GeneratedQuestion, type RubricCriterion } from "./types";
import type { GenerationRequest, SubjectId } from "./types";
import { enqueue, registerJobHandler } from "./jobs";
import { isGeminiConfigured, reviewExamWithGemini, GeminiReviewError } from "./agents/geminiExamReviewAgent";
import { toHundredths } from "./points";
import { computeStructuralReview } from "./examStructuralReview";

// Same bound used for exam generation's own curriculum excerpt (realContent.ts)
// — keeps the review call's token cost predictable regardless of document size.
const MAX_CURRICULUM_CHARS_IN_PROMPT = 6000;

export interface CreateGenerationInput {
  teacherId: string;
  subjectId: SubjectId;
  documentId: string | null;
  examTitle: string;
  gradeLevel: string;
  topics: string[];
  numQuestions: number;
  difficultyMix: "متوازن" | "سهل" | "صعب";
  // When present, this exam is built from exercises the teacher copied
  // verbatim from specific pages of an uploaded Word file, instead of
  // AI-generated content on the given topics — see runGivenExercisesPipeline.
  // topics/numQuestions/difficultyMix/documentId are ignored in this mode.
  pageExercises?: { pageNumber: number; promptText: string }[];
  // When present, this exam is imported wholesale from a teacher's own exam
  // + model-correction documents — lets grading be used standalone, without
  // ever generating an exam through this platform. See runExamImportPipeline.
  // topics/numQuestions/difficultyMix/documentId are ignored in this mode.
  importedExam?: { examText: string; correctionText: string };
}

export class GenerationError extends Error {}

export async function createGeneration(input: CreateGenerationInput): Promise<GenerationRequest> {
  if (!input.examTitle.trim()) throw new GenerationError("عنوان الامتحان مطلوب");

  const usingPageExercises = Boolean(input.pageExercises && input.pageExercises.length > 0);
  const usingImportedExam = Boolean(
    input.importedExam && input.importedExam.examText.trim() && input.importedExam.correctionText.trim(),
  );
  if (!usingPageExercises && !usingImportedExam && (input.numQuestions < 1 || input.numQuestions > 20)) {
    throw new GenerationError("عدد الأسئلة يجب أن يكون بين 1 و20");
  }
  if (usingPageExercises && input.pageExercises!.length > 20) {
    throw new GenerationError("عدد التمارين يجب ألا يتجاوز 20");
  }

  let document = null;
  if (input.documentId) {
    document = findDocument(input.documentId, input.teacherId);
    if (!document) throw new GenerationError("وثيقة المنهج غير موجودة");
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Normalized metadata stored on the request record either way — in the
  // page-exercises/imported-exam modes, numQuestions/topics/difficultyMix
  // are derived rather than whatever the client happened to send.
  const effectiveNumQuestions = usingPageExercises
    ? input.pageExercises!.length
    : usingImportedExam
      ? 0 // unknown until after extraction; corrected below once questions exist
      : input.numQuestions;
  const effectiveTopics = usingPageExercises
    ? [input.topics[0]?.trim() || "تمارين من الوثيقة المرفوعة"]
    : usingImportedExam
      ? [input.topics[0]?.trim() || "امتحان مستورد (تصحيح مباشر)"]
      : input.topics;
  const effectiveDifficultyMix = usingPageExercises || usingImportedExam ? "متوازن" : input.difficultyMix;

  let steps, questions;
  try {
    if (usingPageExercises) {
      ({ steps, questions } = await runGivenExercisesPipeline({
        subjectId: input.subjectId,
        examTitle: input.examTitle,
        gradeLevel: input.gradeLevel,
        topic: input.topics[0]?.trim() || "تمارين من الوثيقة المرفوعة",
        exercises: input.pageExercises!,
      }));
    } else if (usingImportedExam) {
      ({ steps, questions } = await runExamImportPipeline({
        subjectId: input.subjectId,
        examTitle: input.examTitle,
        gradeLevel: input.gradeLevel,
        topic: input.topics[0]?.trim() || "امتحان مستورد (تصحيح مباشر)",
        examText: input.importedExam!.examText,
        correctionText: input.importedExam!.correctionText,
      }));
    } else {
      ({ steps, questions } = await runAgentPipeline(input.subjectId, {
        examTitle: input.examTitle,
        gradeLevel: input.gradeLevel,
        topics: input.topics,
        numQuestions: input.numQuestions,
        difficultyMix: input.difficultyMix,
        document,
      }));
    }
  } catch (err) {
    // A real generation failure (Claude configured but the call failed) is
    // persisted as a failed request with the real reason — never silently
    // swapped for demo content and reported as success.
    const failed: GenerationRequest = {
      id: requestId,
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      documentId: input.documentId,
      examTitle: input.examTitle,
      gradeLevel: input.gradeLevel,
      topics: effectiveTopics,
      numQuestions: effectiveNumQuestions,
      difficultyMix: effectiveDifficultyMix,
      status: "failed",
      failureReason: err instanceof Error ? err.message : "خطأ غير معروف أثناء توليد الامتحان",
      steps: [],
      questions: [],
      rubricVersion: 1,
      review: emptyExamReview(),
      files: {},
      createdAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      approvedRubricVersion: null,
      approvedAt: null,
    };
    insertRequest(failed);
    return failed;
  }

  const request: GenerationRequest = {
    id: requestId,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
    documentId: input.documentId,
    examTitle: input.examTitle,
    gradeLevel: input.gradeLevel,
    topics: effectiveTopics,
    numQuestions: usingImportedExam ? questions.length : effectiveNumQuestions,
    difficultyMix: effectiveDifficultyMix,
    status: "done",
    failureReason: null,
    steps,
    questions,
    rubricVersion: 1,
    review: emptyExamReview(),
    files: {},
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    approvedRubricVersion: null,
    approvedAt: null,
  };

  const outDir = path.join(GENERATED_DIR, input.teacherId, requestId);
  fs.mkdirSync(outDir, { recursive: true });

  const [examBuf, solutionBuf, rubricBuf] = await Promise.all([
    buildExamDocx(request),
    buildSolutionDocx(request),
    buildRubricDocx(request),
  ]);

  const examPath = path.join(outDir, "exam.docx");
  const solutionPath = path.join(outDir, "solution.docx");
  const rubricPath = path.join(outDir, "rubric.docx");
  fs.writeFileSync(examPath, examBuf);
  fs.writeFileSync(solutionPath, solutionBuf);
  fs.writeFileSync(rubricPath, rubricBuf);

  request.files = { examDocx: examPath, solutionDocx: solutionPath, rubricDocx: rubricPath };

  insertRequest(request);

  if (isGeminiConfigured()) {
    enqueue({
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "review_exam_gemini",
      idempotencyKey: `review_exam_gemini:${requestId}`,
      payload: { requestId, teacherId: input.teacherId },
    });
  }

  return request;
}

async function handleExamReviewJob(
  payload: Record<string, unknown>,
  job: { attempts: number; maxAttempts: number },
): Promise<Record<string, unknown>> {
  const requestId = String(payload.requestId);
  const teacherId = String(payload.teacherId);
  const isLastAttempt = job.attempts >= job.maxAttempts;

  const request = findRequest(requestId, teacherId);
  if (!request) throw new Error("الامتحان غير موجود");

  updateRequestReview(requestId, { ...request.review, status: "reviewing" });

  const document = request.documentId ? findDocument(request.documentId, teacherId) : null;
  const curriculumExcerpt =
    document?.extractionStatus === "extracted" ? document.extractedText.slice(0, MAX_CURRICULUM_CHARS_IN_PROMPT) : undefined;

  try {
    const result = await reviewExamWithGemini({
      gradeLevel: request.gradeLevel,
      curriculumExcerpt,
      questions: request.questions,
    });
    updateRequestReview(requestId, {
      status: "reviewed",
      reviewedAt: new Date().toISOString(),
      model: result.model,
      failureReason: null,
      independentSolutions: result.independentSolutions,
      issues: result.issues,
    });
    return { ok: true };
  } catch (err) {
    const failureReason = err instanceof GeminiReviewError || err instanceof Error ? err.message : "فشلت المراجعة لسبب غير معروف";
    if (isLastAttempt) {
      updateRequestReview(requestId, { ...request.review, status: "failed", failureReason });
    }
    throw err instanceof Error ? err : new Error(failureReason);
  }
}

export function registerExamReviewJobHandler(): void {
  registerJobHandler("review_exam_gemini", handleExamReviewJob);
}

export async function getGenerationForTeacher(teacherId: string, requestId: string): Promise<GenerationRequest | null> {
  return findRequest(requestId, teacherId);
}

export async function listGenerationsForTeacher(teacherId: string, subjectId: SubjectId): Promise<GenerationRequest[]> {
  return listRequests(teacherId, subjectId);
}

export interface EditedCriterionInput {
  // Omitted/unknown id = a newly added criterion; an id matching an existing
  // one on that question keeps it (and whatever grading history references
  // it); any existing id simply left out of the edit is dropped.
  id?: string | null;
  criterion: string;
  points: number;
}

export interface EditedQuestionInput {
  // Required and must match an existing question's id — this version of the
  // editor changes wording/points/rubric on the existing question set, not
  // the number of questions (see DELIVERY_SUMMARY.md for the scope note).
  id: string;
  topic: string;
  difficulty: GeneratedQuestion["difficulty"];
  prompt: string;
  solution: string;
  points: number;
  rubric: EditedCriterionInput[];
}

const VALID_DIFFICULTIES: GeneratedQuestion["difficulty"][] = ["سهل", "متوسط", "صعب"];

// Validates a teacher's edit against the exam's *current* questions (for id
// matching only — the returned list fully replaces them) and normalizes it
// into stable GeneratedQuestion[]: existing ids are preserved exactly,
// new criteria get a fresh `${questionId}_c${n}` id that never collides with
// one already used on that question. Throws GenerationError with an Arabic
// message describing the first problem found; never partially applies.
function validateAndNormalizeEditedQuestions(
  original: GeneratedQuestion[],
  edited: EditedQuestionInput[],
): GeneratedQuestion[] {
  if (edited.length !== original.length) {
    throw new GenerationError("لا يمكن حاليًا إضافة أو حذف أسئلة كاملة من هذا المحرر — فقط تعديل الموجود");
  }
  const originalById = new Map(original.map((q) => [q.id, q]));

  const normalized: GeneratedQuestion[] = edited.map((q) => {
    if (typeof q?.id !== "string") throw new GenerationError("بيانات سؤال غير صالحة");
    const originalQuestion = originalById.get(q.id);
    if (!originalQuestion) throw new GenerationError("سؤال غير معروف ضمن التعديل — أعد تحميل الصفحة وحاول مجددًا");
    if (typeof q.prompt !== "string" || !q.prompt.trim()) throw new GenerationError("نص السؤال لا يمكن أن يكون فارغًا");
    if (typeof q.solution !== "string" || !q.solution.trim())
      throw new GenerationError("الحل النموذجي لا يمكن أن يكون فارغًا");
    if (!VALID_DIFFICULTIES.includes(q.difficulty)) throw new GenerationError("مستوى صعوبة غير صالح");
    if (typeof q.points !== "number" || !Number.isFinite(q.points) || !(q.points > 0)) {
      throw new GenerationError("نقاط السؤال يجب أن تكون رقمًا أكبر من صفر");
    }
    if (!Array.isArray(q.rubric) || q.rubric.length === 0) {
      throw new GenerationError("كل سؤال يحتاج معيارًا واحدًا على الأقل في سلم التنقيط");
    }

    const existingCriteriaIds = new Set(originalQuestion.rubric.map((c) => c.id));
    let nextSuffix =
      originalQuestion.rubric.reduce((max, c) => {
        const match = /_c(\d+)$/.exec(c.id);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;

    const rubric: RubricCriterion[] = q.rubric.map((c) => {
      if (typeof c?.criterion !== "string" || !c.criterion.trim()) {
        throw new GenerationError("نص معيار التصحيح لا يمكن أن يكون فارغًا");
      }
      if (typeof c.points !== "number" || !Number.isFinite(c.points) || !(c.points > 0)) {
        throw new GenerationError("نقاط كل معيار يجب أن تكون رقمًا أكبر من صفر");
      }
      const keepsExistingId = typeof c.id === "string" && existingCriteriaIds.has(c.id);
      const id = keepsExistingId ? c.id! : `${q.id}_c${nextSuffix++}`;
      return { id, criterion: c.criterion.trim(), points: c.points };
    });

    const criteriaSumUnits = rubric.reduce((sum, c) => sum + toHundredths(c.points), 0);
    if (criteriaSumUnits !== toHundredths(q.points)) {
      throw new GenerationError(
        `مجموع نقاط معايير السؤال "${q.prompt.slice(0, 20)}..." (${rubric.reduce((s, c) => s + c.points, 0)}) لا يساوي نقاط السؤال (${q.points})`,
      );
    }

    return {
      id: q.id,
      topic: typeof q.topic === "string" && q.topic.trim() ? q.topic.trim() : originalQuestion.topic,
      difficulty: q.difficulty,
      points: q.points,
      prompt: q.prompt.trim(),
      solution: q.solution.trim(),
      rubric,
    };
  });

  // The expected total is the exam's own original total (not a hardcoded
  // 20) — this generalizes correctly to an imported exam whose source
  // document may total any number of points, while still catching an edit
  // that silently changes the exam's overall weight.
  const originalTotalUnits = original.reduce((sum, q) => sum + toHundredths(q.points), 0);
  const totalUnits = normalized.reduce((sum, q) => sum + toHundredths(q.points), 0);
  if (totalUnits !== originalTotalUnits) {
    throw new GenerationError(
      `مجموع نقاط الامتحان يجب أن يبقى ${original.reduce((s, q) => s + q.points, 0)} بالضبط كما كان (المجموع الحالي: ${normalized.reduce((s, q) => s + q.points, 0)})`,
    );
  }

  return normalized;
}

export async function updateExamQuestions(
  teacherId: string,
  requestId: string,
  edited: EditedQuestionInput[],
): Promise<GenerationRequest> {
  const request = findRequest(requestId, teacherId);
  if (!request) throw new GenerationError("الامتحان غير موجود");
  if (request.status !== "done") throw new GenerationError("لا يمكن تعديل امتحان لم يكتمل توليده بنجاح");

  const normalizedQuestions = validateAndNormalizeEditedQuestions(request.questions, edited);
  const newRubricVersion = request.rubricVersion + 1;
  updateRequestQuestions(requestId, normalizedQuestions, newRubricVersion);

  const updated: GenerationRequest = { ...request, questions: normalizedQuestions, rubricVersion: newRubricVersion };

  // Keep the downloadable Word files in sync with the edit — same paths,
  // regenerated contents, so a teacher who already shared a download link
  // doesn't need to know a new path exists.
  if (request.files.examDocx && request.files.solutionDocx && request.files.rubricDocx) {
    const [examBuf, solutionBuf, rubricBuf] = await Promise.all([
      buildExamDocx(updated),
      buildSolutionDocx(updated),
      buildRubricDocx(updated),
    ]);
    fs.writeFileSync(request.files.examDocx, examBuf);
    fs.writeFileSync(request.files.solutionDocx, solutionBuf);
    fs.writeFileSync(request.files.rubricDocx, rubricBuf);
  }

  return updated;
}

// Explicit teacher approval of THIS rubric version's questions, solutions
// and grading criteria — required before any new grading session can be
// started against this exam (see isExamApproved / createGradingSession).
// This is a deliberate human checkpoint: an independent model's review
// (Gemini, in ExamReview) can surface issues to help the teacher decide, but
// it never grants approval itself — only the teacher clicking "اعتماد" does.
export async function approveGeneration(teacherId: string, requestId: string): Promise<GenerationRequest> {
  const request = findRequest(requestId, teacherId);
  if (!request) throw new GenerationError("الامتحان غير موجود");
  if (request.status !== "done") throw new GenerationError("لا يمكن اعتماد امتحان لم يكتمل توليده بنجاح");

  // Defense in depth: every generation/edit path already enforces exact
  // points arithmetic as it writes (scaleRubricToBudget, or
  // validateAndNormalizeEditedQuestions's own check), so this should never
  // actually fire — but approval is the one irreversible-feeling gate before
  // real student grading, so it re-verifies independently rather than
  // trusting that no future code path ever regresses this.
  const structural = computeStructuralReview(request);
  if (!structural.passed) {
    const failed = structural.checks.filter((c) => !c.passed).map((c) => c.label);
    throw new GenerationError(`لا يمكن اعتماد الامتحان — فشل الفحص الهيكلي الآلي: ${failed.join("؛ ")}`);
  }

  const ok = approveGenerationRequest(requestId, teacherId, request.rubricVersion);
  if (!ok) {
    throw new GenerationError(
      "تغيّر الامتحان منذ آخر مرة فتحته — أعد تحميل الصفحة وراجع النسخة الحالية قبل الاعتماد",
    );
  }

  return { ...request, approvedRubricVersion: request.rubricVersion, approvedAt: new Date().toISOString() };
}
