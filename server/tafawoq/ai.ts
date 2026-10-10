// Tafawoq AI Teacher — Claude integration.
//
// Every generator here receives the student model (./studentModel.ts) as
// its context, so what Claude writes is shaped by that student's real
// mastery per skill, weaknesses, recurring errors and learning speed —
// not a generic lesson. Structured outputs (Zod schemas) keep each
// artifact machine-checkable; the service layer validates the result
// (skill keys, answer present in options) before anything is stored.
//
// Optional by design, like every other integration in this codebase:
// without ANTHROPIC_API_KEY the teacher still works end-to-end using the
// curated templates in ./templates.ts, and the UI says which one it got.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { PersonalLesson, VideoScript, VideoVisual } from "@shared/tafawoq";
import {
  LEARNING_SPEED_LABELS_AR,
  SCHOOL_LEVEL_LABELS_AR,
  TIER_LABELS_AR,
} from "@shared/tafawoq";
import type { BankQuestion } from "./curriculum";
import { ENV } from "../_core/env";
import type { StudentContext } from "./context";
import type { ForeignLang } from "@shared/taughtLanguages";

let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return Boolean(ENV.anthropicApiKey);
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  return client;
}

export class AiUnavailableError extends Error {}

const TEACHER_SYSTEM = `أنت «أستاذ تفوّق»، أستاذ خصوصي عربي يعمل مع تلميذ واحد فقط.
مبادئك:
- تتكلم بالعربية الفصحى المبسطة، بنبرة دافئة ومشجعة، وتنادي التلميذ باسمه.
- تكيّف كل شيء مع مستواه الحقيقي كما يظهر في ملفه: مستوى «يحتاج إلى تأسيس» = شرح مبسط جداً وأمثلة سهلة وخطوات صغيرة؛ «متوسط» = شرح متوسط وأمثلة متنوعة وتدرج؛ «متفوق» = شرح معمق وتحديات ومسائل مركبة.
- تركّز على نقاط ضعفه وأخطائه المتكررة، وتبني على نقاط قوته.
- تحترم المنهاج الجزائري والمصطلحات المستعملة في القسم.
- الرياضيات تُكتب برموز يونيكود مقروءة (x²، f′(x)، √، ≤) وليس بـ LaTeX.
- لا تخترع معطيات عن التلميذ غير الموجودة في ملفه.`;

function profileBlock(context: StudentContext): string {
  const skills = context.skills
    .map(
      skill =>
        `- ${skill.key} (${skill.name}): إتقان ${Math.round(skill.mastery * 100)}%`
    )
    .join("\n");
  const errors = context.recurringErrors.length
    ? context.recurringErrors.map(error => `- ${error.label} (${error.count} مرات)`).join("\n")
    : "- لا توجد أخطاء متكررة مسجلة بعد";
  return `ملف التلميذ:
- الاسم: ${context.name}
- العمر: ${context.age} سنة
- المستوى الدراسي: ${SCHOOL_LEVEL_LABELS_AR[context.schoolLevel]}
- المادة: ${context.subjectName} — الدرس: ${context.lessonTitle}
- المستوى الحالي في الدرس: ${TIER_LABELS_AR[context.tier]} (إتقان عام ${Math.round(context.mastery * 100)}%)
- سرعة التعلم: ${LEARNING_SPEED_LABELS_AR[context.learningSpeed]}
- الأهداف: ${context.goals || "غير محددة"}
- نقاط القوة: ${context.strengths.map(skill => skill.name).join("، ") || "لم تتضح بعد"}
- نقاط الضعف: ${context.weaknesses.map(skill => skill.name).join("، ") || "لا توجد نقاط ضعف واضحة"}
- المهارات ذات الأولوية الآن: ${context.focusSkills.map(skill => skill.name).join("، ") || "كل المهارات متقنة — تحديات إثرائية"}
إتقان كل مهارة:
${skills}
الأخطاء المتكررة:
${errors}`;
}

async function parseStructured<Schema extends z.ZodType>(
  schema: Schema,
  userPrompt: string,
  effort: "low" | "medium" | "high"
): Promise<z.infer<Schema>> {
  const response = await getClient().beta.messages.parse({
    model: ENV.tafawoqModel,
    max_tokens: 16000,
    // Server-side fallback: if a safety classifier declines (rare for
    // school content, but possible on e.g. chemistry), the API retries on
    // a fallback model inside the same call instead of failing the lesson.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system: TEACHER_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  if (response.stop_reason === "refusal") {
    throw new AiUnavailableError("The model declined this request");
  }
  if (!response.parsed_output) {
    throw new AiUnavailableError(`No structured output (stop_reason=${response.stop_reason})`);
  }
  return response.parsed_output;
}

// ---------------------------------------------------------------------------
// Personalized lesson
// ---------------------------------------------------------------------------

const LessonSchema = z.object({
  title: z.string(),
  intro: z.string(),
  sections: z.array(
    z.object({
      skill: z.string(),
      heading: z.string(),
      explanation: z.string(),
      examples: z.array(
        z.object({ problem: z.string(), steps: z.array(z.string()), answer: z.string() })
      ),
      commonMistake: z.string().optional(),
    })
  ),
  summary: z.array(z.string()),
  nextStep: z.string(),
});

export async function generateLesson(context: StudentContext): Promise<PersonalLesson> {
  const exampleCount =
    context.tier === "weak" ? "3 أمثلة سهلة جداً ومتدرجة" : context.tier === "intermediate" ? "مثالين متنوعين" : "مثالاً واحداً صعباً ومسألة مركبة";
  const focusKeys = context.focusSkills.map(skill => skill.key);
  return parseStructured(
    LessonSchema,
    `${profileBlock(context)}

المطلوب: اكتب درساً خاصاً بهذا التلميذ فقط.
- قسم واحد لكل مهارة من المهارات ذات الأولوية بالترتيب: ${focusKeys.join("، ") || "اختر مهارتين للتعمق والإثراء"}. حقل skill يجب أن يكون المفتاح الإنجليزي للمهارة حرفياً.
- في كل قسم: شرح مناسب لمستواه، ثم ${exampleCount} بحلول مفصلة خطوة بخطوة.
- إذا كان للتلميذ خطأ متكرر يخص المهارة، خصص حقل commonMistake لتصحيحه بوضوح.
- intro: افتتاحية شخصية قصيرة تناديه باسمه وتذكر ما يتقنه وما سنعمل عليه.
- summary: 3 إلى 5 نقاط للحفظ. nextStep: جملة واحدة عن الخطوة التالية.`,
    "medium"
  );
}

// ---------------------------------------------------------------------------
// Personalized exercises
// ---------------------------------------------------------------------------

const ExercisesSchema = z.object({
  exercises: z.array(
    z.object({
      skill: z.string(),
      difficulty: z.enum(["1", "2", "3"]),
      type: z.enum(["mcq", "short"]),
      prompt: z.string(),
      options: z.array(z.string()).optional(),
      answer: z.string(),
      accept: z.array(z.string()).optional(),
      distractorMisconceptions: z
        .array(z.object({ option: z.string(), misconception: z.string() }))
        .optional(),
      explanation: z.string(),
    })
  ),
});

export type GeneratedExercise = Omit<BankQuestion, "id">;

export async function generateExercises(
  context: StudentContext,
  plan: Array<{ skill: string; difficulty: 1 | 2 | 3 }>,
  misconceptionKeys: string[]
): Promise<GeneratedExercise[]> {
  const result = await parseStructured(
    ExercisesSchema,
    `${profileBlock(context)}

المطلوب: أنشئ ${plan.length} تمارين خاصة بهذا التلميذ، تمريناً لكل سطر من الخطة التالية وبنفس الترتيب (المهارة والصعوبة من 1 سهل إلى 3 صعب):
${plan.map((item, index) => `${index + 1}. skill=${item.skill} difficulty=${item.difficulty}`).join("\n")}

قواعد صارمة:
- type=mcq: أربعة خيارات بالضبط، والإجابة الصحيحة (answer) مطابقة حرفياً لأحد الخيارات. كل خيار خاطئ يمثل خطأً شائعاً حقيقياً؛ اربطه في distractorMisconceptions بأحد هذه المفاتيح إن أمكن: ${misconceptionKeys.join("، ")}.
- type=short: إجابة قصيرة وحيدة (عدد أو عبارة جبرية بسيطة)، مع صيغ مقبولة أخرى في accept.
- استهدف الأخطاء المتكررة للتلميذ مباشرة. لا تكرر تمارين الاختبار الأولي.
- explanation: تصحيح مختصر يشرح الطريقة الصحيحة.
- تحقق من صحة كل إجابة بنفسك قبل كتابتها.`,
    "medium"
  );
  return result.exercises.map(exercise => ({
    skill: exercise.skill,
    difficulty: Number(exercise.difficulty) as 1 | 2 | 3,
    type: exercise.type,
    prompt: exercise.prompt,
    options: exercise.type === "mcq" ? exercise.options : undefined,
    answer: exercise.answer,
    accept: exercise.accept,
    distractors: exercise.distractorMisconceptions
      ? Object.fromEntries(
          exercise.distractorMisconceptions.map(entry => [entry.option, entry.misconception])
        )
      : undefined,
    explanation: exercise.explanation,
  }));
}

// ---------------------------------------------------------------------------
// Automatic correction of free-form short answers
// ---------------------------------------------------------------------------

const GradeSchema = z.object({
  correct: z.boolean(),
  feedback: z.string(),
  misconception: z.string().optional(),
});

export async function gradeShortAnswer(input: {
  prompt: string;
  expected: string;
  given: string;
  misconceptionKeys: string[];
}) {
  return parseStructured(
    GradeSchema,
    `صحّح إجابة التلميذ.
السؤال: ${input.prompt}
الإجابة النموذجية: ${input.expected}
إجابة التلميذ: ${input.given}

- correct=true فقط إذا كانت إجابة التلميذ مكافئة رياضياً للإجابة النموذجية (ترتيب مختلف أو صيغة مكافئة مقبولة، أما إجابة غير مختزلة حين يُطلب الاختزال فخاطئة).
- feedback: جملة أو جملتان للتلميذ مباشرة، تشرح الخطأ إن وجد.
- misconception: إن كانت خاطئة، اختر المفتاح الأنسب من: ${input.misconceptionKeys.join("، ")}، أو صف الخطأ بكلمات قليلة.`,
    "low"
  );
}

// ---------------------------------------------------------------------------
// AI tutor dialogue
// ---------------------------------------------------------------------------

export type TutorTurn = { role: "tutor" | "student"; content: string };

const LANGUAGE_NAMES: Record<ForeignLang, string> = {
  de: "اللغة الألمانية",
  es: "اللغة الإسبانية",
  it: "اللغة الإيطالية",
  fr: "اللغة الفرنسية",
  en: "اللغة الإنجليزية",
};

export async function tutorReply(
  context: StudentContext,
  history: TutorTurn[],
  message: string | null,
  /** A language lesson taught in its own language (the teacher speaking it). */
  language?: ForeignLang
): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  // The profile is the first user turn so the (stable) system prompt stays
  // identical across every student and request.
  messages.push({
    role: "user",
    content: `${profileBlock(context)}

أنت في حصة خاصة مع هذا التلميذ. ردودك قصيرة (3 إلى 6 جمل) كما في محادثة حقيقية: اشرح بمثال، اطرح سؤالاً واحداً للتحقق من الفهم، ولا تعطِ الحل النهائي لتمرين قبل أن يحاول. ${
      message === null
        ? "ابدأ الحصة الآن: رحّب به باسمه، قل له بصدق ما لاحظته من تحليل مستواه (ما يتقنه وما يصعب عليه)، واشرح كيف سنتقدم معاً، ثم اطرح عليه سؤالاً أولاً بسيطاً."
        : "تابع الحوار."
    }${
      language
        ? `\n\nهذه حصة ${LANGUAGE_NAMES[language]} والتلميذ اختار أن يكلمه الأستاذ بها: اكتب ردودك بهذه اللغة البسيطة (مستوى A2 إلى B1) وبجمل قصيرة، وأضف ترجمة عربية قصيرة بين قوسين للكلمة الصعبة فقط، واشرح بالعربية فقط إذا قال التلميذ إنه لم يفهم.`
        : ""
    }`,
  });
  for (const turn of history) {
    messages.push({
      role: turn.role === "tutor" ? "assistant" : "user",
      content: turn.content,
    });
  }
  if (message !== null) messages.push({ role: "user", content: message });

  const response = await getClient().beta.messages.create({
    model: ENV.tafawoqModel,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: TEACHER_SYSTEM,
    messages,
  });
  if (response.stop_reason === "refusal") {
    throw new AiUnavailableError("The model declined this request");
  }
  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map(block => block.text)
    .join("\n")
    .trim();
  if (!text) throw new AiUnavailableError("Empty tutor reply");
  return text;
}

// ---------------------------------------------------------------------------
// Personal video script
// ---------------------------------------------------------------------------

const VideoSchema = z.object({
  title: z.string(),
  scenes: z.array(
    z.object({
      narration: z.string(),
      kind: z.enum(["title", "bullets", "formula", "example"]),
      heading: z.string(),
      subheading: z.string().optional(),
      lines: z.array(z.string()).optional(),
      formula: z.string().optional(),
      caption: z.string().optional(),
      problem: z.string().optional(),
      steps: z.array(z.string()).optional(),
    })
  ),
});

export async function generateVideoScript(
  context: StudentContext,
  lesson: PersonalLesson
): Promise<VideoScript> {
  const result = await parseStructured(
    VideoSchema,
    `${profileBlock(context)}

هذا الدرس الذي أُعدّ للتلميذ:
${JSON.stringify(lesson)}

المطلوب: سيناريو فيديو تعليمي شخصي (بين 6 و 10 مشاهد، مدة إجمالية 2 إلى 4 دقائق) يُعرض كشرائح متحركة مع تعليق صوتي.
- المشهد الأول kind=title: التعليق يبدأ بـ «مرحباً ${context.name}» ويذكر بلطف الصعوبة التي لاحظتها ويطمئنه.
- المشاهد الوسطى: شرح المهارات ذات الأولوية بإيقاع يناسب سرعة تعلمه، مع مشهد formula للقاعدة الأساسية ومشهد example لمثال محلول.
- المشهد الأخير: تلخيص وتشجيع ودعوة لحل التمارين.
- narration: نص يُقرأ بصوت عالٍ (جمل قصيرة، بدون رموز يصعب نطقها — اكتب «إكس تربيع» بدل x²).
- حقول الشاشة (heading, lines, formula, problem, steps) قصيرة ومقروءة وتستعمل الرموز.`,
    "medium"
  );
  return {
    title: result.title,
    scenes: result.scenes.map(scene => ({
      narration: scene.narration,
      visual: toVisual(scene),
    })),
  };
}

function toVisual(scene: z.infer<typeof VideoSchema>["scenes"][number]): VideoVisual {
  switch (scene.kind) {
    case "bullets":
      return { kind: "bullets", heading: scene.heading, lines: scene.lines ?? [] };
    case "formula":
      return {
        kind: "formula",
        heading: scene.heading,
        formula: scene.formula ?? "",
        caption: scene.caption,
      };
    case "example":
      return {
        kind: "example",
        heading: scene.heading,
        problem: scene.problem ?? "",
        steps: scene.steps ?? [],
      };
    default:
      return { kind: "title", heading: scene.heading, subheading: scene.subheading };
  }
}
