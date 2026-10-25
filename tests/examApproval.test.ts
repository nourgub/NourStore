// Covers the "draft until approved" requirement: an exam (any generation
// path — AI-generated, page-exercise, or imported) must stay a draft until
// the teacher explicitly approves its current questions/solutions/rubric,
// and a real grading session can never start against a draft. Editing the
// exam afterward silently reverts it to draft (new rubric version, old
// approval no longer matches) until re-approved — this is deliberate: an
// approval must never survive a content change it never saw.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-exam-approval-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let insertRequest: typeof import("../src/lib/db").insertRequest;
let findRequest: typeof import("../src/lib/db").findRequest;
let approveGeneration: typeof import("../src/lib/generation").approveGeneration;
let updateExamQuestions: typeof import("../src/lib/generation").updateExamQuestions;
let GenerationError: typeof import("../src/lib/generation").GenerationError;
let createGradingSession: typeof import("../src/lib/grading").createGradingSession;
let GradingError: typeof import("../src/lib/grading").GradingError;
let isExamApproved: typeof import("../src/lib/types").isExamApproved;
let emptyExamReview: typeof import("../src/lib/types").emptyExamReview;

before(async () => {
  const db = await import("../src/lib/db");
  const generation = await import("../src/lib/generation");
  const grading = await import("../src/lib/grading");
  const types = await import("../src/lib/types");
  insertTeacher = db.insertTeacher;
  insertRequest = db.insertRequest;
  findRequest = db.findRequest;
  approveGeneration = generation.approveGeneration;
  updateExamQuestions = generation.updateExamQuestions;
  GenerationError = generation.GenerationError;
  createGradingSession = grading.createGradingSession;
  GradingError = grading.GradingError;
  isExamApproved = types.isExamApproved;
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
    approvedRubricVersion: null,
    approvedAt: null,
  };
}

test("a freshly generated exam is a draft and cannot be used to start a real grading session", async () => {
  const teacherId = "t_approval_draft";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam_draft", teacherId));

  const exam = findRequest("exam_draft", teacherId)!;
  assert.equal(isExamApproved(exam), false);

  await assert.rejects(() => createGradingSession(teacherId, "exam_draft", "جلسة"), GradingError);
});

test("approving the exam lets a grading session start, and the approval is recorded", async () => {
  const teacherId = "t_approval_ok";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam_ok", teacherId));

  const approved = await approveGeneration(teacherId, "exam_ok");
  assert.equal(isExamApproved(approved), true);
  assert.ok(approved.approvedAt);

  const session = await createGradingSession(teacherId, "exam_ok", "جلسة بعد الاعتماد");
  assert.equal(session.examRequestId, "exam_ok");
});

test("editing an approved exam's questions reverts it to draft until re-approved", async () => {
  const teacherId = "t_approval_edit";
  insertTeacher(makeTeacher(teacherId));
  insertRequest(makeExam("exam_edit", teacherId));
  await approveGeneration(teacherId, "exam_edit");

  const before = findRequest("exam_edit", teacherId)!;
  assert.equal(isExamApproved(before), true);

  const edited = await updateExamQuestions(teacherId, "exam_edit", [
    {
      id: "q1",
      topic: "الدوال",
      difficulty: "متوسط",
      prompt: "سؤال مُعدَّل",
      solution: "حل مُعدَّل",
      points: 5,
      rubric: [{ id: "q1_c1", criterion: "معيار وحيد", points: 5 }],
    },
  ]);

  assert.equal(edited.rubricVersion, 2);
  assert.equal(isExamApproved(edited), false, "the old approval (version 1) must not carry over to version 2");

  await assert.rejects(() => createGradingSession(teacherId, "exam_edit", "جلسة بعد التعديل"), GradingError);

  await approveGeneration(teacherId, "exam_edit");
  const reApproved = findRequest("exam_edit", teacherId)!;
  assert.equal(isExamApproved(reApproved), true);
  await createGradingSession(teacherId, "exam_edit", "جلسة بعد إعادة الاعتماد");
});

test("approveGeneration rejects a non-existent exam and an exam that never finished generating", async () => {
  const teacherId = "t_approval_errors";
  insertTeacher(makeTeacher(teacherId));
  await assert.rejects(() => approveGeneration(teacherId, "no_such_exam"), GenerationError);

  insertRequest({ ...makeExam("exam_not_done", teacherId), status: "failed" });
  await assert.rejects(() => approveGeneration(teacherId, "exam_not_done"), GenerationError);
});

test("a teacher can never approve another teacher's exam", async () => {
  const ownerId = "t_approval_owner";
  const otherId = "t_approval_other";
  insertTeacher(makeTeacher(ownerId));
  insertTeacher(makeTeacher(otherId));
  insertRequest(makeExam("exam_owned", ownerId));

  await assert.rejects(() => approveGeneration(otherId, "exam_owned"), GenerationError);
});
