// Tests the "import an existing exam + correction for standalone grading"
// path (src/lib/generation.ts's createGeneration with importedExam, backed
// by src/lib/agents/pipeline.ts's runExamImportPipeline). This is the
// feature that lets a teacher on the grading_only plan actually reach
// grading at all — previously every grading session required a
// GenerationRequest that only the exams-gated /api/generate route could
// create. No ANTHROPIC_API_KEY is set here — exactly the condition this
// mode must handle by failing clearly, since understanding two arbitrary
// uploaded documents needs a real model call, not a template.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-examimport-test-"));
process.env.DATA_DIR = tmpDir;
delete process.env.ANTHROPIC_API_KEY;

let createGeneration: typeof import("../src/lib/generation").createGeneration;
let findRequest: typeof import("../src/lib/db").findRequest;
let insertTeacher: typeof import("../src/lib/db").insertTeacher;

before(async () => {
  const generation = await import("../src/lib/generation");
  const db = await import("../src/lib/db");
  createGeneration = generation.createGeneration;
  findRequest = db.findRequest;
  insertTeacher = db.insertTeacher;

  insertTeacher({
    id: "t_examimport",
    fullName: "أستاذ تجريبي",
    email: "examimport@test.local",
    passwordHash: "x",
    passwordSalt: "y",
    subscriptionStatus: "active",
    planId: "grading_only",
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  });
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("importing an exam fails clearly (not silently) without a configured Claude key", async () => {
  const result = await createGeneration({
    teacherId: "t_examimport",
    subjectId: "math",
    documentId: null,
    examTitle: "فرض مستورد",
    gradeLevel: "السنة الثالثة ثانوي",
    topics: [],
    numQuestions: 0,
    difficultyMix: "متوازن",
    importedExam: {
      examText: "التمرين الأول: احسب نهاية الدالة... التمرين الثاني: ادرس تغيرات الدالة...",
      correctionText: "تصحيح التمرين الأول: ... (4 ن)\nتصحيح التمرين الثاني: ... (16 ن)",
    },
  });

  assert.equal(result.status, "failed");
  assert.match(result.failureReason ?? "", /Claude API/);
  assert.equal(result.questions.length, 0);
  assert.deepEqual(result.topics, ["امتحان مستورد (تصحيح مباشر)"]);
});

test("an explicit topic is used verbatim when given", async () => {
  const result = await createGeneration({
    teacherId: "t_examimport",
    subjectId: "math",
    documentId: null,
    examTitle: "فرض مستورد 2",
    gradeLevel: "السنة الثالثة ثانوي",
    topics: ["دراسة الدوال"],
    numQuestions: 0,
    difficultyMix: "متوازن",
    importedExam: { examText: "نص الامتحان", correctionText: "نص التصحيح" },
  });
  assert.deepEqual(result.topics, ["دراسة الدوال"]);
});

test("an empty exam title is still rejected in imported-exam mode", async () => {
  const { GenerationError } = await import("../src/lib/generation");
  await assert.rejects(
    () =>
      createGeneration({
        teacherId: "t_examimport",
        subjectId: "math",
        documentId: null,
        examTitle: "   ",
        gradeLevel: "السنة الثالثة ثانوي",
        topics: [],
        numQuestions: 0,
        difficultyMix: "متوازن",
        importedExam: { examText: "نص", correctionText: "نص" },
      }),
    GenerationError,
  );
});

test("missing exam or correction text falls back to the normal (non-imported) numQuestions validation", async () => {
  // Empty importedExam text means usingImportedExam is false, so the normal
  // numQuestions bound (1-20) applies — numQuestions:0 must then be rejected.
  const { GenerationError } = await import("../src/lib/generation");
  await assert.rejects(
    () =>
      createGeneration({
        teacherId: "t_examimport",
        subjectId: "math",
        documentId: null,
        examTitle: "فرض بلا ملفات",
        gradeLevel: "السنة الثالثة ثانوي",
        topics: [],
        numQuestions: 0,
        difficultyMix: "متوازن",
        importedExam: { examText: "", correctionText: "" },
      }),
    GenerationError,
  );
});

test("the failed imported-exam request is actually persisted and retrievable", async () => {
  const result = await createGeneration({
    teacherId: "t_examimport",
    subjectId: "math",
    documentId: null,
    examTitle: "فرض محفوظ",
    gradeLevel: "السنة الثالثة ثانوي",
    topics: [],
    numQuestions: 0,
    difficultyMix: "متوازن",
    importedExam: { examText: "نص الامتحان", correctionText: "نص التصحيح" },
  });
  const persisted = findRequest(result.id, "t_examimport");
  assert.ok(persisted);
  assert.equal(persisted!.status, "failed");
});
