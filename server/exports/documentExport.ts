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
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { renderMathText } from "../../shared/mathText";

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
  | { type: "row"; cells: string[]; header: boolean }
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
  // Maths first: the $...$ spans become readable Unicode before anything is
  // split into lines or cells.
  const lines = renderMathText(body).split(/\r?\n/);
  return lines.map<Line>((raw, index) => {
    const line = raw.trim();
    if (!line) return { type: "blank" };
    // A Markdown table row: | المرحلة | النشاط | الزمن |. The separator row
    // (|---|---|) marks the line above it as the header and is itself
    // dropped — printing "---" inside a Word table would be absurd.
    if (/^\|.*\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map(text => plain(text));
      if (cells.every(text => /^:?-{2,}:?$/.test(text.replace(/\s/g, "")))) {
        return { type: "blank" };
      }
      const next = (lines[index + 1] ?? "").trim();
      const header = /^\|[\s:|-]+\|$/.test(next) && next.includes("-");
      return { type: "row", cells, header };
    }
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
  const cell = (text: string, header: boolean) =>
    new TableCell({
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text, rightToLeft: true, bold: header })],
        }),
      ],
    });
  const blocks: (Paragraph | Table)[] = [heading(title, 1)];
  const lines = parseLines(body);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.type === "row") {
      // Consecutive row lines are ONE table. A timed lesson breakdown that
      // prints as loose lines is exactly what a teacher would have to redo
      // by hand before handing it in.
      const rows: Extract<Line, { type: "row" }>[] = [];
      while (index < lines.length) {
        const candidate = lines[index];
        if (candidate.type !== "row") break;
        rows.push(candidate);
        index += 1;
      }
      index -= 1;
      blocks.push(
        new Table({
          visuallyRightToLeft: true,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map(
            (row, rowIndex) =>
              new TableRow({
                tableHeader: rowIndex === 0 && row.header,
                children: row.cells.map(text =>
                  cell(text, rowIndex === 0 && row.header)
                ),
              })
          ),
        })
      );
      continue;
    }
    if (line.type === "blank") {
      blocks.push(new Paragraph({ children: [] }));
    } else if (line.type === "heading") {
      blocks.push(heading(line.text, line.level === 1 ? 2 : line.level));
    } else {
      blocks.push(
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          bullet: line.type === "bullet" ? { level: 0 } : undefined,
          children: [new TextRun({ text: line.text, rightToLeft: true })],
        })
      );
    }
  }
  const document = new Document({ sections: [{ children: blocks }] });
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
    else if (line.type === "row")
      // PDFKit has no table primitive; the cells are drawn as one
      // right-aligned line with separators, which stays legible in print
      // without pretending to be a ruled table.
      write(line.cells.join("   |   "), line.header ? 11 : 10.5, 0.15);
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
