// Teacher assistant, module 4 — grading a student's paper against module 3's
// grading scale (تصحيح أوراق التلاميذ).
//
// Two things this module is NOT:
//   - It is not an OCR step. Nothing in this codebase reads handwriting; the
//     `studentAnswerText` it receives is whatever text the teacher pastes in
//     (typed, or produced by an OCR tool of their own). The prompt's
//     "بعد OCR" wording describes where that text tends to come from.
//   - It is not a final mark. The prompt says so, the API response repeats
//     it, and the UI repeats it again: this is a suggestion for the teacher
//     to review, and an unreadable passage must be reported as unreadable
//     rather than guessed at.
//
// Template kept verbatim.

import { fillTemplate } from "./fillTemplate";

export const MATH_PAPER_GRADING_TEMPLATE = `أنت مصحّح رياضيات آلي دقيق وعادل.

<المدخلات>
التصحيح النموذجي وسلم التنقيط (من الوحدة 3): {json_التصحيح_النموذجي}
نص إجابة التلميذ بعد OCR: {نص_إجابة_التلميذ}
</المدخلات>

<المهمة>
لكل سؤال:
1. قارن منهجية التلميذ بالحل النموذجي خطوة بخطوة (وليس فقط مطابقة النتيجة النهائية)
2. امنح نقاطاً جزئية حسب سلم التنقيط، حتى مع خطأ حسابي بسيط إذا كانت المنهجية صحيحة
3. صنّف كل خطأ: [مفاهيمي / حسابي / منهجي / غير واضح بسبب OCR]
4. اكتب ملاحظة تقييمية موجزة (سطرين كحد أقصى) بناءة وموجهة للتلميذ
5. احسب مجموع النقطة لهذا السؤال، ثم النقطة الإجمالية للامتحان
</المهمة>

<قيود_مهمة>
- إذا كان نص OCR غامضاً أو غير مقروء في جزء ما، صرّح بذلك صراحة ("جزء غير واضح، يُرجى المراجعة اليدوية") ولا تخمّن
- لا تمنح نقاطاً كاملة إلا إذا كانت الخطوة مطابقة فعلاً لما في سلم التنقيط
- هذا التصحيح اقتراح أولي يخضع لمراجعة الأستاذ، وليس نهائياً
</قيود_مهمة>

<صيغة_الإخراج>
تقرير منظم لكل سؤال (رقم | النقطة المحصلة/الممكنة | الأخطاء | الملاحظة) ثم سطر أخير بالنقطة الإجمالية
</صيغة_الإخراج>`;

export const MATH_PAPER_GRADING_TRIGGER =
  "صحّح ورقة التلميذ الآن وفق التعليمات أعلاه.";

export type MathPaperGradingContext = {
  /** Module 3's JSON, exactly as it will be reasoned over — see server/examSolutions.ts. */
  solutionsJson: string;
  /** The student's answer as text. Not produced here; see the note at the top of this file. */
  studentAnswerText: string;
};

export function fillMathPaperGradingPrompt(
  context: MathPaperGradingContext
): string {
  const solutionsJson = context.solutionsJson.trim();
  const studentAnswerText = context.studentAnswerText.trim();
  if (!solutionsJson) {
    throw new Error("Cannot grade a paper without the module 3 grading scale.");
  }
  if (!studentAnswerText) {
    throw new Error("Cannot grade an empty student answer.");
  }
  return fillTemplate(MATH_PAPER_GRADING_TEMPLATE, {
    "{json_التصحيح_النموذجي}": solutionsJson,
    "{نص_إجابة_التلميذ}": studentAnswerText,
  });
}
