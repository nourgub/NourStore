import { Document, Packer, Paragraph } from "docx";
import type { GenerationRequest } from "../types";
import { bodyParagraph, headingParagraph, metaParagraph, titleParagraph } from "./common";

export async function buildSolutionDocx(req: GenerationRequest): Promise<Buffer> {
  const children: Paragraph[] = [
    titleParagraph(`الحل النموذجي — ${req.examTitle}`),
    metaParagraph(`المستوى: ${req.gradeLevel} — عدد الأسئلة: ${req.questions.length}`),
  ];

  req.questions.forEach((q, index) => {
    children.push(headingParagraph(`السؤال ${index + 1} (${q.points} ن) — المحور: ${q.topic}`));
    children.push(bodyParagraph(q.prompt, { bold: true }));
    children.push(bodyParagraph(`الحل:\n${q.solution}`));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
