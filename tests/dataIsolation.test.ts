// Mandatory acceptance criterion: "a teacher cannot read or edit another
// teacher's files." Exam/paper isolation at the service layer is already
// exercised incidentally by grading-integration.test.ts and
// examApproval.test.ts; this file consolidates the remaining untested
// surfaces explicitly — lesson prep, grading session listing, and the two
// newest paper-correction actions (replacePaperImages,
// correctPaperTranscription) — so the guarantee is checked directly rather
// than only implied by other tests' setup.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-isolation-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let insertRequest: typeof import("../src/lib/db").insertRequest;
let insertGradingSession: typeof import("../src/lib/db").insertGradingSession;
let insertStudentPaper: typeof import("../src/lib/db").insertStudentPaper;
let insertLessonPrep: typeof import("../src/lib/db").insertLessonPrep;
let getLessonPrep: typeof import("../src/lib/lessonPrep").getLessonPrep;
let getGradingSession: typeof import("../src/lib/grading").getGradingSession;
let getPapersForSession: typeof import("../src/lib/grading").getPapersForSession;
let getStudentPaper: typeof import("../src/lib/grading").getStudentPaper;
let replacePaperImages: typeof import("../src/lib/grading").replacePaperImages;
let correctPaperTranscription: typeof import("../src/lib/grading").correctPaperTranscription;
let retryPaperGrading: typeof import("../src/lib/grading").retryPaperGrading;
let approvePaperGrade: typeof import("../src/lib/grading").approvePaperGrade;
let GradingError: typeof import("../src/lib/grading").GradingError;
let emptyExamReview: typeof import("../src/lib/types").emptyExamReview;

before(async () => {
  const db = await import("../src/lib/db");
  const lessonPrep = await import("../src/lib/lessonPrep");
  const grading = await import("../src/lib/grading");
  const types = await import("../src/lib/types");
  insertTeacher = db.insertTeacher;
  insertRequest = db.insertRequest;
  insertGradingSession = db.insertGradingSession;
  insertStudentPaper = db.insertStudentPaper;
  insertLessonPrep = db.insertLessonPrep;
  getLessonPrep = lessonPrep.getLessonPrep;
  getGradingSession = grading.getGradingSession;
  getPapersForSession = grading.getPapersForSession;
  getStudentPaper = grading.getStudentPaper;
  replacePaperImages = grading.replacePaperImages;
  correctPaperTranscription = grading.correctPaperTranscription;
  retryPaperGrading = grading.retryPaperGrading;
  approvePaperGrade = grading.approvePaperGrade;
  GradingError = grading.GradingError;
  emptyExamReview = types.emptyExamReview;

  insertTeacher(makeTeacher(ownerId));
  insertTeacher(makeTeacher(intruderId));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeTeacher(id: string) {
  return {
    id,
    fullName: "أستاذ تجريبي",
    email: `${id}@test.local`,
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

function makeLessonPrep(id: string, teacherId: string) {
  return {
    id,
    teacherId,
    subjectId: "math" as const,
    mode: "generate" as const,
    lessonTitle: "درس تجريبي",
    gradeLevel: "السنة الأولى ثانوي",
    sourceFileNames: [],
    steps: [],
    templateId: null,
    sections: [{ heading: "مقدمة", body: "نص" }],
    headerValues: [],
    noteValues: [],
    tableColumns: [],
    tableRows: [],
    status: "done" as const,
    failureReason: null,
    fileDocx: null,
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

const ownerId = "t_iso_owner";
const intruderId = "t_iso_intruder";

test("a teacher can never read another teacher's lesson prep", () => {
  insertLessonPrep(makeLessonPrep("lp1", ownerId));
  assert.ok(getLessonPrep("lp1", ownerId), "sanity: the owner can read their own");
  assert.equal(getLessonPrep("lp1", intruderId), null, "an intruder reading by id alone gets nothing");
});

test("a teacher can never list or read another teacher's grading session or its papers", () => {
  insertRequest(makeExam("exam_iso", ownerId));
  insertGradingSession({
    id: "sess_iso",
    teacherId: ownerId,
    examRequestId: "exam_iso",
    examVersion: 1,
    title: "جلسة",
    createdAt: new Date().toISOString(),
  });
  insertStudentPaper(makeGradedPaper("paper_iso", "sess_iso", ownerId));

  assert.ok(getGradingSession("sess_iso", ownerId), "sanity: the owner can read their own session");
  assert.equal(getGradingSession("sess_iso", intruderId), null);
  assert.equal(getPapersForSession("sess_iso", intruderId).length, 0, "an intruder's query returns no papers, not an error leaking existence");
  assert.equal(getStudentPaper("paper_iso", intruderId), null);
});

test("a teacher can never replace images or correct the transcription of another teacher's paper", async () => {
  insertRequest(makeExam("exam_iso2", ownerId));
  insertGradingSession({
    id: "sess_iso2",
    teacherId: ownerId,
    examRequestId: "exam_iso2",
    examVersion: 1,
    title: "جلسة",
    createdAt: new Date().toISOString(),
  });
  insertStudentPaper(makeGradedPaper("paper_iso2", "sess_iso2", ownerId));

  const fakeFile = new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg" });
  await assert.rejects(() => replacePaperImages(intruderId, "paper_iso2", [fakeFile]), GradingError);
  assert.throws(() => correctPaperTranscription(intruderId, "paper_iso2", "q1", "نص"), GradingError);
  assert.throws(() => retryPaperGrading("paper_iso2", intruderId), GradingError);
  assert.throws(() => approvePaperGrade("paper_iso2", intruderId, []), GradingError);
});
