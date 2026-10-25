// Covers the explicit requirement to detect a scanned/photographed PDF (no
// embedded text layer) instead of silently reporting "extracted" with
// near-empty content — pdf-parse itself never throws for this case, so it
// must be detected by the extracted text being essentially empty, not by a
// caught exception. Minimal hand-built PDF byte strings stand in for real
// files here: pdf-parse recovers fine from their simplified xref tables, and
// the extraction code path only cares about the resulting text length.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTextFromUpload } from "../src/lib/extractText";

function makePdfFile(contentStream: string | null, name = "file.pdf"): File {
  const pdf = contentStream
    ? `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${contentStream.length}>>
stream
${contentStream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Size 6/Root 1 0 R>>
%%EOF`
    : `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Size 4/Root 1 0 R>>
%%EOF`;
  return new File([Buffer.from(pdf, "latin1")], name, { type: "application/pdf" });
}

test("a PDF with a real text layer is reported as extracted", async () => {
  const file = makePdfFile("BT /F1 24 Tf 10 100 Td (Hello World, this is a real text layer) Tj ET");
  const result = await extractTextFromUpload(file);
  assert.equal(result.status, "extracted");
  assert.ok(result.text.includes("Hello World"));
});

test("a PDF with no embedded text layer at all (the scanned-PDF case) is detected, not reported as extracted", async () => {
  const file = makePdfFile(null); // no content stream whatsoever — the plain "scanned image, no OCR layer" shape
  const result = await extractTextFromUpload(file);
  assert.equal(result.status, "scanned_no_text");
  assert.equal(result.text, "", "no content must ever be silently used as reference material from this state");
});

test("an unsupported file type is reported as such, not confused with a scanned PDF", async () => {
  const file = new File([Buffer.from("just some bytes")], "notes.txt", { type: "text/plain" });
  const result = await extractTextFromUpload(file);
  assert.equal(result.status, "unsupported");
});
