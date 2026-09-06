import fs from "node:fs";
import path from "node:path";
import { GENERATED_DIR, withDb } from "./db";
import { runMathAgentPipeline } from "./agents/pipeline";
import { buildExamDocx } from "./docx/buildExamDocx";
import { buildSolutionDocx } from "./docx/buildSolutionDocx";
import { buildRubricDocx } from "./docx/buildRubricDocx";
import type { GenerationRequest, SubjectId } from "./types";

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

  const document = await withDb((db) => {
    if (!input.documentId) return null;
    const doc = db.documents.find((d) => d.id === input.documentId && d.teacherId === input.teacherId);
    if (!doc) throw new GenerationError("وثيقة المنهج غير موجودة");
    return doc;
  });

  const { steps, questions } = runMathAgentPipeline({
    examTitle: input.examTitle,
    gradeLevel: input.gradeLevel,
    topics: input.topics,
    numQuestions: input.numQuestions,
    difficultyMix: input.difficultyMix,
    document,
  });

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    steps,
    questions,
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

  await withDb((db) => {
    db.requests.push(request);
  });

  return request;
}

export async function getGenerationForTeacher(teacherId: string, requestId: string): Promise<GenerationRequest | null> {
  return withDb((db) => db.requests.find((r) => r.id === requestId && r.teacherId === teacherId) ?? null);
}

export async function listGenerationsForTeacher(teacherId: string, subjectId: SubjectId): Promise<GenerationRequest[]> {
  return withDb((db) =>
    db.requests
      .filter((r) => r.teacherId === teacherId && r.subjectId === subjectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
