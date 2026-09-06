import { Document, Packer, Paragraph, TextRun } from "docx";
import type { GenerationRequest } from "../types";
import { bodyParagraph, headingParagraph, metaParagraph, titleParagraph, RTL_PARAGRAPH } from "./common";

export async function buildExamDocx(req: GenerationRequest): Promise<Buffer> {
  const children: Paragraph[] = [
    titleParagraph(req.examTitle),
    metaParagraph(`المستوى: ${req.gradeLevel} — عدد الأسئلة: ${req.questions.length} — المدة الزمنية: حسب توزيع الأستاذ`),
    new Paragraph({
      ...RTL_PARAGRAPH,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: "الاسم: .............................................", rightToLeft: true }),
        new TextRun({ text: "        القسم: ....................", rightToLeft: true, break: 1 }),
      ],
    }),
  ];

  req.questions.forEach((q, index) => {
    children.push(headingParagraph(`السؤال ${index + 1} (${q.points} ن)`));
    children.push(bodyParagraph(q.prompt));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
