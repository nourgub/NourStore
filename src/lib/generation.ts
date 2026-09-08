import fs from "node:fs";
import path from "node:path";
import { GENERATED_DIR, findDocument, findRequest, insertRequest, listRequests } from "./db";
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

  let document = null;
  if (input.documentId) {
    document = findDocument(input.documentId, input.teacherId);
    if (!document) throw new GenerationError("وثيقة المنهج غير موجودة");
  }

  const { steps, questions } = await runMathAgentPipeline({
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

  insertRequest(request);

  return request;
}

export async function getGenerationForTeacher(teacherId: string, requestId: string): Promise<GenerationRequest | null> {
  return findRequest(requestId, teacherId);
}

export async function listGenerationsForTeacher(teacherId: string, subjectId: SubjectId): Promise<GenerationRequest[]> {
  return listRequests(teacherId, subjectId);
}
