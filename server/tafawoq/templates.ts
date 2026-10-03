// Tafawoq AI Teacher — offline generators.
//
// Used when ANTHROPIC_API_KEY is not configured, or when a model call
// fails or returns something that doesn't pass validation. They are built
// from the same student model as the AI path (tier, focus skills,
// recurring errors, name), so the experience stays personal — just less
// rich — rather than silently degrading to a generic lesson.
import type { LessonExample, PersonalLesson, VideoScene, VideoScript } from "@shared/tafawoq";
import { TIER_LABELS_AR } from "@shared/tafawoq";
import type { BankQuestion, Lesson } from "./curriculum";
import type { StudentContext } from "./context";
import { createRng, randomSeed } from "./generators/core";
import { instantiate } from "./generators/instantiate";
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
  fallbackSkills: string[] = [],
  seed: number = randomSeed()
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
  const rng = createRng(seed);
  return plan.map(item => {
    // Generators first: an unlimited supply of fresh, computed items at
    // exactly the planned difficulty (or the closest one available).
    const generators = (lesson.generators ?? []).filter(generator => generator.skill === item.skill);
    if (generators.length) {
      const gap = (difficulty: number) => Math.abs(difficulty - item.difficulty);
      const best = Math.min(...generators.map(generator => gap(generator.difficulty)));
      const generator = rng.pick(generators.filter(entry => gap(entry.difficulty) === best));
      return instantiate(generator, rng.int(1, 2 ** 30));
    }
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

/**
 * Fresh worked examples from the skill's generators, at a difficulty that
 * fits the tier: a weak student sees two easy ones, an advanced one a hard
 * one. Undefined when the skill has no generators.
 */
export function generatedExamples(
  lesson: Lesson,
  skillKey: string,
  tier: StudentContext["tier"],
  seed: number = randomSeed()
): LessonExample[] | undefined {
  const generators = (lesson.generators ?? []).filter(generator => generator.skill === skillKey);
  if (!generators.length) return undefined;
  const rng = createRng(seed);
  const target = tier === "weak" ? 1 : tier === "intermediate" ? 2 : 3;
  const sorted = [...generators].sort(
    (a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target)
  );
  const count = tier === "weak" ? 2 : 1;
  return Array.from({ length: count }, (_, index) => {
    const item = instantiate(sorted[Math.min(index, sorted.length - 1)], rng.int(1, 2 ** 30));
    return {
      problem: item.prompt,
      steps: item.steps ?? [item.explanation],
      answer: item.answer,
    };
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
      examples: [
        skill.example,
        ...(generatedExamples(lesson, skill.key, context.tier) ?? bankExamples),
      ],
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

export type TutorIntent = "quiz" | "giveUp" | "example" | "mistake" | "simpler" | "challenge" | "thanks" | "explain";

const INTENT_WORDS: Array<[TutorIntent, RegExp]> = [
  ["quiz", /اختبرني|امتحني|اسألني|اسالني|سؤال آخر|سؤالا آخر|سؤالاً|سؤال جديد|interroge|teste-moi|pose-moi|quiz|test me|ask me/],
  ["giveUp", /لا أعرف|لا اعرف|ما نعرفش|مانعرفش|ما عرفتش|أعطني الحل|اعطني الحل|^الحل$|je ne sais pas|je sais pas|i don.t know|give up/],
  ["thanks", /شكر|merci|thank/],
  ["mistake", /لماذا|خطأ|أخطئ|اخطئ|غلط|pourquoi|erreur|faute|why|mistake|wrong/],
  ["simpler", /لم أفهم|لم افهم|ما فهمت|مافهمتش|صعب|بسط|ببساطة|simple|comprends pas|don.t understand|easier/],
  ["challenge", /تحد|أصعب|اصعب|متقدم|défi|difficile|challenge|harder/],
  ["example", /مثال|أمثلة|امثلة|exemple|example/],
];

export function detectIntent(message: string): TutorIntent {
  const text = message.toLowerCase();
  return INTENT_WORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? "explain";
}

function mentionedSkill(lesson: Lesson, message: string) {
  const text = message.toLowerCase();
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
  return mentioned;
}

function formatExample(example: LessonExample): string {
  return `${example.problem}\n${example.steps.map((step, index) => `${index + 1}) ${step}`).join("\n")}\n✔ ${example.answer}`;
}

/**
 * The free tutor: understands what the student is asking for (explain,
 * an example, why they keep making a mistake, simpler, a challenge) and
 * answers from the student model, the lesson's explanations and remedies,
 * and freshly generated worked examples. No model call.
 */
export function templateTutorReply(
  lesson: Lesson,
  context: StudentContext,
  message: string,
  seed: number = randomSeed()
): string {
  const intent = detectIntent(message);
  const skill =
    mentionedSkill(lesson, message) ??
    lesson.skills.find(entry => entry.key === context.focusSkills[0]?.key) ??
    lesson.skills.find(entry => entry.key === [...context.skills].sort((a, b) => a.mastery - b.mastery)[0]?.key);
  if (!skill) return `أحسنت يا ${context.name}! جرّب قسم «التمارين» لتثبيت ما تعلمته.`;

  const example = (tier: StudentContext["tier"]) =>
    generatedExamples(lesson, skill.key, tier, seed)?.[0] ?? skill.example;

  switch (intent) {
    case "thanks":
      return `بالتوفيق يا ${context.name}! ${
        context.focusSkills[0] ? `خطوتك التالية: ${context.focusSkills[0].name}. ` : ""
      }أنا هنا متى احتجتني.`;
    case "mistake": {
      const error = context.recurringErrors[0];
      if (!error) {
        return `لم ألاحظ عندك خطأً يتكرر حتى الآن يا ${context.name} 👍 إن أخطأت في تمرين، راجع التصحيح خطوة بخطوة في قسم «التمارين» وسأتابع أخطاءك تلقائياً.`;
      }
      const remedy = lesson.remedies?.[error.key];
      return `لاحظت أنك تقع ${error.count} مرات في هذا الخطأ: ${error.label}.\n${
        remedy ? `✅ ${remedy}\n` : ""
      }\nلنرَ الطريقة الصحيحة على مثال:\n${formatExample(example("weak"))}`;
    }
    case "simpler": {
      const sentences = skill.explanation.split(/(?<=[.:])\s+/).filter(Boolean);
      return `لا بأس، لنأخذها خطوة بخطوة — ${skill.name}:\n${sentences
        .map((sentence, index) => `${index + 1}. ${sentence}`)
        .join("\n")}\n\nمثال سهل:\n${formatExample(example("weak"))}\n\nهل اتضحت الفكرة؟ اطلب «مثال» لمثال آخر.`;
    }
    case "challenge":
      return `تحدٍّ في ${skill.name} 💪\n${formatExample(example("advanced"))}\n\nحاول حل مسألة مشابهة في قسم «التمارين».`;
    case "example":
      return `مثال محلول في ${skill.name}:\n${formatExample(example(context.tier))}\n\nاطلب «مثال» مرة أخرى لمثال جديد بأرقام مختلفة.`;
    default:
      return `${skill.name}: ${skill.explanation}\n\nمثال:\n${formatExample(example(context.tier))}\n\nهل تريد مثالاً آخر أو شرحاً أبسط؟`;
  }
}

// ---------------------------------------------------------------------------
// Phone-call lesson: what the teacher says when the call opens and when it
// ends. Written to be heard (short sentences); the client speaks it with
// math rewritten for the ear (client/src/pages/tafawoq/speech.ts).
// ---------------------------------------------------------------------------

export function callIntroText(lesson: Lesson, context: StudentContext, seed: number = randomSeed()): string {
  const focus =
    context.focusSkills[0] ?? [...context.skills].sort((a, b) => a.mastery - b.mastery)[0];
  const skill = lesson.skills.find(entry => entry.key === focus?.key) ?? lesson.skills[0];
  const firstIdea = skill.explanation.split(/(?<=[.:])\s+/).slice(0, 2).join(" ");
  const example = generatedExamples(lesson, skill.key, "weak", seed)?.[0] ?? skill.example;
  const error = context.recurringErrors[0];
  return [
    `السلام عليكم يا ${context.name}! معك أستاذ الرياضيات. أتمنى أن تكون بخير.`,
    `اليوم سنعمل معاً على «${skill.name}» في درس ${lesson.title}.`,
    error ? `لاحظت أنك تقع أحياناً في هذا الخطأ: ${error.label}. سنصححه معاً.` : "",
    `لنبدأ بفكرة سريعة: ${firstIdea}`,
    `مثال: ${example.problem}`,
    example.steps.join(" ثم "),
    `إذن الجواب: ${example.answer}.`,
    "الآن دورك! سأطرح عليك ثلاثة أسئلة قصيرة. وفي أي وقت قل «اشرح» أو «أعد».",
  ]
    .filter(Boolean)
    .join("\n");
}

export function callSummaryText(input: {
  name: string;
  correct: number;
  total: number;
  skillName: string | null;
  before: number | null;
  after: number | null;
  nextSkillName: string | null;
}): string {
  const { name, correct, total, skillName, before, after, nextSkillName } = input;
  const lines = [`انتهت حصتنا يا ${name}.`];
  if (total) lines.push(`أجبت إجابة صحيحة عن ${correct} من ${total} أسئلة.`);
  if (skillName && total) {
    const rose = before !== null && after !== null && Math.round(after * 100) > Math.round(before * 100);
    // Praise only real success: with few correct answers the estimate can
    // still creep up from practice alone, which is not worth a "well done".
    if (rose && correct * 2 >= total) {
      lines.push(`إتقانك لـ «${skillName}» ارتفع من ${Math.round(before! * 100)}% إلى ${Math.round(after! * 100)}%. أحسنت!`);
    } else if (correct * 2 < total) {
      lines.push(`سنحتاج إلى مراجعة «${skillName}» مرة أخرى، وهذا طبيعي — كل خطأ اليوم درس لك.`);
    }
  }
  if (total && correct === total) {
    lines.push(nextSkillName ? `ممتاز! في المكالمة القادمة ننتقل إلى «${nextSkillName}».` : "ممتاز! أنت جاهز لتمارين أصعب.");
  } else if (total) {
    lines.push("أنصحك بحل التمارين الخاصة بك في قسم «تماريني» قبل مكالمتنا القادمة.");
  }
  lines.push("إلى اللقاء، وبالتوفيق!");
  return lines.join(" ");
}
