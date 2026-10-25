// Covers a real correctness bug: importExamFromDocuments used to silently
// slice the teacher's own exam/correction text at a fixed character limit,
// which could drop real questions from the tail of a long exam without any
// warning. It now refuses clearly instead of ever truncating silently. This
// check runs before any API key check, so it's testable without a real key.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importExamFromDocuments, ExamImportError } from "../src/lib/agents/examImportAgent";

test("a too-long exam or correction file is refused clearly instead of silently truncated", async () => {
  const tooLong = "س".repeat(70000);
  await assert.rejects(
    () =>
      importExamFromDocuments({
        subjectPersona: "أستاذ رياضيات",
        examTitle: "اختبار",
        gradeLevel: "السنة الأولى ثانوي",
        topic: "الدوال",
        examText: tooLong,
        correctionText: "تصحيح قصير",
      }),
    ExamImportError,
  );
});
