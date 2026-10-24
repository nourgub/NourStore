// Tests the exam/rubric editing feature (src/lib/generation.ts's
// updateExamQuestions) — closes the "no editing screen after creation" gap
// noted in DELIVERY_SUMMARY.md. No network/AI calls: docx regeneration is
// pure local rendering, not a model call. Runs against a temporary, isolated
// SQLite database (DATA_DIR override), which also isolates GENERATED_DIR so
// the docx files this test writes never touch real data.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-examedit-test-"));
process.env.DATA_DIR = tmpDir;

let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let insertRequest: typeof import("../src/lib/db").insertRequest;
let findRequest: typeof import("../src/lib/db").findRequest;
let GENERATED_DIR: typeof import("../src/lib/db").GENERATED_DIR;
let updateExamQuestions: typeof import("../src/lib/generation").updateExamQuestions;
let GenerationError: typeof import("../src/lib/generation").GenerationError;
let emptyExamReview: typeof import("../src/lib/types").emptyExamReview;

before(async () => {
  const db = await import("../src/lib/db");
  const generation = await import("../src/lib/generation");
  const types = await import("../src/lib/types");
  insertTeacher = db.insertTeacher;
  insertRequest = db.insertRequest;
  findRequest = db.findRequest;
  GENERATED_DIR = db.GENERATED_DIR;
  updateExamQuestions = generation.updateExamQuestions;
  GenerationError = generation.GenerationError;
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
    createdAt: new Date().toISOString(),
  };
}

function makeExam(id: string, teacherId: string, status: "done" | "failed" = "done") {
  const outDir = path.join(GENERATED_DIR, teacherId, id);
  fs.mkdirSync(outDir, { recursive: true });
  const examDocx = path.join(outDir, "exam.docx");
  const solutionDocx = path.join(outDir, "solution.docx");
  const rubricDocx = path.join(outDir, "rubric.docx");
  fs.writeFileSync(examDocx, "placeholder");
  fs.writeFileSync(solutionDocx, "placeholder");
  fs.writeFileSync(rubricDocx, "placeholder");

  return {
    id,
    teacherId,
    subjectId: "math" as const,
    documentId: null,
    examTitle: "اختبار تجريبي",
    gradeLevel: "السنة الأولى ثانوي",
    topics: ["الدوال"],
    numQuestions: 2,
    difficultyMix: "متوازن" as const,
    status,
    failureReason: null,
    steps: [],
    questions: [
      {
        id: "q1",
        topic: "الدوال",
        difficulty: "متوسط" as const,
        points: 12,
        prompt: "سؤال أول",
        solution: "حل أول",
        rubric: [
          { id: "q1_c1", criterion: "معيار أول", points: 8 },
          { id: "q1_c2", criterion: "معيار ثانٍ", points: 4 },
        ],
      },
      {
        id: "q2",
        topic: "الهندسة",
        difficulty: "سهل" as const,
        points: 8,
        prompt: "سؤال ثانٍ",
        solution: "حل ثانٍ",
        rubric: [{ id: "q2_c1", criterion: "معيار وحيد", points: 8 }],
      },
    ],
    rubricVersion: 1,
    review: emptyExamReview(),
    files: { examDocx, solutionDocx, rubricDocx },
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

test("updateExamQuestions applies a valid edit, bumps rubricVersion, and regenerates the docx files", async () => {
  const teacherId = "t_edit_ok";
  insertTeacher(makeTeacher(teacherId));
  const exam = makeExam("exam_ok", teacherId);
  insertRequest(exam);

  const updated = await updateExamQuestions(teacherId, exam.id, [
    {
      id: "q1",
      topic: "الدوال",
      difficulty: "صعب",
      prompt: "سؤال أول معدَّل",
      solution: "حل أول معدَّل",
      points: 12,
      rubric: [
        { id: "q1_c1", criterion: "معيار أول معدَّل", points: 10 },
        { id: "q1_c2", criterion: "معيار ثانٍ", points: 2 },
      ],
    },
    {
      id: "q2",
      topic: "الهندسة",
      difficulty: "سهل",
      prompt: "سؤال ثانٍ",
      solution: "حل ثانٍ",
      points: 8,
      rubric: [{ id: "q2_c1", criterion: "معيار وحيد", points: 8 }],
    },
  ]);

  assert.equal(updated.rubricVersion, 2);
  assert.equal(updated.questions[0].prompt, "سؤال أول معدَّل");
  assert.equal(updated.questions[0].difficulty, "صعب");
  assert.equal(updated.questions[0].rubric[0].points, 10);

  const persisted = findRequest(exam.id, teacherId)!;
  assert.equal(persisted.rubricVersion, 2);
  assert.equal(persisted.questions[0].prompt, "سؤال أول معدَّل");

  // Docx files were actually rewritten (no longer the placeholder content).
  const examDocxContent = fs.readFileSync(exam.files.examDocx!);
  assert.notEqual(examDocxContent.toString(), "placeholder");
  assert.ok(examDocxContent.length > 0);
});

test("updateExamQuestions adds a new criterion with a fresh non-colliding id and removes a dropped one", async () => {
  const teacherId = "t_edit_criteria";
  insertTeacher(makeTeacher(teacherId));
  const exam = makeExam("exam_criteria", teacherId);
  insertRequest(exam);

  const updated = await updateExamQuestions(teacherId, exam.id, [
    {
      id: "q1",
      topic: "الدوال",
      difficulty: "متوسط",
      prompt: "سؤال أول",
      solution: "حل أول",
      points: 12,
      rubric: [
        { id: "q1_c1", criterion: "معيار أول", points: 6 },
        // q1_c2 dropped entirely
        { criterion: "معيار جديد", points: 6 }, // no id => newly added
      ],
    },
    {
      id: "q2",
      topic: "الهندسة",
      difficulty: "سهل",
      prompt: "سؤال ثانٍ",
      solution: "حل ثانٍ",
      points: 8,
      rubric: [{ id: "q2_c1", criterion: "معيار وحيد", points: 8 }],
    },
  ]);

  const q1 = updated.questions.find((q) => q.id === "q1")!;
  assert.equal(q1.rubric.length, 2);
  assert.ok(q1.rubric.some((c) => c.id === "q1_c1"));
  assert.ok(!q1.rubric.some((c) => c.id === "q1_c2"), "dropped criterion must be gone");
  const newCriterion = q1.rubric.find((c) => c.id !== "q1_c1")!;
  assert.match(newCriterion.id, /^q1_c\d+$/);
  assert.notEqual(newCriterion.id, "q1_c1");
  assert.notEqual(newCriterion.id, "q1_c2", "must not reuse the id of the criterion that was just dropped");
});

test("updateExamQuestions rejects a criteria sum that doesn't match the question's points", async () => {
  const teacherId = "t_edit_mismatch";
  insertTeacher(makeTeacher(teacherId));
  const exam = makeExam("exam_mismatch", teacherId);
  insertRequest(exam);

  await assert.rejects(
    () =>
      updateExamQuestions(teacherId, exam.id, [
        {
          id: "q1",
          topic: "الدوال",
          difficulty: "متوسط",
          prompt: "سؤال أول",
          solution: "حل أول",
          points: 12,
          rubric: [{ id: "q1_c1", criterion: "معيار أول", points: 5 }], // sums to 5, not 12
        },
        {
          id: "q2",
          topic: "الهندسة",
          difficulty: "سهل",
          prompt: "سؤال ثانٍ",
          solution: "حل ثانٍ",
          points: 8,
          rubric: [{ id: "q2_c1", criterion: "معيار وحيد", points: 8 }],
        },
      ]),
    GenerationError,
  );
});

test("updateExamQuestions rejects an exam total that doesn't sum to 20", async () => {
  const teacherId = "t_edit_total";
  insertTeacher(makeTeacher(teacherId));
  const exam = makeExam("exam_total", teacherId);
  insertRequest(exam);

  await assert.rejects(
    () =>
      updateExamQuestions(teacherId, exam.id, [
        {
          id: "q1",
          topic: "الدوال",
          difficulty: "متوسط",
          prompt: "سؤال أول",
          solution: "حل أول",
          points: 10, // changed from 12 -> 10, total becomes 18
          rubric: [{ id: "q1_c1", criterion: "معيار أول", points: 10 }],
        },
        {
          id: "q2",
          topic: "الهندسة",
          difficulty: "سهل",
          prompt: "سؤال ثانٍ",
          solution: "حل ثانٍ",
          points: 8,
          rubric: [{ id: "q2_c1", criterion: "معيار وحيد", points: 8 }],
        },
      ]),
    GenerationError,
  );
});

test("updateExamQuestions rejects changing the number of questions", async () => {
  const teacherId = "t_edit_count";
  insertTeacher(makeTeacher(teacherId));
  const exam = makeExam("exam_count", teacherId);
  insertRequest(exam);

  await assert.rejects(
    () =>
      updateExamQuestions(teacherId, exam.id, [
        {
          id: "q1",
          topic: "الدوال",
          difficulty: "متوسط",
          prompt: "سؤال أول",
          solution: "حل أول",
          points: 20,
          rubric: [{ id: "q1_c1", criterion: "معيار أول", points: 20 }],
        },
      ]),
    GenerationError,
  );
});

test("updateExamQuestions rejects editing another teacher's exam", async () => {
  const ownerId = "t_edit_owner";
  const attackerId = "t_edit_attacker";
  insertTeacher(makeTeacher(ownerId));
  insertTeacher(makeTeacher(attackerId));
  const exam = makeExam("exam_owner", ownerId);
  insertRequest(exam);

  await assert.rejects(
    () =>
      updateExamQuestions(attackerId, exam.id, [
        { id: "q1", topic: "الدوال", difficulty: "متوسط", prompt: "x", solution: "y", points: 12, rubric: [{ id: "q1_c1", criterion: "c", points: 12 }] },
        { id: "q2", topic: "الهندسة", difficulty: "سهل", prompt: "x", solution: "y", points: 8, rubric: [{ id: "q2_c1", criterion: "c", points: 8 }] },
      ]),
    GenerationError,
  );
});

test("updateExamQuestions rejects editing an exam that hasn't finished generating", async () => {
  const teacherId = "t_edit_notdone";
  insertTeacher(makeTeacher(teacherId));
  const exam = makeExam("exam_notdone", teacherId, "failed");
  insertRequest(exam);

  await assert.rejects(
    () =>
      updateExamQuestions(teacherId, exam.id, [
        { id: "q1", topic: "الدوال", difficulty: "متوسط", prompt: "x", solution: "y", points: 12, rubric: [{ id: "q1_c1", criterion: "c", points: 12 }] },
        { id: "q2", topic: "الهندسة", difficulty: "سهل", prompt: "x", solution: "y", points: 8, rubric: [{ id: "q2_c1", criterion: "c", points: 8 }] },
      ]),
    GenerationError,
  );
});
