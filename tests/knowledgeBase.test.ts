// Real tests for the NourStore Knowledge Engine (Phase 1): schema, the
// collected -> ... -> published state machine, deterministic verification,
// license-gated extraction, and duplicate detection. No AI calls here —
// everything in src/lib/knowledgeBase/service.ts and verification.ts is
// deliberately deterministic and offline-testable (see the comments in
// those files for why the AI-structuring step is kept out of this layer).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-kb-test-"));
process.env.DATA_DIR = tmpDir;

let registerSource: typeof import("../src/lib/knowledgeBase/service").registerSource;
let recordSourceDocument: typeof import("../src/lib/knowledgeBase/service").recordSourceDocument;
let extractSourceDocument: typeof import("../src/lib/knowledgeBase/service").extractSourceDocument;
let setSourceLicenseStatus: typeof import("../src/lib/knowledgeBase/service").setSourceLicenseStatus;
let classifyAsLesson: typeof import("../src/lib/knowledgeBase/service").classifyAsLesson;
let classifyAsExercise: typeof import("../src/lib/knowledgeBase/service").classifyAsExercise;
let classifyAsExam: typeof import("../src/lib/knowledgeBase/service").classifyAsExam;
let submitForVerification: typeof import("../src/lib/knowledgeBase/service").submitForVerification;
let runDeterministicVerification: typeof import("../src/lib/knowledgeBase/service").runDeterministicVerification;
let markVerifiedByHuman: typeof import("../src/lib/knowledgeBase/service").markVerifiedByHuman;
let rejectContent: typeof import("../src/lib/knowledgeBase/service").rejectContent;
let publishContent: typeof import("../src/lib/knowledgeBase/service").publishContent;
let KnowledgeBaseError: typeof import("../src/lib/knowledgeBase/service").KnowledgeBaseError;
let getKbLesson: typeof import("../src/lib/db").getKbLesson;
let getKbExercise: typeof import("../src/lib/db").getKbExercise;
let searchKbChunks: typeof import("../src/lib/db").searchKbChunks;
let listKbChunks: typeof import("../src/lib/db").listKbChunks;
let insertTeacher: typeof import("../src/lib/db").insertTeacher;
let adminId: string;

before(async () => {
  const service = await import("../src/lib/knowledgeBase/service");
  registerSource = service.registerSource;
  recordSourceDocument = service.recordSourceDocument;
  extractSourceDocument = service.extractSourceDocument;
  classifyAsLesson = service.classifyAsLesson;
  classifyAsExercise = service.classifyAsExercise;
  classifyAsExam = service.classifyAsExam;
  setSourceLicenseStatus = service.setSourceLicenseStatus;
  submitForVerification = service.submitForVerification;
  runDeterministicVerification = service.runDeterministicVerification;
  markVerifiedByHuman = service.markVerifiedByHuman;
  rejectContent = service.rejectContent;
  publishContent = service.publishContent;
  KnowledgeBaseError = service.KnowledgeBaseError;
  const db = await import("../src/lib/db");
  getKbLesson = db.getKbLesson;
  getKbExercise = db.getKbExercise;
  searchKbChunks = db.searchKbChunks;
  listKbChunks = db.listKbChunks;
  insertTeacher = db.insertTeacher;

  // kb_verifications.checked_by has a real FK to teachers(id) — human_review
  // must name an actual admin account, never an arbitrary string.
  adminId = `teacher_${Math.random().toString(36).slice(2, 8)}`;
  insertTeacher({
    id: adminId,
    fullName: "مدير اختبار",
    email: `admin-${adminId}@example-test.dz`,
    passwordHash: "x",
    passwordSalt: "x",
    subscriptionStatus: "active",
    planId: "full",
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin: true,
    createdAt: new Date().toISOString(),
  });
});

function makeSource(licenseStatus: "public_domain" | "permitted_excerpt" | "unknown" | "restricted" = "public_domain") {
  return registerSource({
    name: `مصدر اختبار ${Math.random()}`,
    url: `https://example-test.dz/${Math.random()}`,
    sourceType: "official_ministry",
    licenseStatus,
    reliabilityNote: "مصدر اختبار صناعي للتطوير فقط — ليس بيانات إنتاجية حقيقية",
  });
}

test("registerSource is idempotent on url", () => {
  const url = `https://example-test.dz/same-${Math.random()}`;
  const a = registerSource({ name: "A", url, sourceType: "trusted_educational_site", licenseStatus: "unknown", reliabilityNote: "" });
  const b = registerSource({ name: "B (different name)", url, sourceType: "trusted_educational_site", licenseStatus: "unknown", reliabilityNote: "" });
  assert.equal(a.id, b.id);
  assert.equal(b.name, "A", "re-registering the same url returns the existing row, not a fresh name");
});

test("recordSourceDocument rejects an unknown education level", () => {
  const source = makeSource();
  assert.throws(
    () =>
      recordSourceDocument({
        sourceId: source.id,
        url: "https://example-test.dz/doc1",
        title: "وثيقة اختبار",
        fileType: "pdf",
        subjectId: "math",
        educationLevelId: "not-a-real-level",
        documentKind: "exam",
        contentYear: "2024",
      }),
    KnowledgeBaseError,
  );
});

test("extraction: public_domain source stores full text", () => {
  const source = makeSource("public_domain");
  const doc = recordSourceDocument({
    sourceId: source.id,
    url: "https://example-test.dz/doc-full",
    title: "وثيقة نص كامل",
    fileType: "pdf",
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: "exam",
    contentYear: "2024",
  });
  const { document } = extractSourceDocument({
    documentId: doc.id,
    sourceLicenseStatus: "public_domain",
    extractedText: "نص الامتحان الكامل هنا.",
  });
  assert.equal(document.status, "extracted");
  assert.equal(document.rawText, "نص الامتحان الكامل هنا.");
  assert.equal(document.excerpt, null);
  assert.ok(document.checksum);
});

test("extraction: permitted_excerpt source stores only a short excerpt, never the full text", () => {
  const source = makeSource("permitted_excerpt");
  const doc = recordSourceDocument({
    sourceId: source.id,
    url: "https://example-test.dz/doc-excerpt",
    title: "وثيقة مقتطف",
    fileType: "pdf",
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: "exercise_sheet",
    contentYear: null,
  });
  const longText = "أ".repeat(5000);
  const { document } = extractSourceDocument({ documentId: doc.id, sourceLicenseStatus: "permitted_excerpt", extractedText: longText });
  assert.equal(document.status, "extracted");
  assert.equal(document.rawText, null, "permitted_excerpt must never store full text");
  assert.ok(document.excerpt && document.excerpt.length < longText.length, "excerpt must be shorter than the source text");
});

test("extraction: unknown/restricted license stores no text at all and flags for human review", () => {
  for (const licenseStatus of ["unknown", "restricted"] as const) {
    const source = makeSource(licenseStatus);
    const doc = recordSourceDocument({
      sourceId: source.id,
      url: `https://example-test.dz/doc-${licenseStatus}`,
      title: "وثيقة غير واضحة الترخيص",
      fileType: "html",
      subjectId: "math",
      educationLevelId: "4am",
      documentKind: "lesson",
      contentYear: null,
    });
    const { document } = extractSourceDocument({ documentId: doc.id, sourceLicenseStatus: licenseStatus, extractedText: "بعض النص" });
    assert.equal(document.rawText, null);
    assert.equal(document.excerpt, null);
    assert.equal(document.status, "needs_human_review");
  }
});

test("extraction: identical content is detected as a duplicate and the new row is rejected", () => {
  const source = makeSource("public_domain");
  const text = `نص فريد للاختبار ${Math.random()}`;
  const doc1 = recordSourceDocument({
    sourceId: source.id,
    url: "https://example-test.dz/dup-1",
    title: "وثيقة 1",
    fileType: "pdf",
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: "exam",
    contentYear: null,
  });
  extractSourceDocument({ documentId: doc1.id, sourceLicenseStatus: "public_domain", extractedText: text });

  const doc2 = recordSourceDocument({
    sourceId: source.id,
    url: "https://example-test.dz/dup-2",
    title: "وثيقة 2 (نسخة مطابقة)",
    fileType: "pdf",
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: "exam",
    contentYear: null,
  });
  const { document, duplicateOf } = extractSourceDocument({ documentId: doc2.id, sourceLicenseStatus: "public_domain", extractedText: text });
  assert.equal(document.status, "rejected");
  assert.equal(duplicateOf?.id, doc1.id);
});

test("classifyAsLesson rejects a curriculum topic that doesn't exist for the level", () => {
  assert.throws(
    () =>
      classifyAsLesson({
        sourceDocumentId: null,
        subjectId: "math",
        educationLevelId: "4am",
        curriculumTopic: "موضوع غير موجود في المنهاج إطلاقًا",
        title: "درس اختبار",
        sections: [{ heading: "مقدمة", body: "نص" }],
        skills: [],
      }),
    KnowledgeBaseError,
  );
});

test("full lesson lifecycle: classified -> pending_verification -> verified -> published -> chunked", () => {
  const lesson = classifyAsLesson({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "الدوال الخطية والتآلفية",
    title: `درس الدوال الخطية ${Math.random()}`,
    sections: [
      { heading: "تعريف", body: "الدالة الخطية هي..." },
      { heading: "مثال", body: "مثال محلول..." },
    ],
    skills: ["تمثيل دالة خطية بيانيًا"],
  });
  assert.equal(lesson.status, "classified");

  submitForVerification("lesson", lesson.id);
  const outcome = runDeterministicVerification("lesson", lesson.id);
  assert.equal(outcome.overall, "verified");
  assert.ok(outcome.checks.every((c) => c.result === "pass"));

  const verifiedRow = getKbLesson(lesson.id)!;
  assert.equal(verifiedRow.status, "verified");

  publishContent("lesson", lesson.id);
  const publishedRow = getKbLesson(lesson.id)!;
  assert.equal(publishedRow.status, "published");

  const chunks = listKbChunks({ subjectId: "math", educationLevelId: "4am" }).filter((c) => c.sourceLessonId === lesson.id);
  assert.equal(chunks.length, 2, "one chunk per lesson section");
});

test("publishContent refuses a non-verified row — nothing unverified becomes retrievable", () => {
  const lesson = classifyAsLesson({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "الدوال الخطية والتآلفية",
    title: `درس غير محقق ${Math.random()}`,
    sections: [{ heading: "مقدمة", body: "نص" }],
    skills: [],
  });
  assert.throws(() => publishContent("lesson", lesson.id), KnowledgeBaseError);
});

test("exercise with an inconsistent rubric sum fails deterministic verification and is flagged for human review, never silently verified", () => {
  const exercise = classifyAsExercise({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "الحساب الحرفي والمطابقات الشهيرة",
    promptText: `طوّر (a+b)^2 ${Math.random()}`,
    solutionText: "a^2 + 2ab + b^2",
    rubric: [
      { id: "c1", criterion: "الحد الأول", points: 3 },
      { id: "c2", criterion: "الحد الثاني", points: 3 },
      // Deliberately wrong: sums to 6, not the stated 10.
    ],
    points: 10,
    difficulty: "متوسط",
  });

  submitForVerification("exercise", exercise.id);
  const outcome = runDeterministicVerification("exercise", exercise.id);
  assert.equal(outcome.overall, "needs_human_review");
  assert.ok(outcome.checks.some((c) => c.method === "deterministic_points" && c.result === "fail"));

  const row = getKbExercise(exercise.id)!;
  assert.equal(row.status, "needs_human_review");
});

test("a human admin can override needs_human_review to verified, with an audit trail recording who", () => {
  const exercise = classifyAsExercise({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "الحساب الحرفي والمطابقات الشهيرة",
    promptText: `تمرين يحتاج مراجعة بشرية ${Math.random()}`,
    solutionText: null, // empty on purpose -> fails completeness
    rubric: [{ id: "c1", criterion: "معيار", points: 5 }],
    points: 5,
    difficulty: "سهل",
  });
  submitForVerification("exercise", exercise.id);
  const auto = runDeterministicVerification("exercise", exercise.id);
  assert.equal(auto.overall, "needs_human_review");

  markVerifiedByHuman("exercise", exercise.id, adminId, "راجعتها يدويًا، الحل موجود في مصدر خارجي موثوق");
  const row = getKbExercise(exercise.id)!;
  assert.equal(row.status, "verified");
  assert.equal(row.verifiedBy, adminId);
});

test("rejectContent is terminal and always requires an explicit human reason", () => {
  const exercise = classifyAsExercise({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "الحساب الحرفي والمطابقات الشهيرة",
    promptText: `تمرين مرفوض ${Math.random()}`,
    solutionText: "حل",
    rubric: [{ id: "c1", criterion: "معيار", points: 5 }],
    points: 5,
    difficulty: "سهل",
  });
  rejectContent("exercise", exercise.id, adminId, "محتوى غير موثوق المصدر");
  const row = getKbExercise(exercise.id)!;
  assert.equal(row.status, "rejected");
  assert.throws(() => publishContent("exercise", exercise.id), KnowledgeBaseError, "a rejected row can never be published");
});

test("duplicate exact-text exercises are caught by deterministic verification", () => {
  const promptText = `تمرين مكرر ${Math.random()}`;
  const exA = classifyAsExercise({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "المعادلات والمتراجحات",
    promptText,
    solutionText: "حل",
    rubric: [{ id: "c1", criterion: "معيار", points: 5 }],
    points: 5,
    difficulty: "سهل",
  });
  submitForVerification("exercise", exA.id);
  runDeterministicVerification("exercise", exA.id);

  const exB = classifyAsExercise({
    sourceDocumentId: null,
    subjectId: "math",
    educationLevelId: "4am",
    curriculumTopic: "المعادلات والمتراجحات",
    promptText, // exact duplicate text
    solutionText: "حل",
    rubric: [{ id: "c1", criterion: "معيار", points: 5 }],
    points: 5,
    difficulty: "سهل",
  });
  submitForVerification("exercise", exB.id);
  const outcome = runDeterministicVerification("exercise", exB.id);
  assert.equal(outcome.overall, "needs_human_review");
  assert.ok(outcome.checks.some((c) => c.method === "deterministic_duplicate" && c.result === "fail"));
});

test("published exam creates one searchable chunk per question", () => {
  const exam = classifyAsExam({
    sourceDocumentId: null,
    title: `امتحان اختبار ${Math.random()}`,
    examType: "bem",
    subjectId: "math",
    educationLevelId: "4am",
    contentYear: "2023",
    questions: [
      {
        id: "q1",
        orderIndex: 1,
        promptText: "احسب (2x+1)^2",
        points: 10,
        curriculumTopic: "الحساب الحرفي والمطابقات الشهيرة",
        solutionText: "4x^2 + 4x + 1",
        rubric: [{ id: "c1", criterion: "التطوير الصحيح", points: 10 }],
      },
    ],
  });
  submitForVerification("exam", exam.id);
  const outcome = runDeterministicVerification("exam", exam.id);
  assert.equal(outcome.overall, "verified");
  publishContent("exam", exam.id);

  const chunks = searchKbChunks({ subjectId: "math", educationLevelId: "4am", query: "2x+1" });
  assert.ok(chunks.some((c) => c.sourceExamId === exam.id));
});

test("the admin-review flow: a source stuck at unknown license blocks extraction until explicitly reclassified", () => {
  const source = makeSource("unknown");
  const doc = recordSourceDocument({
    sourceId: source.id,
    url: `https://example-test.dz/admin-review-${Math.random()}`,
    title: "وثيقة بانتظار مراجعة الترخيص",
    fileType: "html",
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: "exam",
    contentYear: "2024",
  });

  // Before the admin acts: extraction stores nothing, same as any
  // unknown-license source.
  const before = extractSourceDocument({ documentId: doc.id, sourceLicenseStatus: "unknown", extractedText: "نص الامتحان" });
  assert.equal(before.document.status, "needs_human_review");
  assert.equal(before.document.rawText, null);

  // The admin reviews the source's actual terms of use and marks it public
  // domain — exactly the action the admin KB panel's license dropdown
  // performs (POST /api/admin/knowledge-base/sources/[id]/license).
  setSourceLicenseStatus(source.id, "public_domain");

  // A second document from the now-reclassified source stores full text
  // immediately, with no other code change needed.
  const doc2 = recordSourceDocument({
    sourceId: source.id,
    url: `https://example-test.dz/admin-review-2-${Math.random()}`,
    title: "وثيقة ثانية بعد تحديث الترخيص",
    fileType: "html",
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: "exam",
    contentYear: "2024",
  });
  const after = extractSourceDocument({ documentId: doc2.id, sourceLicenseStatus: "public_domain", extractedText: "نص الامتحان الثاني" });
  assert.equal(after.document.status, "extracted");
  assert.equal(after.document.rawText, "نص الامتحان الثاني");
});
