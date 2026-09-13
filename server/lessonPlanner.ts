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
import {
  fillMathLessonPlanPrompt,
  MATH_LESSON_PLAN_TRIGGER,
  type MathLessonPlanContext,
} from "./prompts/mathLessonPlan";

/** Generates one Arabic maths lesson plan (Markdown, six `##` sections). */
export function generateMathLessonPlan(
  context: MathLessonPlanContext
): Promise<ClaudeTextResult> {
  return askClaude({
    system: fillMathLessonPlanPrompt(context),
    user: MATH_LESSON_PLAN_TRIGGER,
  });
}
