import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { GenerationRequest } from "../types";
import { RTL_PARAGRAPH, headingParagraph, metaParagraph, titleParagraph } from "./common";

function cell(text: string, opts: { header?: boolean; widthPct: number }): TableCell {
  return new TableCell({
    width: { size: opts.widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        ...RTL_PARAGRAPH,
        children: [new TextRun({ text, rightToLeft: true, bold: opts.header })],
      }),
    ],
  });
}

export async function buildRubricDocx(req: GenerationRequest): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    titleParagraph(`شبكة التنقيط — ${req.examTitle}`),
    metaParagraph(`المستوى: ${req.gradeLevel} — المجموع الكلي: 20 نقطة`),
  ];

  req.questions.forEach((q, index) => {
    children.push(headingParagraph(`السؤال ${index + 1} (${q.points} ن) — المحور: ${q.topic}`));
    const rows = [
      new TableRow({
        children: [cell("معيار التصحيح", { header: true, widthPct: 75 }), cell("النقطة", { header: true, widthPct: 25 })],
      }),
      ...q.rubric.map(
        (r) =>
          new TableRow({
            children: [cell(r.criterion, { widthPct: 75 }), cell(String(r.points), { widthPct: 25 })],
          }),
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
