// Tests the "exercises copied verbatim from specific Word pages" exam
// generation path (src/lib/generation.ts's createGeneration with
// pageExercises, backed by src/lib/agents/pipeline.ts's
// runGivenExercisesPipeline). No ANTHROPIC_API_KEY is set in this test
// environment — exactly the condition this mode must handle by failing
// clearly, since (unlike the topic-based mode) there is no mock/demo bank
// that can "solve" an arbitrary teacher-supplied exercise.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-pageexercises-test-"));
process.env.DATA_DIR = tmpDir;
delete process.env.ANTHROPIC_API_KEY;

let createGeneration: typeof import("../src/lib/generation").createGeneration;
let GenerationError: typeof import("../src/lib/generation").GenerationError;
let findRequest: typeof import("../src/lib/db").findRequest;
let insertTeacher: typeof import("../src/lib/db").insertTeacher;

before(async () => {
  const generation = await import("../src/lib/generation");
  const db = await import("../src/lib/db");
  createGeneration = generation.createGeneration;
  GenerationError = generation.GenerationError;
  findRequest = db.findRequest;
  insertTeacher = db.insertTeacher;

  insertTeacher({
    id: "t_pageex",
    fullName: "أستاذ تجريبي",
    email: "pageex@test.local",
    passwordHash: "x",
    passwordSalt: "y",
    subscriptionStatus: "active",
    planId: "full",
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    createdAt: new Date().toISOString(),
  });
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("page-exercises mode fails clearly (not silently) without a configured Claude key", async () => {
  const result = await createGeneration({
    teacherId: "t_pageex",
    subjectId: "math",
    documentId: null,
    examTitle: "فرض من ملف Word",
    gradeLevel: "السنة الأولى ثانوي",
    topics: [],
    numQuestions: 6,
    difficultyMix: "متوازن",
    pageExercises: [
      { pageNumber: 1, promptText: "نص التمرين الأول كما نُسخ من الصفحة 1" },
      { pageNumber: 3, promptText: "نص التمرين الثاني كما نُسخ من الصفحة 3" },
    ],
  });

  assert.equal(result.status, "failed");
  assert.match(result.failureReason ?? "", /Claude API/);
  assert.equal(result.questions.length, 0);
  // The request record's metadata reflects the exercises, not the raw (unused) numQuestions=6 input.
  assert.equal(result.numQuestions, 2);
  // No explicit topic was given, so the default placeholder topic is used.
  assert.deepEqual(result.topics, ["تمارين من الوثيقة المرفوعة"]);
});

test("an explicit topic is used verbatim when given", async () => {
  const result = await createGeneration({
    teacherId: "t_pageex",
    subjectId: "math",
    documentId: null,
    examTitle: "فرض 2",
    gradeLevel: "السنة الأولى ثانوي",
    topics: ["مراجعة شاملة"],
    numQuestions: 6,
    difficultyMix: "متوازن",
    pageExercises: [{ pageNumber: 2, promptText: "نص تمرين" }],
  });
  assert.deepEqual(result.topics, ["مراجعة شاملة"]);
});

test("more than 20 exercises is rejected before any generation attempt", async () => {
  const manyExercises = Array.from({ length: 21 }, (_, i) => ({ pageNumber: i + 1, promptText: `تمرين ${i + 1}` }));
  await assert.rejects(
    () =>
      createGeneration({
        teacherId: "t_pageex",
        subjectId: "math",
        documentId: null,
        examTitle: "فرض كبير",
        gradeLevel: "السنة الأولى ثانوي",
        topics: [],
        numQuestions: 6,
        difficultyMix: "متوازن",
        pageExercises: manyExercises,
      }),
    GenerationError,
  );
});

test("an empty exam title is still rejected in page-exercises mode", async () => {
  await assert.rejects(
    () =>
      createGeneration({
        teacherId: "t_pageex",
        subjectId: "math",
        documentId: null,
        examTitle: "   ",
        gradeLevel: "السنة الأولى ثانوي",
        topics: [],
        numQuestions: 6,
        difficultyMix: "متوازن",
        pageExercises: [{ pageNumber: 1, promptText: "تمرين" }],
      }),
    GenerationError,
  );
});

test("the failed request is actually persisted and retrievable", async () => {
  const result = await createGeneration({
    teacherId: "t_pageex",
    subjectId: "math",
    documentId: null,
    examTitle: "فرض محفوظ",
    gradeLevel: "السنة الأولى ثانوي",
    topics: [],
    numQuestions: 6,
    difficultyMix: "متوازن",
    pageExercises: [{ pageNumber: 5, promptText: "تمرين" }],
  });
  const persisted = findRequest(result.id, "t_pageex");
  assert.ok(persisted);
  assert.equal(persisted!.status, "failed");
});
