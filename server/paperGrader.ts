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
import {
  fillMathPaperGradingPrompt,
  MATH_PAPER_GRADING_TRIGGER,
  type MathPaperGradingContext,
} from "./prompts/mathPaperGrading";

/** Shown with every grading result — this is a draft mark, pending the teacher's review. */
// Worded to match the prompt's own constraint character for character, so
// the caveat the teacher reads is the same sentence Claude was held to.
export const PROVISIONAL_GRADING_NOTICE =
  "هذا التصحيح اقتراح أولي يخضع لمراجعة الأستاذ، وليس نهائياً";

/** Grades one student paper against a grading scale from module 3. */
export function gradeStudentPaper(
  context: MathPaperGradingContext
): Promise<ClaudeTextResult> {
  return askClaude({
    system: fillMathPaperGradingPrompt(context),
    user: MATH_PAPER_GRADING_TRIGGER,
  });
}
