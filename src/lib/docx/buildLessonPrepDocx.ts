import { Document, Packer, Paragraph } from "docx";
import type { LessonPrepRequest } from "../types";
import { bodyParagraph, headingParagraph, metaParagraph, titleParagraph } from "./common";

export async function buildLessonPrepDocx(req: LessonPrepRequest): Promise<Buffer> {
  const children: Paragraph[] = [
    titleParagraph(`تحضير الدرس — ${req.lessonTitle}`),
    metaParagraph(
      `المستوى: ${req.gradeLevel}` +
        (req.sourceFileNames.length > 0 ? ` — بالاستناد إلى: ${req.sourceFileNames.join("، ")}` : ""),
    ),
  ];

  req.sections.forEach((s) => {
    children.push(headingParagraph(s.heading));
    children.push(bodyParagraph(s.body));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
