// Tafawoq AI Teacher — offline generators.
//
// Used when ANTHROPIC_API_KEY is not configured, or when a model call
// fails or returns something that doesn't pass validation. They are built
// from the same student model as the AI path (tier, focus skills,
// recurring errors, name), so the experience stays personal — just less
// rich — rather than silently degrading to a generic lesson.
import type { PersonalLesson, VideoScene, VideoScript } from "@shared/tafawoq";
import { TIER_LABELS_AR } from "@shared/tafawoq";
import type { BankQuestion, Lesson } from "./curriculum";
import type { StudentContext } from "./context";
import { normalizeAnswer } from "./grading";
import { targetDifficulty } from "./studentModel";

export type ExercisePlanItem = { skill: string; difficulty: 1 | 2 | 3 };

/**
 * Which skill/difficulty each practice item should target. The weakest
 * focus skill gets the most items; difficulty sits just above the
 * student's current mastery of that skill (zone of proximal development).
 * Once everything is mastered, practice becomes mixed hard review.
 */
export function buildExercisePlan(context: StudentContext, count = 5): ExercisePlanItem[] {
  const focus = [...context.focusSkills].sort((a, b) => a.mastery - b.mastery);
  if (!focus.length) {
    const review = [...context.skills].sort((a, b) => a.mastery - b.mastery);
    return Array.from({ length: count }, (_, index) => ({
      skill: review[index % review.length].key,
      difficulty: 3 as const,
    }));
  }
  const weights = focus.map((_, index) => focus.length - index);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const plan: ExercisePlanItem[] = [];
  focus.forEach((skill, index) => {
    const share =
      index === focus.length - 1
        ? count - plan.length
        : Math.max(1, Math.round((weights[index] / total) * count));
    for (let i = 0; i < share && plan.length < count; i += 1) {
      // Ramp within a skill: start one step easier, finish at target.
      const target = targetDifficulty(skill.mastery);
      const difficulty = (i === 0 && target > 1 ? target - 1 : target) as 1 | 2 | 3;
      plan.push({ skill: skill.key, difficulty });
    }
  });
  return plan;
}

export function templateExercises(
  lesson: Lesson,
  plan: ExercisePlanItem[],
  avoidIds: Set<string>,
  /** Skills to borrow from, in order, once a planned skill's bank runs out. */
  fallbackSkills: string[] = []
): BankQuestion[] {
  const used = new Set<string>();
  const closest = (pool: BankQuestion[], difficulty: number) =>
    pool
      .slice()
      .sort(
        (a, b) =>
          Number(avoidIds.has(a.id)) - Number(avoidIds.has(b.id)) ||
          Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty)
      )[0];
  return plan.map(item => {
    const order = [item.skill, ...fallbackSkills.filter(skill => skill !== item.skill)];
    let chosen: BankQuestion | undefined;
    for (const skill of order) {
      const pool = lesson.bank.filter(question => question.skill === skill && !used.has(question.id));
      // Prefer items the student hasn't already seen in the placement test.
      const fresh = pool.filter(question => !avoidIds.has(question.id));
      chosen = fresh.length ? closest(fresh, item.difficulty) : undefined;
      if (chosen) break;
    }
    chosen ??=
      closest(lesson.bank.filter(question => question.skill === item.skill && !used.has(question.id)), item.difficulty) ??
      closest(lesson.bank.filter(question => !used.has(question.id)), item.difficulty) ??
      lesson.bank[0];
    used.add(chosen.id);
    return chosen;
  });
}

function sectionSkills(context: StudentContext) {
  if (context.focusSkills.length) return context.focusSkills;
  // Everything mastered: enrichment on the two least-solid skills.
  return [...context.skills].sort((a, b) => a.mastery - b.mastery).slice(0, 2);
}

export function templateLesson(lesson: Lesson, context: StudentContext): PersonalLesson {
  const sections = sectionSkills(context).map(focus => {
    const skill = lesson.skills.find(entry => entry.key === focus.key)!;
    const bankExamples = lesson.bank
      .filter(
        question =>
          question.skill === skill.key &&
          normalizeAnswer(question.answer) !== normalizeAnswer(skill.example.answer)
      )
      .sort((a, b) =>
        context.tier === "advanced" ? b.difficulty - a.difficulty : a.difficulty - b.difficulty
      )
      .slice(0, context.tier === "weak" ? 2 : 1)
      .map(question => ({
        problem: question.prompt,
        steps: [question.explanation],
        answer: question.answer,
      }));
    const mistake = context.recurringErrors.find(error =>
      lesson.bank.some(
        question =>
          question.skill === skill.key &&
          Object.values(question.distractors ?? {}).includes(error.key)
      )
    );
    const explanation =
      context.tier === "weak"
        ? `لنبدأ بهدوء ومن الأساس. ${skill.explanation}`
        : context.tier === "advanced"
          ? `${skill.explanation} حاول دائماً أن تفهم لماذا تعمل القاعدة، لا أن تحفظها فقط.`
          : skill.explanation;
    return {
      skill: skill.key,
      heading: skill.name,
      explanation,
      examples: [skill.example, ...bankExamples],
      commonMistake: mistake ? `انتبه: ${mistake.label}.` : undefined,
    };
  });
  const strong = context.strengths.map(skill => skill.name).join("، ");
  const focusNames = sections.map(section => section.heading).join(" و");
  return {
    title: `${lesson.title} — درس خاص بـ ${context.name}`,
    intro: `مرحباً ${context.name}! ${
      strong ? `أرى أنك تتقن ${strong}. ` : ""
    }سنعمل اليوم على ${focusNames}. مستواك الحالي في هذا الدرس: ${TIER_LABELS_AR[context.tier]}، لذلك ${
      context.tier === "weak"
        ? "سنتقدم خطوة صغيرة في كل مرة مع أمثلة سهلة."
        : context.tier === "intermediate"
          ? "سنمزج الشرح بأمثلة متنوعة ثم نرفع المستوى تدريجياً."
          : "سنتعمق في القواعد وننتقل إلى مسائل أصعب."
    }`,
    sections,
    summary: sections.map(section => {
      const skill = lesson.skills.find(entry => entry.key === section.skill)!;
      return `${skill.name}: ${skill.explanation.split(/[.:]/)[0]}.`;
    }),
    nextStep: "حل التمارين الخاصة بك الآن لنقيس تقدمك ونحدّث مستواك.",
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!؟?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

export function templateVideoScript(
  context: StudentContext,
  personal: PersonalLesson
): VideoScript {
  const weakness = context.weaknesses[0]?.name ?? context.focusSkills[0]?.name;
  const scenes: VideoScene[] = [
    {
      narration: `مرحباً ${context.name}. ${
        weakness
          ? `لاحظت أنك تواجه بعض الصعوبة في ${weakness}. لا تقلق، سنشرحها اليوم بطريقة مبسطة خطوة بخطوة.`
          : "أنت تتقدم بشكل ممتاز، واليوم سنرفع التحدي قليلاً."
      }`,
      visual: {
        kind: "title",
        heading: `مرحباً ${context.name} 👋`,
        subheading: `${context.subjectName} — ${context.lessonTitle}`,
      },
    },
  ];
  for (const section of personal.sections) {
    scenes.push({
      narration: section.explanation,
      visual: {
        kind: "bullets",
        heading: section.heading,
        lines: splitSentences(section.explanation).slice(0, 4),
      },
    });
    const example = section.examples[0];
    if (example) {
      scenes.push({
        narration: `لنطبق معاً. ${example.problem} ${example.steps.join(" ثم ")} إذن الجواب: ${example.answer}.`,
        visual: {
          kind: "example",
          heading: "مثال محلول",
          problem: example.problem,
          steps: [...example.steps, `✔ ${example.answer}`],
        },
      });
    }
    if (section.commonMistake) {
      scenes.push({
        narration: section.commonMistake,
        visual: { kind: "formula", heading: "خطأ شائع", formula: "⚠", caption: section.commonMistake },
      });
    }
  }
  scenes.push({
    narration: `أحسنت يا ${context.name}. ${personal.nextStep}`,
    visual: { kind: "bullets", heading: "تذكّر", lines: personal.summary.slice(0, 4) },
  });
  return { title: `فيديو ${context.name}: ${context.lessonTitle}`, scenes };
}

export function templateOpening(context: StudentContext): string {
  const strong = context.strengths.map(skill => skill.name).join("، ");
  const weak = context.weaknesses.map(skill => skill.name).join("، ");
  const firstFocus = context.focusSkills[0]?.name;
  const parts = [`مرحباً ${context.name}!`];
  if (strong) parts.push(`أرى أنك فهمت ${strong} بشكل جيد.`);
  if (weak) parts.push(`لكن لديك صعوبة في ${weak}.`);
  if (context.recurringErrors.length)
    parts.push(`ولاحظت خطأً يتكرر عندك: ${context.recurringErrors[0].label}.`);
  if (firstFocus) {
    parts.push(
      context.tier === "weak"
        ? `سنبدأ بـ ${firstFocus} بشرح مبسط مع أمثلة سهلة، ثم ننتقل تدريجياً إلى مستوى أعلى.`
        : context.tier === "intermediate"
          ? `سنركز على ${firstFocus} بأمثلة متنوعة وتمارين متدرجة.`
          : `سنتعمق في ${firstFocus} ونحل مسائل مركبة.`
    );
  } else {
    parts.push("لقد أتقنت هذا الدرس! سنعمل الآن على تحديات إثرائية.");
  }
  parts.push("اطلب مني شرح أي نقطة، أو افتح «الدرس» و«الفيديو» الخاصين بك.");
  return parts.join(" ");
}

/** Keyword-routed reply used when no model is configured. */
export function templateTutorReply(
  lesson: Lesson,
  context: StudentContext,
  message: string
): string {
  const text = message.toLowerCase();
  // Pick the skill whose name shares the most words with the message.
  let mentioned: Lesson["skills"][number] | undefined;
  let best = 0;
  for (const candidate of lesson.skills) {
    const score = candidate.name
      .toLowerCase()
      .split(/[\s،]+/)
      .filter(word => word.length > 1 && text.includes(word)).length;
    if (score > best) {
      best = score;
      mentioned = candidate;
    }
  }
  const skill =
    mentioned ?? lesson.skills.find(entry => entry.key === context.focusSkills[0]?.key);
  if (!skill) {
    return `أحسنت يا ${context.name}، مستواك في هذا الدرس ممتاز. جرّب التمارين الصعبة في قسم «التمارين» لتثبيت إتقانك.`;
  }
  return `${skill.name}: ${skill.explanation}\n\nمثال: ${skill.example.problem}\n${skill.example.steps
    .map((step, index) => `${index + 1}) ${step}`)
    .join("\n")}\n✔ ${skill.example.answer}\n\nهل تريد أن تجرب تمريناً مشابهاً؟ افتح قسم «التمارين».`;
}
