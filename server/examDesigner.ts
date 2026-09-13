// Teacher assistant, module 2 — "تصميم الامتحانات" (exam design).
//
// Produces the exam paper only. The model solution and grading scale are a
// separate call (server/examSolutions.ts) so a teacher can print the paper
// without the answers having been generated next to it.
//
// Prompt: server/prompts/mathExamDesign.ts. Transport: server/claudeClient.ts.

import { askClaude, type ClaudeTextResult } from "./claudeClient";
import {
  fillMathExamDesignPrompt,
  MATH_EXAM_DESIGN_TRIGGER,
  type MathExamDesignContext,
} from "./prompts/mathExamDesign";

/** Designs one exam paper (Markdown: header, then numbered questions with marks). */
export function designMathExam(
  context: MathExamDesignContext
): Promise<ClaudeTextResult> {
  return askClaude({
    system: fillMathExamDesignPrompt(context),
    user: MATH_EXAM_DESIGN_TRIGGER,
  });
}
