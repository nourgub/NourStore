// Teacher assistant, module 2 — "تصميم الامتحانات" (exam design).
//
// Produces the exam paper only. The model solution and grading scale are a
// separate call (server/examSolutions.ts) so a teacher can print the paper
// without the answers having been generated next to it.
//
// Prompt: server/prompts/mathExamDesign.ts. Transport: server/claudeClient.ts.

import { askClaude, type ClaudeTextResult } from "./claudeClient";
import type { ExtractedAttachment } from "./attachments/extract";
import {
  fillMathExamDesignPrompt,
  MATH_EXAM_DESIGN_TRIGGER,
  type MathExamDesignContext,
} from "./prompts/mathExamDesign";

// Uploaded files here are model papers: the teacher's own past exams, or the
// official syllabus. The point is that the new paper comes out looking like
// theirs — same style, same weighting, same level of demand.
const EXAM_ATTACHMENT_NOTE =
  "المرفقات أعلاه من الأستاذ (امتحانات سابقة له، أو المنهاج الرسمي). اتبع أسلوب صياغتها ومستوى صعوبتها وطريقة توزيع نقاطها، واقتصر على المحاور التي تغطيها.";

/** Designs one exam paper (Markdown: header, then numbered questions with marks). */
export function designMathExam(
  context: MathExamDesignContext,
  attachments: ExtractedAttachment[] = []
): Promise<ClaudeTextResult> {
  return askClaude({
    system: fillMathExamDesignPrompt(context),
    user: attachments.length
      ? `${EXAM_ATTACHMENT_NOTE}\n\n${MATH_EXAM_DESIGN_TRIGGER}`
      : MATH_EXAM_DESIGN_TRIGGER,
    attachments,
  });
}
