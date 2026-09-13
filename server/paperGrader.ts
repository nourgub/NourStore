// Teacher assistant, module 4 — "تصحيح أوراق التلاميذ" (grading a student's
// paper against module 3's grading scale).
//
// Two boundaries this module keeps, and the UI repeats:
//   - No OCR happens here. `studentAnswerText` is text the teacher pastes in
//     (typed, or produced by an OCR tool of their own). Claiming otherwise
//     would promise a pipeline this codebase does not have.
//   - The result is a SUGGESTION for the teacher to review, never a final
//     mark — the prompt says so, and the endpoint returns it alongside the
//     report so the UI cannot quietly drop the caveat.
//
// Prompt: server/prompts/mathPaperGrading.ts. Transport: server/claudeClient.ts.

import { askClaude, type ClaudeTextResult } from "./claudeClient";
import type { ExtractedAttachment } from "./attachments/extract";
import {
  ANSWER_IN_ATTACHMENT,
  fillMathPaperGradingPrompt,
  MATH_PAPER_GRADING_TRIGGER,
  type MathPaperGradingContext,
} from "./prompts/mathPaperGrading";

/** Shown with every grading result — this is a draft mark, pending the teacher's review. */
// Worded to match the prompt's own constraint character for character, so
// the caveat the teacher reads is the same sentence Claude was held to.
export const PROVISIONAL_GRADING_NOTICE =
  "هذا التصحيح اقتراح أولي يخضع لمراجعة الأستاذ، وليس نهائياً";

// The pupil's paper is usually a photograph or a scan. Claude reads images
// and PDFs itself, so this is the whole of the "OCR" story — and the prompt's
// existing rule still governs it: an unreadable passage is declared
// unreadable, never guessed at.
const GRADING_ATTACHMENT_NOTE =
  "ورقة التلميذ في المرفقات أعلاه (صورة أو PDF أو ملف). اقرأها بنفسك، وإن كان جزء منها غير واضح فصرّح بذلك ولا تخمّن ما فيه.";

/** Grades one student paper against a grading scale from module 3. */
export function gradeStudentPaper(
  context: MathPaperGradingContext,
  attachments: ExtractedAttachment[] = []
): Promise<ClaudeTextResult> {
  return askClaude({
    system: fillMathPaperGradingPrompt({
      solutionsJson: context.solutionsJson,
      studentAnswerText:
        context.studentAnswerText.trim() ||
        (attachments.length ? ANSWER_IN_ATTACHMENT : ""),
    }),
    user: attachments.length
      ? `${GRADING_ATTACHMENT_NOTE}\n\n${MATH_PAPER_GRADING_TRIGGER}`
      : MATH_PAPER_GRADING_TRIGGER,
    attachments,
  });
}
