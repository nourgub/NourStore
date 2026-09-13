import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import {
  MAX_ARCHIVE_ENTRIES,
  extractAttachment,
  type AttachmentInput,
} from "./extract";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// A real 1×1 PNG — the magic-byte check in uploadValidation.ts is against the
// actual bytes, so a fake "image" would (correctly) be rejected.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function upload(
  fileName: string,
  mimeType: string,
  bytes: Uint8Array | Buffer
): AttachmentInput {
  const buffer = Buffer.from(bytes);
  return {
    fileName,
    mimeType,
    dataBase64: buffer.toString("base64"),
    sizeBytes: buffer.byteLength,
  };
}

async function makeDocx(paragraphs: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: paragraphs.map(
          text => new Paragraph({ children: [new TextRun(text)] })
        ),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

async function makeXlsx(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("النتائج");
  rows.forEach(row => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("attachment extraction", () => {
  it("reads the text out of a real .docx, paragraph boundaries intact", async () => {
    const docx = await makeDocx([
      "التمرين الأول: حل المعادلة x² - 5x + 6 = 0",
      "التمرين الثاني: احسب المميز",
    ]);
    const [result] = await extractAttachment(
      upload("exam.docx", DOCX_MIME, docx)
    );
    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.text).toContain("التمرين الأول");
      expect(result.text).toContain("x² - 5x + 6 = 0");
      // Two paragraphs must not run together into one line.
      expect(result.text.split("\n").filter(Boolean)).toHaveLength(2);
      expect(result.truncated).toBe(false);
    }
  });

  it("reads a real .xlsx, keeping rows as rows", async () => {
    const xlsx = await makeXlsx([
      ["التلميذ", "النقطة"],
      ["أمين", 15],
      ["سارة", 18],
    ]);
    const [result] = await extractAttachment(
      upload("marks.xlsx", XLSX_MIME, xlsx)
    );
    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.text).toContain("# النتائج");
      expect(result.text).toContain("أمين\t15");
      expect(result.text).toContain("سارة\t18");
    }
  });

  it("hands an image to Claude as an image, not as text", async () => {
    const [result] = await extractAttachment(
      upload("paper.png", "image/png", Buffer.from(PNG_BASE64, "base64"))
    );
    expect(result.kind).toBe("image");
    if (result.kind === "image") {
      expect(result.mediaType).toBe("image/png");
      expect(result.dataBase64).toBe(PNG_BASE64);
    }
  });

  it("hands a PDF over as a document for Claude to read directly", async () => {
    const pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n",
      "latin1"
    );
    const [result] = await extractAttachment(
      upload("exam.pdf", "application/pdf", pdf)
    );
    expect(result.kind).toBe("pdf");
  });

  it("opens an archive and classifies each file inside", async () => {
    const zip = zipSync({
      "copies/amine.txt": strToU8("المميز يساوي 25"),
      "copies/sara.png": new Uint8Array(Buffer.from(PNG_BASE64, "base64")),
      "copies/": new Uint8Array(0),
      "__MACOSX/._junk": strToU8("resource fork"),
    });
    const results = await extractAttachment(
      upload("class.zip", "application/zip", zip)
    );
    const kinds = results.map(r => r.kind).sort();
    // The directory entry and the macOS resource fork are dropped, not
    // reported as unreadable files.
    expect(kinds).toEqual(["image", "text"]);
    const text = results.find(r => r.kind === "text");
    expect(text?.name).toBe("class.zip › copies/amine.txt");
    if (text?.kind === "text") expect(text.text).toBe("المميز يساوي 25");
  });

  it("caps how many files one archive may yield, and says how many it skipped", async () => {
    const entries: Record<string, Uint8Array> = {};
    for (let index = 0; index < MAX_ARCHIVE_ENTRIES + 5; index += 1) {
      entries[`copy-${index}.txt`] = strToU8(`إجابة رقم ${index}`);
    }
    const results = await extractAttachment(
      upload("big.zip", "application/zip", zipSync(entries))
    );
    expect(results.filter(r => r.kind === "text")).toHaveLength(
      MAX_ARCHIVE_ENTRIES
    );
    const notice = results.find(r => r.kind === "unsupported");
    expect(notice?.kind === "unsupported" && notice.reason).toContain("5");
  });

  it("refuses legacy .doc/.xls with the fix to apply, instead of half-parsing it", async () => {
    // Real OLE Compound File signature, so it passes the magic-byte check and
    // is rejected for what it actually is, not for looking wrong.
    const ole = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00,
    ]);
    const [result] = await extractAttachment(
      upload("old.doc", "application/msword", ole)
    );
    expect(result.kind).toBe("unsupported");
    if (result.kind === "unsupported") {
      expect(result.reason).toContain(".docx");
    }
  });

  it("rejects a file whose real bytes are not what it claims to be", async () => {
    // A text file renamed and declared as a PNG: extension and MIME agree
    // with each other, only the bytes give it away.
    const [result] = await extractAttachment(
      upload("fake.png", "image/png", Buffer.from("this is not a png"))
    );
    expect(result.kind).toBe("unsupported");
    if (result.kind === "unsupported") {
      expect(result.reason).toContain("content_does_not_match_declared_type");
    }
  });

  it("marks a cut-off file as cut off rather than trimming it silently", async () => {
    const huge = "س".repeat(70_000);
    const [result] = await extractAttachment(
      upload("long.txt", "text/plain", Buffer.from(huge, "utf8"))
    );
    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.truncated).toBe(true);
      expect(result.text).toContain("تم قطع النص");
    }
  });
});
