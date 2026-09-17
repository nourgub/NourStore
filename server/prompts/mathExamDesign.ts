// Teacher assistant, module 2 — exam design (تصميم الامتحانات).
//
// Produces the exam paper only: no solutions, no hints. Module 3
// (server/prompts/mathExamSolutions.ts) is what turns that paper into a
// model solution and a grading scale, and it is a separate call on purpose —
// a teacher must be able to print the paper without the answers ever having
// been generated alongside it.
//
// Template kept verbatim; see ./fillTemplate.ts for why the placeholder
// check works the way it does.

import { fillTemplate } from "./fillTemplate";

export const MATH_EXAM_DESIGN_TEMPLATE = `أنت مصمم امتحانات رياضيات محترف.

<السياق>
المستوى: {المستوى}
المحاور المطلوبة: {قائمة المحاور}
مدة الامتحان: {المدة} دقيقة
النقطة الإجمالية: {عادة 20}
</السياق>

<المهمة>
صمم امتحاناً يحقق:
1. توازن التغطية: وزّع الأسئلة على المحاور حسب أهميتها النسبية في المنهج (اذكر النسبة المخصصة لكل محور)
2. تنوع الصياغة: امزج بين تطبيق مباشر، حل مسألة، وبرهان/تعليل
3. تدرّج الصعوبة: رتّب الأسئلة من الأسهل إلى الأصعب
4. لكل سؤال، حدد وزنه بالنقاط بما يتناسب مع الزمن المقدر لحله
</المهمة>

<قيود>
- لا تُدرج أي حل أو تلميح إلى الحل في هذه المرحلة
- الصياغة يجب أن تكون واضحة تماماً ولا تحتمل أكثر من تأويل واحد
- تأكد أن مجموع النقاط = {النقطة الإجمالية} بالضبط
</قيود>

<صيغة_الإخراج>
[رأس الامتحان: المستوى، المدة، التعليمات العامة]
ثم قائمة مرقمة للأسئلة، كل سؤال يتضمن: رقمه، نصه، عدد نقاطه بين قوسين
</صيغة_الإخراج>`;

export const MATH_EXAM_DESIGN_TRIGGER =
  "صمّم الامتحان الآن وفق التعليمات أعلاه.";

export type MathExamDesignContext = {
  /** Official level label, e.g. "السنة الرابعة متوسط". */
  level: string;
  /** The units to cover, e.g. ["المعادلات", "الدوال", "الهندسة الفضائية"]. */
  topics: string[];
  /** Exam length in minutes — drives how the points are spread. */
  durationMinutes: number;
  /** Total mark the questions must add up to exactly (20 in Algerian practice). */
  totalPoints: number;
};

export function fillMathExamDesignPrompt(
  context: MathExamDesignContext
): string {
  const topics = context.topics.map(topic => topic.trim()).filter(Boolean);
  if (!topics.length) {
    throw new Error("An exam needs at least one topic (قائمة المحاور).");
  }
  const totalPoints = String(context.totalPoints);
  return fillTemplate(MATH_EXAM_DESIGN_TEMPLATE, {
    "{المستوى}": context.level.trim(),
    "{قائمة المحاور}": topics.join("، "),
    "{المدة}": String(context.durationMinutes),
    // The template names the same value twice, under two different markers:
    // "{عادة 20}" in the context block and "{النقطة الإجمالية}" in the
    // constraint that the points must sum exactly. Both get the real total,
    // or Claude would be told to hit a mark nobody asked for.
    "{عادة 20}": totalPoints,
    "{النقطة الإجمالية}": totalPoints,
  });
}
