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

  it("keeps generated filenames safe for every OS", () => {
    expect(safeFileName('امتحان/2026: "الفصل"', "pdf")).toBe("امتحان 2026 الفصل.pdf");
    expect(safeFileName("   ", "docx")).toBe("nourix.docx");
  });
});
