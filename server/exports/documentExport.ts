// Turns what the teacher assistant produced into a file they can print, send
// on WhatsApp, or hand to the administration: Word (.docx), PDF, or Excel
// (.xlsx) for a class marks sheet.
//
// Arabic is the whole difficulty here, and it is solved rather than
// sidestepped:
//   - PDF reuses exactly what server/certificatePdf.ts proved works in this
//     codebase — the bundled, uncompressed NotoNaskhArabic.ttf plus PDFKit's
//     `features: ["rtla"]`, which is what actually produces correctly
//     shaped, right-to-left-ordered Arabic glyphs.
//   - Word gets `bidirectional: true` on every paragraph and RIGHT
//     alignment, so Word itself lays the text out right-to-left.
//   - Excel gets the sheet's own rightToLeft view flag.
//
// The input is the Markdown-ish text the modules return. This is a
// deliberately small renderer — headings, list items, table rows and
// paragraphs — not a full Markdown engine: enough to make a generated lesson
// or exam read like a document, and honest about the rest by leaving it as
// plain text rather than mangling it.

import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

export type ExportFormat = "docx" | "pdf" | "xlsx";

const ARABIC_FONT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "fonts",
  "NotoNaskhArabic.ttf"
);

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

type Line =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "bullet"; text: string }
  | { type: "blank" }
  | { type: "text"; text: string };

/** Reads the modules' Markdown-ish output into the few shapes worth styling. */
export function parseLines(body: string): Line[] {
  // Markdown emphasis markers would be printed as literal asterisks in a
  // document, so they come off every line — headings and list items included,
  // which is exactly where a generated lesson plan puts them.
  const plain = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(^|\s)\*(\S.*?\S|\S)\*(?=\s|$)/g, "$1$2")
      .trim();
  return body.split(/\r?\n/).map<Line>(raw => {
    const line = raw.trim();
    if (!line) return { type: "blank" };
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading)
      return {
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: plain(heading[2]),
      };
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) return { type: "bullet", text: plain(bullet[1]) };
    return { type: "text", text: plain(line) };
  });
}

/** A Word document, laid out right-to-left. */
export async function toDocx(title: string, body: string): Promise<Buffer> {
  const heading = (text: string, level: 1 | 2 | 3) =>
    new Paragraph({
      heading:
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3,
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text, rightToLeft: true })],
    });
  const paragraphs: Paragraph[] = [heading(title, 1)];
  for (const line of parseLines(body)) {
    if (line.type === "blank") {
      paragraphs.push(new Paragraph({ children: [] }));
    } else if (line.type === "heading") {
      paragraphs.push(heading(line.text, line.level === 1 ? 2 : line.level));
    } else {
      paragraphs.push(
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          bullet: line.type === "bullet" ? { level: 0 } : undefined,
          children: [new TextRun({ text: line.text, rightToLeft: true })],
        })
      );
    }
  }
  const document = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(document);
}

/** A PDF, using the same Arabic font and shaping the certificates use. */
export function toPdf(title: string, body: string): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
  });
  doc.registerFont("Arabic", ARABIC_FONT_PATH);
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // `rtla` is fontkit's right-to-left Arabic feature — without it the glyphs
  // come out in visual left-to-right order, which looks like gibberish to an
  // Arabic reader even though every character is "there".
  const write = (text: string, size: number, gap: number) => {
    doc
      .font("Arabic")
      .fontSize(size)
      .text(text, {
        align: "right",
        features: ["rtla"],
      });
    doc.moveDown(gap);
  };

  write(title, 18, 0.8);
  for (const line of parseLines(body)) {
    if (line.type === "blank") doc.moveDown(0.4);
    else if (line.type === "heading")
      write(line.text, line.level === 1 ? 15 : 13, 0.4);
    else if (line.type === "bullet") write(`• ${line.text}`, 11, 0.2);
    else write(line.text, 11, 0.2);
  }
  doc.end();
  return done;
}

export type MarksSheetRow = {
  student: string;
  finalPoints: number | null;
  maxPoints: number | null;
  status: string;
  notes: string | null;
  date: Date | null;
};

/**
 * The class marks sheet: one row per graded paper, right-to-left, ready to be
 * handed to the administration or pasted into a school system. Drafts are
 * included but marked as drafts — a mark the teacher has not confirmed must
 * never look like a final one in a spreadsheet either.
 */
export async function toMarksXlsx(
  title: string,
  rows: MarksSheetRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 28) || "النتائج", {
    views: [{ rightToLeft: true }],
  });
  sheet.columns = [
    { header: "التلميذ", key: "student", width: 28 },
    { header: "النقطة", key: "finalPoints", width: 10 },
    { header: "من", key: "maxPoints", width: 10 },
    { header: "الحالة", key: "status", width: 14 },
    { header: "ملاحظة", key: "notes", width: 40 },
    { header: "التاريخ", key: "date", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({
      student: row.student,
      finalPoints: row.finalPoints ?? "",
      maxPoints: row.maxPoints ?? "",
      status: row.status,
      notes: row.notes ?? "",
      date: row.date ? row.date.toISOString().slice(0, 10) : "",
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Keeps a generated filename safe for every OS and for a Content-Disposition header. */
export function safeFileName(base: string, format: ExportFormat): string {
  const cleaned = base
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${cleaned || "nourix"}.${format}`;
}
