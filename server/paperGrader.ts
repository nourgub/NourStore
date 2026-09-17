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

// ---------------------------------------------------------------------------
// Reading the proposed total back out of the report
// ---------------------------------------------------------------------------
//
// For ONE purpose: the audit record written when a teacher confirms a mark
// (server/routers/teacher.ts) should be able to say whether the human agreed
// with the machine or overruled it. It is never used to fill a mark in, never
// shown as a mark, and never sent to a learner — the teacher types the mark,
// always.
//
// The prompt asks for a free-form Arabic report ending in a total line, not
// for JSON, so this is best-effort by construction and therefore deliberately
// narrow: it reads a "number/number" only from a line that names the total, so
// a per-question "3/5" is never mistaken for the paper's mark. When the report
// does not state its total plainly the answer is null — an honest "unknown"
// beats a confident wrong number in an audit log.

export type SuggestedMark = { points: number; maxPoints: number };

/**
 * Arabic-Indic digits turn up in generated reports as often as Latin ones, and
 * so does the Arabic decimal separator (١٣٫٥).
 */
function toLatinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06f0-\u06f9\u066b]/g, character => {
    const code = character.charCodeAt(0);
    if (code === 0x066b) return ".";
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

const TOTAL_LINE =
  /النقطة\s+(?:الإجمالية|النهائية|الكلية)|المجموع\s+(?:العام|الكلي|النهائي)|(?:^|[|\s])المجموع(?:$|[\s:|])/;
const FRACTION = /(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/;

/**
 * The total the report proposes, or null when it does not state one in a form
 * this can read without guessing.
 */
export function suggestedMarkFromReport(report: string): SuggestedMark | null {
  const lines = toLatinDigits(report).split(/\r?\n/);
  // Last match wins: the total is written at the end, after the per-question
  // rows, and a report that repeats it repeats the same number.
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!TOTAL_LINE.test(line)) continue;
    const match = line.match(FRACTION);
    if (!match) continue;
    const points = Number(match[1].replace(",", "."));
    const maxPoints = Number(match[2].replace(",", "."));
    if (!Number.isFinite(points) || !Number.isFinite(maxPoints)) continue;
    if (maxPoints <= 0 || points < 0 || points > maxPoints) continue;
    return { points, maxPoints };
  }
  return null;
}
