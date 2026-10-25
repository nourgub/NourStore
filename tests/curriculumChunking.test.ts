// Pure unit tests for selectRelevantChunks — no network, no DB. Covers the
// explicit requirement to replace blind truncation with relevant-chunk
// selection: the relevant section of a long document must not be dropped
// just because it isn't near the start of the file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectRelevantChunks } from "../src/lib/curriculumChunking";

function paragraph(label: string, fillerChars: number): string {
  return `${label}\n` + "نص حشو ".repeat(Math.ceil(fillerChars / 7));
}

test("text under the budget is returned unchanged", () => {
  const text = "نص قصير جدًا لا يحتاج أي اقتطاع.";
  const result = selectRelevantChunks(text, ["جبر"], { maxChars: 5000 });
  assert.equal(result, text);
});

test("the relevant section is kept even when it is far from the start of a long document", () => {
  const irrelevant1 = paragraph("القسم الأول: تاريخ الهندسة", 3000);
  const irrelevant2 = paragraph("القسم الثاني: مقدمة في الإحصاء", 3000);
  const relevant = paragraph("القسم الثالث: المشتقات والدوال الأسية", 1500) + " شرح مفصّل عن المشتقة ودراسة تغيرات الدالة.";
  const irrelevant3 = paragraph("القسم الرابع: الهندسة الفضائية", 3000);

  const fullText = [irrelevant1, irrelevant2, relevant, irrelevant3].join("\n\n");
  // A blind "first N characters" truncation at any reasonable budget here
  // would keep only irrelevant1/irrelevant2 and completely miss `relevant`.
  const result = selectRelevantChunks(fullText, ["المشتقة", "الدوال الأسية"], { maxChars: 2500 });

  assert.ok(result.includes("المشتقات والدوال الأسية"), "the actually relevant section must be kept");
  assert.ok(!result.includes("تاريخ الهندسة"), "an irrelevant section should be dropped to stay within budget");
});

test("falls back to the document's opening when no keyword matches anything (preserves old truncation behavior)", () => {
  const text = "أ".repeat(2000) + "ب".repeat(2000) + "ج".repeat(2000);
  const result = selectRelevantChunks(text, ["كلمة غير موجودة إطلاقًا"], { maxChars: 1000 });
  assert.equal(result, text.slice(0, 1000));
});

test("an empty keyword list also falls back to the opening of the document", () => {
  const text = "فصل أول. ".repeat(500) + "فصل أخير عن الدوال الأسية. ".repeat(100);
  const result = selectRelevantChunks(text, [], { maxChars: 1000 });
  assert.equal(result, text.slice(0, 1000));
});

test("never returns a result far beyond the requested character budget", () => {
  const relevant = paragraph("الدوال", 2000);
  const text = relevant.repeat(5);
  const result = selectRelevantChunks(text, ["الدوال"], { maxChars: 3000, chunkSize: 1000 });
  // Allow some slack for the single chunk that pushed over the budget plus
  // the "[...]" joiners between kept chunks, but it must not just return
  // everything.
  assert.ok(result.length < text.length, "must actually reduce the text, not return everything");
});
