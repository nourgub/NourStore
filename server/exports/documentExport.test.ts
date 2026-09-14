import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import ExcelJS from "exceljs";
import {
  parseLines,
  safeFileName,
  toDocx,
  toMarksXlsx,
  toPdf,
} from "./documentExport";

const SAMPLE = `## الأهداف التعلمية
- يكون التلميذ قادراً على حل معادلة من الدرجة الثانية
- **يميّز** بين حالات المميز

## سير الدرس
مرحلة الانطلاق: 10 دقائق`;

describe("export rendering", () => {
  it("reads headings, bullets and blank lines out of the generated text", () => {
    const lines = parseLines(SAMPLE);
    expect(lines[0]).toEqual({
      type: "heading",
      level: 2,
      text: "الأهداف التعلمية",
    });
    expect(lines[1]).toEqual({
      type: "bullet",
      text: "يكون التلميذ قادراً على حل معادلة من الدرجة الثانية",
    });
    // Emphasis markers would be printed literally in a document, so they go.
    expect(lines[2]).toEqual({
      type: "bullet",
      text: "يميّز بين حالات المميز",
    });
    expect(lines[3]).toEqual({ type: "blank" });
  });

  it("produces a real .docx whose text is right-to-left", async () => {
    const buffer = await toDocx("تحضير درس: المعادلات", SAMPLE);
    // A .docx is a ZIP of XML — read it back the way Word would.
    const files = unzipSync(new Uint8Array(buffer));
    const xml = Buffer.from(files["word/document.xml"]).toString("utf8");
    expect(xml).toContain("تحضير درس: المعادلات");
    expect(xml).toContain(
      "يكون التلميذ قادراً على حل معادلة من الدرجة الثانية"
    );
    // bidi + RTL run direction are what make Word lay it out correctly.
    expect(xml).toContain("<w:bidi");
    expect(xml).toContain("<w:rtl");
  });

  it("produces a real PDF with the bundled Arabic font embedded", async () => {
    const buffer = await toPdf("امتحان الرياضيات", SAMPLE);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.byteLength).toBeGreaterThan(2000);
    // Without a real embedded Arabic font the Arabic would silently render as
    // blank boxes — assert the font actually made it into the file.
    expect(buffer.toString("latin1")).toContain("NotoNaskhArabic");
  });

  it("produces a marks sheet that never dresses a draft up as a final mark", async () => {
    const buffer = await toMarksXlsx("نتائج القسم", [
      {
        student: "أمين",
        finalPoints: 15,
        maxPoints: 20,
        status: "معتمدة",
        notes: "منهجية سليمة",
        date: new Date("2026-09-13T00:00:00Z"),
      },
      {
        student: "سارة",
        finalPoints: null,
        maxPoints: 20,
        status: "مسودة",
        notes: null,
        date: null,
      },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    expect(sheet.views[0].rightToLeft).toBe(true);
    expect(sheet.getRow(1).getCell(1).value).toBe("التلميذ");
    expect(sheet.getRow(2).getCell(1).value).toBe("أمين");
    expect(sheet.getRow(2).getCell(2).value).toBe(15);
    // The unreviewed row carries no number at all, and says why.
    expect(sheet.getRow(3).getCell(2).value ?? "").toBe("");
    expect(sheet.getRow(3).getCell(4).value).toBe("مسودة");
  });

  it("turns a Markdown table into a real Word table, not loose lines", async () => {
    const withTable = `## سير الدرس
| المرحلة | النشاط | الزمن |
|---|---|---|
| الانطلاق | وضعية مشكلة | 10 د |
| البناء | حل تمارين | 25 د |`;
    const lines = parseLines(withTable);
    // The |---| separator is dropped and marks the row above it as the header.
    expect(lines[1]).toEqual({
      type: "row",
      cells: ["المرحلة", "النشاط", "الزمن"],
      header: true,
    });
    expect(lines[2]).toEqual({ type: "blank" });
    expect(lines[3]).toEqual({
      type: "row",
      cells: ["الانطلاق", "وضعية مشكلة", "10 د"],
      header: false,
    });

    const buffer = await toDocx("تحضير درس", withTable);
    const files = unzipSync(new Uint8Array(buffer));
    const xml = Buffer.from(files["word/document.xml"]).toString("utf8");
    // A real <w:tbl> is the difference between a document the teacher prints
    // and one they have to rebuild by hand.
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("<w:tblHeader");
    expect(xml).toContain("وضعية مشكلة");
  });

  it("renders $...$ maths as Unicode instead of printing LaTeX", async () => {
    const withMaths = `الصيغة: $x^2 + 3x - 4 = 0$
- المميز $\\Delta = b^2 - 4ac$
- الحل $x_1 = \\frac{-b + \\sqrt{\\Delta}}{2a}$`;
    const lines = parseLines(withMaths);
    expect(lines[0]).toEqual({ type: "text", text: "الصيغة: x² + 3x - 4 = 0" });
    expect(lines[1]).toEqual({ type: "bullet", text: "المميز Δ = b² - 4ac" });
    expect(lines[2]).toEqual({
      type: "bullet",
      text: "الحل x₁ = (-b + √(Δ))/(2a)",
    });

    const buffer = await toDocx("درس", withMaths);
    const xml = Buffer.from(
      unzipSync(new Uint8Array(buffer))["word/document.xml"]
    ).toString("utf8");
    expect(xml).toContain("x² + 3x - 4 = 0");
    // No raw LaTeX and no stray dollar signs survive into the file.
    expect(xml).not.toContain("\\Delta");
    expect(xml).not.toContain("$");
  });

  it("keeps generated filenames safe for every OS", () => {
    expect(safeFileName('امتحان/2026: "الفصل"', "pdf")).toBe("امتحان 2026 الفصل.pdf");
    expect(safeFileName("   ", "docx")).toBe("nourix.docx");
  });
});
