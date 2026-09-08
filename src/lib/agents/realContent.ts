import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { GeneratedQuestion } from "../types";
import { scaleRubricToBudget } from "./scaleRubric";

// Sonnet 5 balances output quality against per-generation cost for this
// workload (short, structured exam questions) — swap to a stronger model
// here if a teacher's feedback shows the questions need more depth.
const MODEL = "claude-sonnet-5";

export function isRealGenerationConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface QuestionSpec {
  topic: string;
  difficulty: "سهل" | "متوسط" | "صعب";
  pointsBudget: number;
}

export interface RealGenerationInput {
  examTitle: string;
  gradeLevel: string;
  styleNotes?: string;
  curriculumText?: string;
  specs: QuestionSpec[];
}

// Bounds how much curriculum text enters the prompt per request, independent
// of how much is stored on the document — keeps token cost predictable.
const MAX_CURRICULUM_CHARS_IN_PROMPT = 6000;

const QuestionSchema = z.object({
  prompt: z.string().describe("نص السؤال الموجّه للتلميذ، بدون الحل"),
  solution: z.string().describe("الحل النموذجي المفصّل خطوة بخطوة"),
  rubric: z
    .array(z.object({ criterion: z.string(), points: z.number() }))
    .min(2)
    .max(5)
    .describe("معايير تصحيح تفصيلية مع توزيع تقريبي للنقاط"),
});

const ExamSchema = z.object({
  questions: z.array(QuestionSchema),
});

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function generateMathQuestionsWithClaude(
  input: RealGenerationInput,
): Promise<GeneratedQuestion[]> {
  const questionList = input.specs
    .map((s, i) => `${i + 1}. المحور: "${s.topic}" — مستوى الصعوبة: ${s.difficulty} — النقطة الكلية لهذا السؤال: ${s.pointsBudget}`)
    .join("\n");

  const curriculumExcerpt = input.curriculumText?.slice(0, MAX_CURRICULUM_CHARS_IN_PROMPT);

  const prompt = `أنت أستاذ رياضيات خبير تُعِدّ امتحانًا بعنوان "${input.examTitle}" لمستوى "${input.gradeLevel}".
أنشئ بالضبط ${input.specs.length} سؤال(أسئلة) رياضية أصلية ومتنوعة، بنفس ترتيب القائمة التالية (كل سؤال يطابق محوره ومستوى صعوبته):
${questionList}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ التي يجب مراعاتها في الصياغة: "${input.styleNotes}"\n` : ""}${
    curriculumExcerpt
      ? `\nفيما يلي مقتطف من وثيقة المنهج الفعلية التي رفعها الأستاذ — التزم بمصطلحاتها وأسلوبها ومستوى تعقيدها، ولا تخرج عن محتواها:\n"""\n${curriculumExcerpt}\n"""\n`
      : ""
  }
لكل سؤال، اكتب: نص السؤال فقط (بدون حل)، ثم حلًا نموذجيًا مفصلاً خطوة بخطوة، ثم شبكة تصحيح (معايير مع نقاط تقريبية تجمع قريبًا من النقطة الكلية المحددة لذلك السؤال).
اكتب كل شيء باللغة العربية الفصحى، وتجنّب تكرار نفس السياق أو الأرقام بين الأسئلة.`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(ExamSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.questions.length !== input.specs.length) {
    throw new Error("لم يتمكن النموذج من إرجاع العدد المطلوب من الأسئلة بالصيغة المتوقعة");
  }

  return parsed.questions.map((q, i) => {
    const spec = input.specs[i];
    return {
      id: `q_${Math.random().toString(36).slice(2, 10)}`,
      topic: spec.topic,
      difficulty: spec.difficulty,
      points: spec.pointsBudget,
      prompt: q.prompt,
      solution: q.solution,
      rubric: scaleRubricToBudget(q.rubric, spec.pointsBudget),
    };
  });
}
