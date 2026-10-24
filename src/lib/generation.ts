import fs from "node:fs";
import path from "node:path";
import { GENERATED_DIR, findDocument, findRequest, insertRequest, listRequests, updateRequestReview } from "./db";
import { runAgentPipeline } from "./agents/pipeline";
import { buildExamDocx } from "./docx/buildExamDocx";
import { buildSolutionDocx } from "./docx/buildSolutionDocx";
import { buildRubricDocx } from "./docx/buildRubricDocx";
import { emptyExamReview } from "./types";
import type { GenerationRequest, SubjectId } from "./types";
import { enqueue, registerJobHandler } from "./jobs";
import { isGeminiConfigured, reviewExamWithGemini, GeminiReviewError } from "./agents/geminiExamReviewAgent";

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
}

export class GenerationError extends Error {}

export async function createGeneration(input: CreateGenerationInput): Promise<GenerationRequest> {
  if (!input.examTitle.trim()) throw new GenerationError("عنوان الامتحان مطلوب");
  if (input.numQuestions < 1 || input.numQuestions > 20) {
    throw new GenerationError("عدد الأسئلة يجب أن يكون بين 1 و20");
  }

  let document = null;
  if (input.documentId) {
    document = findDocument(input.documentId, input.teacherId);
    if (!document) throw new GenerationError("وثيقة المنهج غير موجودة");
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let steps, questions;
  try {
    ({ steps, questions } = await runAgentPipeline(input.subjectId, {
      examTitle: input.examTitle,
      gradeLevel: input.gradeLevel,
      topics: input.topics,
      numQuestions: input.numQuestions,
      difficultyMix: input.difficultyMix,
      document,
    }));
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
      topics: input.topics,
      numQuestions: input.numQuestions,
      difficultyMix: input.difficultyMix,
      status: "failed",
      failureReason: err instanceof Error ? err.message : "خطأ غير معروف أثناء توليد الامتحان",
      steps: [],
      questions: [],
      rubricVersion: 1,
      review: emptyExamReview(),
      files: {},
      createdAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
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
    topics: input.topics,
    numQuestions: input.numQuestions,
    difficultyMix: input.difficultyMix,
    status: "done",
    failureReason: null,
    steps,
    questions,
    rubricVersion: 1,
    review: emptyExamReview(),
    files: {},
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
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
