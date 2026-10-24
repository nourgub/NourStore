// Tests the Word manual-page-break splitter (src/lib/docxPageSplit.ts).
// Generates real .docx files with the `docx` package (already a production
// dependency — used to build the exam/solution/rubric downloads) so this
// exercises the actual XML shape Word-compatible writers produce, not a
// hand-rolled fixture. No network calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph, TextRun, PageBreak } from "docx";
import { splitDocxIntoPages } from "../src/lib/docxPageSplit";

async function buildDocx(paragraphs: Paragraph[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

test("a document with no page breaks is a single page", async () => {
  const buf = await buildDocx([
    new Paragraph({ children: [new TextRun("سطر أول")] }),
    new Paragraph({ children: [new TextRun("سطر ثانٍ")] }),
  ]);
  const pages = await splitDocxIntoPages(buf);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].pageNumber, 1);
  assert.match(pages[0].text, /سطر أول/);
  assert.match(pages[0].text, /سطر ثانٍ/);
});

test("an inline manual page break (w:br type=page) splits text correctly", async () => {
  const buf = await buildDocx([
    new Paragraph({
      children: [new TextRun("تمرين 1 قبل الفاصل"), new PageBreak(), new TextRun("تمرين 2 بعد الفاصل")],
    }),
  ]);
  const pages = await splitDocxIntoPages(buf);
  assert.equal(pages.length, 2);
  assert.match(pages[0].text, /تمرين 1 قبل الفاصل/);
  assert.ok(!pages[0].text.includes("تمرين 2"));
  assert.match(pages[1].text, /تمرين 2 بعد الفاصل/);
});

test("pageBreakBefore paragraph property splits text correctly", async () => {
  const buf = await buildDocx([
    new Paragraph({ children: [new TextRun("تمرين 1")] }),
    new Paragraph({ pageBreakBefore: true, children: [new TextRun("تمرين 2")] }),
  ]);
  const pages = await splitDocxIntoPages(buf);
  assert.equal(pages.length, 2);
  assert.match(pages[0].text, /تمرين 1/);
  assert.match(pages[1].text, /تمرين 2/);
});

test("multiple exercises across three pages are numbered correctly", async () => {
  const buf = await buildDocx([
    new Paragraph({ children: [new TextRun("التمرين الأول")] }),
    new Paragraph({ pageBreakBefore: true, children: [new TextRun("التمرين الثاني")] }),
    new Paragraph({ pageBreakBefore: true, children: [new TextRun("التمرين الثالث")] }),
  ]);
  const pages = await splitDocxIntoPages(buf);
  assert.equal(pages.length, 3);
  assert.deepEqual(pages.map((p) => p.pageNumber), [1, 2, 3]);
  assert.match(pages[0].text, /التمرين الأول/);
  assert.match(pages[1].text, /التمرين الثاني/);
  assert.match(pages[2].text, /التمرين الثالث/);
});

test("a plain line break (not a page break) never splits pages", async () => {
  const buf = await buildDocx([
    new Paragraph({ children: [new TextRun({ text: "سطر أول", break: 1 }), new TextRun("سطر ثانٍ")] }),
  ]);
  const pages = await splitDocxIntoPages(buf);
  assert.equal(pages.length, 1);
});
