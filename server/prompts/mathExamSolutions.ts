// Teacher assistant, module 3 — model solution + grading scale
// (التصحيح النموذجي وسلم التنقيط).
//
// This is the one module whose output is read by a machine as well as a
// human: module 4 (server/prompts/mathPaperGrading.ts) takes this JSON as an
// input, so the array shape below is a contract between the two calls, not a
// formatting preference. server/examSolutions.ts parses and validates it
// before anyone is allowed to grade against it.
//
// Template kept verbatim. Note the literal JSON braces in the output-format
// block — that is exactly why ./fillTemplate.ts checks for known placeholder
// names instead of any `{...}` shape.

import { fillTemplate } from "./fillTemplate";

export const MATH_EXAM_SOLUTIONS_TEMPLATE = `أنت خبير تصحيح رياضيات دقيق ومنهجي.

<المدخل>
نص الامتحان الكامل (سؤالاً سؤالاً): {نص_الامتحان}
</المدخل>

<المهمة>
لكل سؤال على حدة، أنتج:
1. "الحل": الحل الكامل خطوة بخطوة بدقة رياضية صارمة، بدون تخطي أي خطوة استدلال
2. "سلم_التنقيط": تفصيل دقيق — كم نقطة لكل خطوة أو فكرة رئيسية (وليس فقط للنتيجة النهائية)، مع الإشارة إلى النقاط الممنوحة على المنهجية الصحيحة حتى مع خطأ حسابي بسيط
3. "حلول_بديلة": إن وجدت طريقة أخرى شائعة لحل السؤال، اذكرها باختصار
4. "أخطاء_متوقعة": الأخطاء الشائعة التي قد يقع فيها التلميذ، وكيف يُتعامل معها في التصحيح (نقطة جزئية أم لا)
</المهمة>

<قيود>
- لا تفترض أي معطى غير موجود في نص السؤال
- كل خطوة في سلم التنقيط يجب أن تكون قابلة للتحقق بشكل موضوعي من طرف مصحح آخر
</قيود>

<صيغة_الإخراج>
أرجع النتيجة بصيغة JSON، مصفوفة من الكائنات، كل كائن يمثل سؤالاً:
{
  "رقم_السؤال": ...,
  "الحل": "...",
  "سلم_التنقيط": [{"الخطوة": "...", "النقاط": ...}],
  "حلول_بديلة": "...",
  "أخطاء_متوقعة": ["..."]
}
</صيغة_الإخراج>`;

// Asks for the bare array, because module 4 consumes it: any prose wrapped
// around the JSON is something server/examSolutions.ts then has to strip.
export const MATH_EXAM_SOLUTIONS_TRIGGER =
  "أنتج التصحيح النموذجي وسلم التنقيط الآن، وأرجع مصفوفة JSON فقط دون أي نص خارجها.";

export type MathExamSolutionsContext = {
  /** The full exam text, question by question — module 2's output, or the teacher's own paper. */
  examText: string;
};

export function fillMathExamSolutionsPrompt(
  context: MathExamSolutionsContext
): string {
  const examText = context.examText.trim();
  if (!examText) {
    throw new Error("Cannot produce a model solution for an empty exam text.");
  }
  return fillTemplate(MATH_EXAM_SOLUTIONS_TEMPLATE, {
    "{نص_الامتحان}": examText,
  });
}
