import { AlignmentType, HeadingLevel, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { lineToRuns } from "./mathText";

export const RTL_PARAGRAPH = { bidirectional: true, alignment: AlignmentType.RIGHT } as const;

export function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    ...RTL_PARAGRAPH,
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text, rightToLeft: true })],
  });
}

export function headingParagraph(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({
    ...RTL_PARAGRAPH,
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, rightToLeft: true, bold: true })],
  });
}

// Lines may contain inline math written as $...$ (e.g. "$x^2 + 1$",
// "$\frac{a}{b}$") — lineToRuns renders those as super/subscript runs with
// a small set of LaTeX-command-to-Unicode substitutions instead of a full
// LaTeX toolchain. Plain text with no "$" renders exactly as before.
export function bodyParagraph(text: string, opts: { bold?: boolean } = {}): Paragraph {
  return new Paragraph({
    ...RTL_PARAGRAPH,
    spacing: { after: 120 },
    children: text.split("\n").flatMap((line, i) => lineToRuns(line, { rightToLeft: true, bold: opts.bold }, i > 0)),
  });
}

export function metaParagraph(text: string): Paragraph {
  return new Paragraph({
    ...RTL_PARAGRAPH,
    spacing: { after: 200 },
    children: [new TextRun({ text, rightToLeft: true, italics: true, color: "555555" })],
  });
}

// A single "label: value" line, math-aware via bodyParagraph's lineToRuns.
export function labelValueParagraph(label: string, value: string): Paragraph {
  return bodyParagraph(`${label}: ${value || "—"}`, { bold: false });
}

// Wraps paragraphs in a bordered single-cell table — the simplest way to get
// a visible box (like the info/notes boxes on an official lesson-prep form)
// since docx has no standalone "bordered div" primitive outside a table.
export function boxedSection(children: Paragraph[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            children,
            margins: { top: 150, bottom: 150, left: 150, right: 150 },
          }),
        ],
      }),
    ],
  });
}

export function tableCell(text: string, opts: { header?: boolean; widthPct: number }): TableCell {
  return new TableCell({
    width: { size: opts.widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        ...RTL_PARAGRAPH,
        children: lineToRuns(text, { rightToLeft: true, bold: opts.header }),
      }),
    ],
  });
}
