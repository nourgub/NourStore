// Integration tests against a real (but temporary, isolated) SQLite database
// — no network calls, no Claude/Gemini API calls. Covers acceptance criteria
// #3 (reject a criterion point that exceeds its max via the approve path),
// #8 (a teacher can never reach another teacher's paper), and #9 (prevent
// double-approval; teacher overrides are recorded with a reason).
//
// DATA_DIR must be set before the first import of src/lib/db (or anything
// that imports it) — node's test runner gives each test FILE its own
// process, so this is safe without affecting the other test files.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-test-"));
process.env.DATA_DIR = tmpDir;

// tsx compiles this file to CommonJS, which doesn't support top-level
// await — the dynamic imports (needed so DATA_DIR is set before db.ts's
// module-level side effects run) happen in `before()` instead, and tests
// read these module-scope bindings once it has completed.
let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let insertRequest: typeof import("../src/lib/db").insertRequest;
let insertGradingSession: typeof import("../src/lib/db").insertGradingSession;
let insertStudentPaper: typeof import("../src/lib/db").insertStudentPaper;
let approvePaperGrade: typeof import("../src/lib/grading").approvePaperGrade;
let GradingError: typeof import("../src/lib/grading").GradingError;
let emptyExamReview: typeof import("../src/lib/types").emptyExamReview;

function makeExam(id: string, teacherId: string) {
  return {
    id,
    teacherId,
    subjectId: "math" as const,
    documentId: null,
    examTitle: "اختبار تجريبي",
    gradeLevel: "السنة الأولى ثانوي",
    topics: ["الدوال"],
    numQuestions: 1,
    difficultyMix: "متوازن" as const,
    status: "done" as const,
    failureReason: null,
    steps: [],
    questions: [
      {
        id: "q1",
        topic: "الدوال",
        difficulty: "متوسط" as const,
        points: 5,
        prompt: "سؤال",
        solution: "حل",
        rubric: [{ id: "q1_c1", criterion: "معيار وحيد", points: 5 }],
      },
    ],
    rubricVersion: 1,
    review: emptyExamReview(),
    files: {},
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    approvedRubricVersion: 1,
    approvedAt: new Date().toISOString(),
  };
}

function makeTeacher(id: string, email: string) {
  return {
    id,
    fullName: "أستاذ تجريبي",
    email,
    passwordHash: "x",
    passwordSalt: "y",
    subscriptionStatus: "active" as const,
    planId: "full" as const,
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
}

function makeGradedPaper(id: string, sessionId: string, teacherId: string) {
  return {
    id,
    sessionId,
    teacherId,
    studentName: "تلميذ تجريبي",
    imagePaths: [],
    status: "graded" as const,
    failureReason: null,
    examVersion: 1,
    claudeModel: "claude-sonnet-5",
    geminiReviewStatus: "not_configured" as const,
    geminiModel: null,
    geminiFailureReason: null,
    questionResults: [
      {
        questionId: "q1",
        topic: "الدوال",
        maxPoints: 5,
        claudeTranscription: "x = 4",
        claudeFeedback: "جيد",
        geminiTranscription: "",
        geminiFeedback: "",
        criteriaResults: [
          {
            criterionId: "q1_c1",
            criterion: "معيار وحيد",
            maxPoints: 5,
            claudeAwardedPoints: 5,
            claudeNote: "صحيح",
            geminiAwardedPoints: null,
            geminiNote: "",
            status: "not_reviewed" as const,
            finalAwardedPoints: 5,
            teacherOverride: false,
            overrideReason: null,
          },
        ],
        awardedPoints: 5,
        suspiciousNote: null,
      },
    ],
    needsReview: false,
    draftTotal: 5,
    approvedTotal: null,
    overrideHistory: [],
    teacherCorrectedTranscriptions: [],
    createdAt: new Date().toISOString(),
    gradedAt: new Date().toISOString(),
    approvedAt: null,
  };
}

let teacherAId: string;
let teacherBId: string;
let sessionId: string;
let paperId: string;

before(async () => {
  const db = await import("../src/lib/db");
  const grading = await import("../src/lib/grading");
  const types = await import("../src/lib/types");
  insertTeacher = db.insertTeacher;
  insertRequest = db.insertRequest;
  insertGradingSession = db.insertGradingSession;
  insertStudentPaper = db.insertStudentPaper;
  approvePaperGrade = grading.approvePaperGrade;
  GradingError = grading.GradingError;
  emptyExamReview = types.emptyExamReview;

  teacherAId = "t_a";
  teacherBId = "t_b";
  insertTeacher(makeTeacher(teacherAId, "a@test.local"));
  insertTeacher(makeTeacher(teacherBId, "b@test.local"));
  insertRequest(makeExam("exam1", teacherAId));

  sessionId = "sess1";
  insertGradingSession({
    id: sessionId,
    teacherId: teacherAId,
    examRequestId: "exam1",
    examVersion: 1,
    title: "جلسة تجريبية",
    createdAt: new Date().toISOString(),
  });

  paperId = "paper1";
  insertStudentPaper(makeGradedPaper(paperId, sessionId, teacherAId));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("approvePaperGrade rejects an override that exceeds the criterion's max points", () => {
  assert.throws(
    () =>
      approvePaperGrade(paperId, teacherAId, [
        { questionId: "q1", criterionId: "q1_c1", newPoints: 999, reason: "تعديل غير صالح" },
      ]),
    GradingError,
  );
});

test("approvePaperGrade rejects a negative override", () => {
  assert.throws(
    () =>
      approvePaperGrade(paperId, teacherAId, [
        { questionId: "q1", criterionId: "q1_c1", newPoints: -1, reason: "تعديل غير صالح" },
      ]),
    GradingError,
  );
});

test("a teacher can never reach another teacher's paper", () => {
  assert.throws(() => approvePaperGrade(paperId, teacherBId, []), GradingError);
});

test("approvePaperGrade succeeds with a valid override, recomputes the total server-side, and logs the reason", () => {
  const result = approvePaperGrade(paperId, teacherAId, [
    { questionId: "q1", criterionId: "q1_c1", newPoints: 4, reason: "خصم نصف نقطة لخطأ في الوحدة" },
  ]);
  assert.equal(result.status, "approved");
  assert.equal(result.approvedTotal, 4);
  assert.equal(result.overrideHistory.length, 1);
  assert.equal(result.overrideHistory[0].reason, "خصم نصف نقطة لخطأ في الوحدة");
  assert.equal(result.overrideHistory[0].previousPoints, 5);
  assert.equal(result.overrideHistory[0].newPoints, 4);
});

test("approving an already-approved paper is rejected (no double-approval)", () => {
  assert.throws(() => approvePaperGrade(paperId, teacherAId, []), GradingError);
});

test("an unresolved (pending) criterion blocks approval unless covered by an override", () => {
  const pendingPaperId = "paper2";
  insertStudentPaper({
    ...makeGradedPaper(pendingPaperId, sessionId, teacherAId),
    id: pendingPaperId,
    questionResults: [
      {
        ...makeGradedPaper(pendingPaperId, sessionId, teacherAId).questionResults[0],
        awardedPoints: null,
        criteriaResults: [
          {
            criterionId: "q1_c1",
            criterion: "معيار وحيد",
            maxPoints: 5,
            claudeAwardedPoints: null,
            claudeNote: "",
            geminiAwardedPoints: null,
            geminiNote: "",
            status: "unreadable",
            finalAwardedPoints: null,
            teacherOverride: false,
            overrideReason: null,
          },
        ],
      },
    ],
  });

  assert.throws(() => approvePaperGrade(pendingPaperId, teacherAId, []), GradingError);

  // Resolving it with an override + reason should now succeed.
  const result = approvePaperGrade(pendingPaperId, teacherAId, [
    { questionId: "q1", criterionId: "q1_c1", newPoints: 3, reason: "الإجابة مقروءة جزئيًا بعد تكبير الصورة" },
  ]);
  assert.equal(result.status, "approved");
  assert.equal(result.approvedTotal, 3);
});
