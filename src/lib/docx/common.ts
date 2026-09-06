import { AlignmentType, HeadingLevel, Paragraph, TextRun } from "docx";

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

export function bodyParagraph(text: string, opts: { bold?: boolean } = {}): Paragraph {
  return new Paragraph({
    ...RTL_PARAGRAPH,
    spacing: { after: 120 },
    children: text.split("\n").flatMap((line, i, arr) => {
      const run = new TextRun({ text: line, rightToLeft: true, bold: opts.bold, break: i > 0 ? 1 : undefined });
      return [run];
    }),
  });
}

export function metaParagraph(text: string): Paragraph {
  return new Paragraph({
    ...RTL_PARAGRAPH,
    spacing: { after: 200 },
    children: [new TextRun({ text, rightToLeft: true, italics: true, color: "555555" })],
  });
}
