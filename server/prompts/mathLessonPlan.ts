// The Arabic maths lesson-preparation prompt used by server/lessonPlanner.ts.
//
// This is the "تحضير الدروس" (lesson preparation) module of the teacher
// assistant: one Claude call that turns a level + topic + lesson length into
// a complete, ready-to-teach lesson plan in Arabic.
//
// The template below is kept VERBATIM as the pedagogical author wrote it —
// section order, wording and the six required output sections are the
// teaching contract, not implementation detail. Change it deliberately (and
// re-read server/lessonPlanner.test.ts, which pins the six sections), never
// incidentally while refactoring around it.
//
// Placeholders are written `{...}` rather than `${...}` on purpose: this file
// is a template *string*, and fillMathLessonPlanPrompt() is the only thing
// allowed to substitute into it, so a missing field fails loudly (see the
// leftover-placeholder check) instead of silently reaching Claude as the
// literal word "undefined".

export const MATH_LESSON_PLAN_TEMPLATE = `أنت مساعد بيداغوجي متخصص في تدريس الرياضيات.

<السياق>
المستوى الدراسي: {المستوى}
عنوان الدرس أو المحور: {العنوان}
المدة الزمنية للحصة: {المدة} دقيقة
المكتسبات القبلية للتلاميذ: {المكتسبات}
</السياق>

<المهمة>
حضّر درساً كاملاً باتباع الخطوات التالية بالترتيب:
1. اكتب 2-3 أهداف تعلمية بصيغة قابلة للقياس (مثال: "يكون التلميذ قادراً على حل معادلة من الدرجة الثانية باستعمال المميز")
2. اقترح وضعية استهلالية (مشكلة واقعية قصيرة تحفز التلميذ على طرح السؤال الرياضي)
3. فصّل سير الدرس في جدول: [المرحلة | النشاط | الزمن بالدقائق]
4. أعط مثالين محلولين بالتفصيل، بخط استدلال واضح خطوة بخطوة
5. اقترح 4 تمارين تطبيقية: تمرين مباشر، تمرين متوسط، تمرين تركيبي، وتمرين تحدي (اختياري)
6. اذكر 3 أخطاء شائعة متوقعة عند التلاميذ حول هذا المحور، مع كيفية تصحيحها
</المهمة>

<قيود>
- التزم حرفياً بالمنهج الرسمي لمستوى {المستوى}
- استعمل صياغة رياضية دقيقة، وضع الصيغ بين $...$ لسهولة القراءة
- لا تتجاوز الزمن الإجمالي {المدة} دقيقة
- إن كانت المعطيات ناقصة (مثلاً المستوى غير محدد)، اسأل قبل المتابعة
</قيود>

<صيغة_الإخراج>
أرجع النتيجة بعناوين واضحة (##) لكل قسم من الأقسام الستة أعلاه، دون مقدمات.
</صيغة_الإخراج>`;

/**
 * The single user turn. The filled template above carries every instruction,
 * so this only has to hand the turn over — the Messages API requires the
 * conversation to start with a user message, it cannot be system-only.
 */
export const MATH_LESSON_PLAN_TRIGGER = "حضّر الدرس الآن وفق التعليمات أعلاه.";

/**
 * What a teacher fills in for one lesson. `priorKnowledge` is deliberately
 * optional: the prompt's own last constraint tells Claude to ASK when the
 * context is incomplete, so an empty field produces a clarifying question
 * rather than a plan invented on top of assumed prerequisites.
 */
export type MathLessonPlanContext = {
  /** e.g. "السنة الرابعة متوسط" / "3AS شعبة رياضيات" — free text, the official level label. */
  level: string;
  /** Lesson or unit title, e.g. "المعادلات من الدرجة الثانية". */
  topic: string;
  /** Lesson length in minutes — also the hard ceiling on the timed breakdown. */
  durationMinutes: number;
  /** What learners are assumed to already master. Omitted/blank => "غير محددة". */
  priorKnowledge?: string;
};

/** Substituted for a blank `priorKnowledge`, so the gap is stated, not hidden. */
export const UNSPECIFIED_PRIOR_KNOWLEDGE = "غير محددة";

/**
 * Fills the template. Throws rather than returning a half-filled prompt: a
 * leftover `{...}` would otherwise reach Claude as a literal placeholder and
 * come back as a plausible-looking plan for the wrong level.
 */
export function fillMathLessonPlanPrompt(
  context: MathLessonPlanContext
): string {
  const priorKnowledge =
    context.priorKnowledge?.trim() || UNSPECIFIED_PRIOR_KNOWLEDGE;
  const filled = MATH_LESSON_PLAN_TEMPLATE.replaceAll(
    "{المستوى}",
    context.level.trim()
  )
    .replaceAll("{العنوان}", context.topic.trim())
    .replaceAll("{المدة}", String(context.durationMinutes))
    .replaceAll("{المكتسبات}", priorKnowledge);
  const leftover = filled.match(/\{[^}\n]+\}/);
  if (leftover) {
    throw new Error(
      `Math lesson prompt still contains an unfilled placeholder: ${leftover[0]}`
    );
  }
  return filled;
}
