import { AlignmentType, HeadingLevel, Paragraph, TextRun } from "docx";
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
