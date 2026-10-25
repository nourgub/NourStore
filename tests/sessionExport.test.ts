// Pure unit tests for buildSessionResultsCsv — no DB, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSessionResultsCsv } from "../src/lib/sessionExport";
import type { GeneratedQuestion, StudentPaper } from "../src/lib/types";

const QUESTIONS: GeneratedQuestion[] = [
  { id: "q1", topic: "الدوال", difficulty: "متوسط", points: 10, prompt: "س1", solution: "ح1", rubric: [] },
  { id: "q2", topic: "الهندسة", difficulty: "سهل", points: 10, prompt: "س2", solution: "ح2", rubric: [] },
];

function makePaper(id: string, studentName: string, status: StudentPaper["status"], q1: number | null, q2: number | null): StudentPaper {
  const total = q1 !== null && q2 !== null ? q1 + q2 : null;
  return {
    id,
    sessionId: "sess1",
    teacherId: "t1",
    studentName,
    imagePaths: [],
    status,
    failureReason: status === "failed" ? "سبب الفشل" : null,
    examVersion: 1,
    claudeModel: null,
    geminiReviewStatus: "not_configured",
    geminiModel: null,
    geminiFailureReason: null,
    questionResults: [
      {
        questionId: "q1",
        topic: "الدوال",
        maxPoints: 10,
        claudeTranscription: "",
        claudeFeedback: "",
        geminiTranscription: "",
        geminiFeedback: "",
        criteriaResults: [],
        awardedPoints: q1,
        suspiciousNote: null,
      },
      {
        questionId: "q2",
        topic: "الهندسة",
        maxPoints: 10,
        claudeTranscription: "",
        claudeFeedback: "",
        geminiTranscription: "",
        geminiFeedback: "",
        criteriaResults: [],
        awardedPoints: q2,
        suspiciousNote: null,
      },
    ],
    needsReview: false,
    draftTotal: total,
    approvedTotal: status === "approved" ? total : null,
    overrideHistory: [],
    teacherCorrectedTranscriptions: [],
    createdAt: new Date().toISOString(),
    gradedAt: new Date().toISOString(),
    approvedAt: status === "approved" ? new Date().toISOString() : null,
  };
}

test("builds a header row with one column per question plus total and status", () => {
  const csv = buildSessionResultsCsv([], QUESTIONS);
  const [header] = csv.split("\r\n");
  assert.equal(header, "اسم التلميذ,سؤال 1 (10),سؤال 2 (10),المجموع,الحالة");
});

test("an approved paper reports its approvedTotal and a clear approved label", () => {
  const csv = buildSessionResultsCsv([makePaper("p1", "سارة", "approved", 8, 9)], QUESTIONS);
  const rows = csv.split("\r\n");
  assert.equal(rows[1], "سارة,8,9,17,معتمدة");
});

test("a graded-but-unapproved paper is labeled as a draft, never silently presented as final", () => {
  const csv = buildSessionResultsCsv([makePaper("p1", "ياسين", "graded", 5, 5)], QUESTIONS);
  const rows = csv.split("\r\n");
  assert.equal(rows[1], "ياسين,5,5,10,مسودة (غير معتمدة)");
});

test("a failed paper reports blank scores and a failure label, not a zero", () => {
  const csv = buildSessionResultsCsv([makePaper("p1", "أمين", "failed", null, null)], QUESTIONS);
  const rows = csv.split("\r\n");
  assert.equal(rows[1], "أمين,,,,فشل التصحيح");
});

test("a student name containing a comma is safely quoted", () => {
  const csv = buildSessionResultsCsv([makePaper("p1", "محمد, الأمين", "approved", 10, 10)], QUESTIONS);
  const rows = csv.split("\r\n");
  assert.equal(rows[1], '"محمد, الأمين",10,10,20,معتمدة');
});
