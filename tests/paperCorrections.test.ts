// Covers the "never give an unreadable answer a silent zero" follow-up
// requirement: the teacher must be able to either re-upload a better photo
// of the answer, or type out what the student actually wrote, and have the
// paper re-graded from that — instead of being stuck with a bad AI reading
// forever. No network calls: grading itself is not exercised here (that's
// covered by the grading-integration/gradingUsageRelease suites) — this
// tests the DB/file-level mechanics of replacePaperImages and
// correctPaperTranscription directly.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-paper-corrections-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let insertRequest: typeof import("../src/lib/db").insertRequest;
let insertGradingSession: typeof import("../src/lib/db").insertGradingSession;
let insertStudentPaper: typeof import("../src/lib/db").insertStudentPaper;
let PAPERS_DIR: typeof import("../src/lib/db").PAPERS_DIR;
let replacePaperImages: typeof import("../src/lib/grading").replacePaperImages;
let correctPaperTranscription: typeof import("../src/lib/grading").correctPaperTranscription;
let getStudentPaper: typeof import("../src/lib/grading").getStudentPaper;
let GradingError: typeof import("../src/lib/grading").GradingError;
let emptyExamReview: typeof import("../src/lib/types").emptyExamReview;

before(async () => {
  const db = await import("../src/lib/db");
  const grading = await import("../src/lib/grading");
  const types = await import("../src/lib/types");
  insertTeacher = db.insertTeacher;
  insertRequest = db.insertRequest;
  insertGradingSession = db.insertGradingSession;
  insertStudentPaper = db.insertStudentPaper;
  PAPERS_DIR = db.PAPERS_DIR;
  replacePaperImages = grading.replacePaperImages;
  correctPaperTranscription = grading.correctPaperTranscription;
  getStudentPaper = grading.getStudentPaper;
  GradingError = grading.GradingError;
  emptyExamReview = types.emptyExamReview;
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

async function makeTinyJpegFile(name: string): Promise<File> {
  const buffer = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/jpeg" });
}

function makeGradedPaper(id: string, sessionId: string, teacherId: string, imagePaths: string[]) {
  return {
    id,
    sessionId,
    teacherId,
    studentName: "تلميذ تجريبي",
    imagePaths,
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
        claudeTranscription: "نص غير مقروء بوضوح",
        claudeFeedback: "",
        geminiTranscription: "",
        geminiFeedback: "",
        criteriaResults: [
          {
            criterionId: "q1_c1",
            criterion: "معيار وحيد",
            maxPoints: 5,
            claudeAwardedPoints: null,
            claudeNote: "unreadable",
            geminiAwardedPoints: null,
            geminiNote: "",
            status: "unreadable" as const,
            finalAwardedPoints: null,
            teacherOverride: false,
            overrideReason: null,
          },
        ],
        awardedPoints: null,
        suspiciousNote: null,
      },
    ],
    needsReview: true,
    draftTotal: null,
    approvedTotal: null,
    overrideHistory: [],
    teacherCorrectedTranscriptions: [],
    createdAt: new Date().toISOString(),
    gradedAt: new Date().toISOString(),
    approvedAt: null,
  };
}

test("replacePaperImages writes new images, drops unused old ones, and re-enqueues grading", async () => {
  const teacherId = "t_img_replace";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam1", teacherId));
  insertGradingSession({
    id: "sess1",
    teacherId,
    examRequestId: "exam1",
    examVersion: 1,
    title: "جلسة",
    createdAt: new Date().toISOString(),
  });

  const paperDir = path.join(PAPERS_DIR, teacherId, "paper1");
  fs.mkdirSync(paperDir, { recursive: true });
  const oldPage1 = path.join(paperDir, "page-1.jpg");
  const oldPage2 = path.join(paperDir, "page-2.jpg");
  fs.writeFileSync(oldPage1, "old-page-1");
  fs.writeFileSync(oldPage2, "old-page-2");

  insertStudentPaper(makeGradedPaper("paper1", "sess1", teacherId, [oldPage1, oldPage2]));

  const newFile = await makeTinyJpegFile("replacement.jpg");
  const updated = await replacePaperImages(teacherId, "paper1", [newFile]);

  assert.equal(updated.imagePaths.length, 1);
  assert.equal(updated.imagePaths[0], oldPage1, "re-uses the same page-N.jpg naming convention");
  assert.ok(fs.existsSync(oldPage1), "page-1.jpg is overwritten, not removed");
  assert.equal(fs.existsSync(oldPage2), false, "the now-unused page-2.jpg is cleaned up");

  assert.equal(updated.status, "grading");
  assert.equal(updated.questionResults.length, 0, "stale grading results are cleared for the re-grade");
});

test("replacePaperImages refuses to touch an approved paper", async () => {
  const teacherId = "t_img_approved";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam2", teacherId));
  insertGradingSession({
    id: "sess2",
    teacherId,
    examRequestId: "exam2",
    examVersion: 1,
    title: "جلسة",
    createdAt: new Date().toISOString(),
  });
  insertStudentPaper({ ...makeGradedPaper("paper2", "sess2", teacherId, []), status: "approved" });

  const newFile = await makeTinyJpegFile("x.jpg");
  await assert.rejects(() => replacePaperImages(teacherId, "paper2", [newFile]), GradingError);
});

test("correctPaperTranscription records the correction and triggers a re-grade", async () => {
  const teacherId = "t_correct_text";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam3", teacherId));
  insertGradingSession({
    id: "sess3",
    teacherId,
    examRequestId: "exam3",
    examVersion: 1,
    title: "جلسة",
    createdAt: new Date().toISOString(),
  });
  insertStudentPaper(makeGradedPaper("paper3", "sess3", teacherId, []));

  const updated = correctPaperTranscription(teacherId, "paper3", "q1", "الجواب الصحيح الذي كتبه التلميذ فعلًا");
  assert.equal(updated.status, "grading");
  assert.equal(updated.teacherCorrectedTranscriptions.length, 1);
  assert.equal(updated.teacherCorrectedTranscriptions[0].questionId, "q1");
  assert.equal(updated.teacherCorrectedTranscriptions[0].text, "الجواب الصحيح الذي كتبه التلميذ فعلًا");

  // Correcting the same question again replaces the old correction instead of duplicating it.
  const updatedAgain = correctPaperTranscription(teacherId, "paper3", "q1", "تصحيح ثانٍ أدق");
  assert.equal(updatedAgain.teacherCorrectedTranscriptions.length, 1);
  assert.equal(updatedAgain.teacherCorrectedTranscriptions[0].text, "تصحيح ثانٍ أدق");
});

test("correctPaperTranscription rejects an empty correction, an unknown question, and an approved paper", async () => {
  const teacherId = "t_correct_errors";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam4", teacherId));
  insertGradingSession({
    id: "sess4",
    teacherId,
    examRequestId: "exam4",
    examVersion: 1,
    title: "جلسة",
    createdAt: new Date().toISOString(),
  });
  insertStudentPaper(makeGradedPaper("paper4", "sess4", teacherId, []));

  assert.throws(() => correctPaperTranscription(teacherId, "paper4", "q1", "   "), GradingError);
  assert.throws(() => correctPaperTranscription(teacherId, "paper4", "no_such_question", "نص"), GradingError);

  insertStudentPaper({ ...makeGradedPaper("paper5", "sess4", teacherId, []), status: "approved" });
  assert.throws(() => correctPaperTranscription(teacherId, "paper5", "q1", "نص"), GradingError);
});
