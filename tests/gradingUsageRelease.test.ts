// Integration test covering an explicit mandatory acceptance criterion:
// "فشل التصحيح لا يستهلك حصة نهائية" — a grading failure must never
// permanently cost the teacher their quota. submitStudentPaper() reserves a
// usage slot atomically (see usageReservation.test.ts for the reservation
// primitives themselves); this test drives the *real* background job queue
// (src/lib/jobs.ts) through handleClaudeGradeJob's permanent-failure branch
// in src/lib/grading.ts, and checks the slot is actually released once the
// job exhausts its retries — not just that the code calls releaseUsage().
//
// No network call is made: with ANTHROPIC_API_KEY unset, gradeStudentPaper()
// throws synchronously and immediately (see src/lib/agents/gradingAgent.ts),
// which is itself the realistic "grading is not configured" failure mode and
// a safe, fast way to force the same failure path a real API error would take.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-grading-release-test-"));
process.env.DATA_DIR = tmpDir;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GEMINI_API_KEY;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let insertRequest: typeof import("../src/lib/db").insertRequest;
let getUsageCount: typeof import("../src/lib/db").getUsageCount;
let findJobByIdempotencyKey: typeof import("../src/lib/db").findJobByIdempotencyKey;
let createGradingSession: typeof import("../src/lib/grading").createGradingSession;
let submitStudentPaper: typeof import("../src/lib/grading").submitStudentPaper;
let getStudentPaper: typeof import("../src/lib/grading").getStudentPaper;
let registerGradingJobHandlers: typeof import("../src/lib/grading").registerGradingJobHandlers;
let runOneWorkerTick: typeof import("../src/lib/jobs").runOneWorkerTick;
let emptyExamReview: typeof import("../src/lib/types").emptyExamReview;

before(async () => {
  const db = await import("../src/lib/db");
  const grading = await import("../src/lib/grading");
  const jobs = await import("../src/lib/jobs");
  const types = await import("../src/lib/types");
  insertTeacher = db.insertTeacher;
  insertRequest = db.insertRequest;
  getUsageCount = db.getUsageCount;
  findJobByIdempotencyKey = db.findJobByIdempotencyKey;
  createGradingSession = grading.createGradingSession;
  submitStudentPaper = grading.submitStudentPaper;
  getStudentPaper = grading.getStudentPaper;
  registerGradingJobHandlers = grading.registerGradingJobHandlers;
  runOneWorkerTick = jobs.runOneWorkerTick;
  emptyExamReview = types.emptyExamReview;

  registerGradingJobHandlers();
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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
  };
}

async function makeTinyJpegFile(name: string): Promise<File> {
  const buffer = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/jpeg" });
}

test("a student paper that permanently fails grading releases its reserved quota slot", async () => {
  const teacherId = "t_release_e2e";
  const teacher = makeTeacher(teacherId);
  insertTeacher(teacher);
  insertRequest(makeExam("exam_release", teacherId));
  const session = await createGradingSession(teacherId, "exam_release", "جلسة تجريبية");

  const file = await makeTinyJpegFile("page-1.jpg");
  const paper = await submitStudentPaper(teacher, session.id, "تلميذ تجريبي", [file]);

  // The slot is reserved synchronously inside submitStudentPaper, before the
  // background job even starts.
  assert.equal(getUsageCount(teacherId, currentPeriod(), "grading"), 1);
  assert.equal(paper.status, "grading");

  // Drive the real queue through all 3 attempts (default maxAttempts). Each
  // attempt fails fast and synchronously (no ANTHROPIC_API_KEY configured),
  // and failOrRequeueJob puts the job straight back to 'queued' on a
  // non-final attempt, so no lease wait is needed between ticks.
  await runOneWorkerTick();
  const job = findJobByIdempotencyKey(`grade_paper_claude:${paper.id}`);
  assert.ok(job);
  assert.equal(job!.maxAttempts, 3);

  // Quota must stay reserved while retries remain — a transient-looking
  // failure that the queue will retry is not yet a "permanent" failure.
  assert.equal(getUsageCount(teacherId, currentPeriod(), "grading"), 1);
  assert.equal(getStudentPaper(paper.id, teacherId)!.status, "grading");

  await runOneWorkerTick();
  assert.equal(getUsageCount(teacherId, currentPeriod(), "grading"), 1);

  // Third and final attempt: the job is now permanently failed, and the
  // reserved slot must be refunded in the same step.
  await runOneWorkerTick();

  const finalJob = findJobByIdempotencyKey(`grade_paper_claude:${paper.id}`);
  assert.equal(finalJob!.status, "failed");
  assert.equal(finalJob!.attempts, 3);

  const finalPaper = getStudentPaper(paper.id, teacherId)!;
  assert.equal(finalPaper.status, "failed");
  assert.ok(finalPaper.failureReason);

  assert.equal(
    getUsageCount(teacherId, currentPeriod(), "grading"),
    0,
    "a permanently failed grading job must refund the teacher's quota, not consume it",
  );
});
