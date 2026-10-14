import fs from "node:fs";
import path from "node:path";
import {
  PAPERS_DIR,
  approveStudentPaper,
  findGradingSession,
  findRequest,
  findStudentPaper,
  insertGradingSession,
  insertStudentPaper,
  listGradingSessions,
  listStudentPapers,
  updateStudentPaperGraded,
} from "./db";
import { gradeStudentPaper, GradingAgentError } from "./agents/gradingAgent";
import type { GradingSession, QuestionGradeResult, StudentPaper } from "./types";

export class GradingError extends Error {}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png"]);
export const MAX_PAPER_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per page
const MAX_PAGES_PER_PAPER = 6;

export async function createGradingSession(
  teacherId: string,
  examRequestId: string,
  title: string,
): Promise<GradingSession> {
  const exam = findRequest(examRequestId, teacherId);
  if (!exam) throw new GradingError("الامتحان المرتبط غير موجود");
  if (exam.questions.length === 0) throw new GradingError("هذا الامتحان لا يحتوي على أسئلة لتصحيحها");

  const session: GradingSession = {
    id: `grd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId,
    examRequestId,
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

export async function submitStudentPaper(
  teacherId: string,
  sessionId: string,
  studentName: string,
  files: File[],
): Promise<StudentPaper> {
  const session = findGradingSession(sessionId, teacherId);
  if (!session) throw new GradingError("جلسة التصحيح غير موجودة");
  if (!studentName.trim()) throw new GradingError("اسم التلميذ مطلوب");
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

  const paperId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const paperDir = path.join(PAPERS_DIR, teacherId, paperId);
  fs.mkdirSync(paperDir, { recursive: true });

  const imagePaths: string[] = [];
  const imageMimeTypes: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.type === "image/png" ? "png" : "jpg";
    const imagePath = path.join(paperDir, `page-${i + 1}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(imagePath, buffer);
    imagePaths.push(imagePath);
    imageMimeTypes.push(file.type);
  }

  const paper: StudentPaper = {
    id: paperId,
    sessionId,
    teacherId,
    studentName: studentName.trim(),
    imagePaths,
    status: "grading",
    failureReason: null,
    questionResults: [],
    draftTotal: null,
    approvedTotal: null,
    createdAt: new Date().toISOString(),
    gradedAt: null,
    approvedAt: null,
  };
  insertStudentPaper(paper);

  const exam = findRequest(session.examRequestId, teacherId);
  if (!exam) {
    updateStudentPaperGraded(paperId, {
      status: "failed",
      questionResults: [],
      draftTotal: null,
      failureReason: "الامتحان المرتبط بجلسة التصحيح لم يعد موجودًا",
    });
    return { ...paper, status: "failed", failureReason: "الامتحان المرتبط بجلسة التصحيح لم يعد موجودًا" };
  }

  try {
    const questionResults = await gradeStudentPaper({
      examTitle: exam.examTitle,
      gradeLevel: exam.gradeLevel,
      studentName: paper.studentName,
      questions: exam.questions,
      imagePaths,
      imageMimeTypes,
    });
    const draftTotal = Math.round(questionResults.reduce((s, q) => s + q.awardedPoints, 0) * 10) / 10;
    updateStudentPaperGraded(paperId, { status: "graded", questionResults, draftTotal, failureReason: null });
    return { ...paper, status: "graded", questionResults, draftTotal };
  } catch (err) {
    const failureReason =
      err instanceof GradingAgentError || err instanceof Error ? err.message : "خطأ غير معروف أثناء التصحيح";
    updateStudentPaperGraded(paperId, { status: "failed", questionResults: [], draftTotal: null, failureReason });
    return { ...paper, status: "failed", failureReason };
  }
}

export function approvePaperGrade(
  paperId: string,
  teacherId: string,
  approvedTotal: number,
  questionResults?: QuestionGradeResult[],
): StudentPaper {
  const paper = findStudentPaper(paperId, teacherId);
  if (!paper) throw new GradingError("الورقة غير موجودة");
  const finalResults = questionResults ?? paper.questionResults;
  approveStudentPaper(paperId, approvedTotal, finalResults);
  return { ...paper, status: "approved", approvedTotal, questionResults: finalResults };
}
