// Teacher assistant, module 1 — "تحضير الدروس" (maths lesson preparation).
//
// One Claude call: the teacher gives a level, a topic, a lesson length and
// (optionally) the class's prior knowledge, and gets back a full Arabic
// lesson plan — objectives, a real-world hook, a timed breakdown, two worked
// examples, four graded exercises, and the three mistakes this topic
// reliably produces.
//
// The pedagogical contract lives in server/prompts/mathLessonPlan.ts; the
// transport, and the "off unless configured" rule every module here obeys,
// live in server/claudeClient.ts.

import { askClaude, type ClaudeTextResult } from "./claudeClient";
import type { ExtractedAttachment } from "./attachments/extract";
import {
  fillMathLessonPlanPrompt,
  MATH_LESSON_PLAN_TRIGGER,
  type MathLessonPlanContext,
} from "./prompts/mathLessonPlan";

/**
 * What the teacher's uploaded files mean for this module: they are the
 * reference the plan must follow — the official syllabus, an earlier lesson
 * of theirs, the textbook page. This is the honest version of "learn from my
 * files": the model reads them for this request, it is not trained on them.
 */
const LESSON_ATTACHMENT_NOTE =
  "المرفقات أعلاه من الأستاذ (المنهاج، أو درس سابق، أو صفحة من الكتاب). اعتمدها مرجعاً: التزم بمحتواها ومصطلحاتها وأسلوب عرضها، ولا تخرج عمّا فيها إن كانت تغطي الموضوع.";

/** Generates one Arabic maths lesson plan (Markdown, six `##` sections). */
export function generateMathLessonPlan(
  context: MathLessonPlanContext,
  attachments: ExtractedAttachment[] = []
): Promise<ClaudeTextResult> {
  return askClaude({
    system: fillMathLessonPlanPrompt(context),
    user: attachments.length
      ? `${LESSON_ATTACHMENT_NOTE}\n\n${MATH_LESSON_PLAN_TRIGGER}`
      : MATH_LESSON_PLAN_TRIGGER,
    attachments,
  });
}
