import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { GeneratedQuestion, QuestionGradeResult } from "../types";

// Reading a student's handwriting and matching it against a rubric has no
// sensible template/mock substitute (unlike exam-question generation) — this
// path always requires a real Claude API call. Sonnet 5 is vision-capable and
// matches the cost-tier choice already made for exam generation.
const MODEL = "claude-sonnet-5";

export function isGradingConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class GradingAgentError extends Error {}

const CriterionAwardSchema = z.object({
  awardedPoints: z
    .number()
    .describe("النقطة الممنوحة لهذا المعيار تحديدًا — لا تتجاوز الحد الأقصى المعطى له"),
  note: z.string().describe("تعليق قصير يبرر النقطة الممنوحة لهذا المعيار تحديدًا"),
});

const QuestionGradeSchema = z.object({
  questionIndex: z.number().int().describe("رقم السؤال كما ورد في القائمة أعلاه، يبدأ من 1"),
  transcription: z
    .string()
    .describe("نقل ما كتبه الطالب لهذا السؤال بأقصى دقة ممكنة من الصور — أو وصف وضع الإجابة إن كانت غير واضحة أو مفقودة"),
  feedback: z.string().describe("ملاحظة موجزة وبنّاءة للطالب حول إجابته لهذا السؤال"),
  criteriaAwards: z.array(CriterionAwardSchema),
});

const GradingResultSchema = z.object({
  questions: z.array(QuestionGradeSchema),
});

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const IMAGE_MIME_TO_CONTENT_TYPE: Record<string, "image/jpeg" | "image/png"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
};

export interface GradePaperInput {
  examTitle: string;
  gradeLevel: string;
  studentName: string;
  questions: GeneratedQuestion[];
  imagePaths: string[];
  imageMimeTypes: string[];
}

export async function gradeStudentPaper(input: GradePaperInput): Promise<QuestionGradeResult[]> {
  if (!isGradingConfigured()) {
    throw new GradingAgentError(
      "تصحيح الأوراق يتطلب تفعيل مفتاح Claude API — لا يوجد بديل تجريبي لقراءة خط الطالب اليدوي.",
    );
  }

  const questionList = input.questions
    .map((q, i) => {
      const rubricLines = q.rubric.map((r, j) => `   ${j + 1}) ${r.criterion} (الحد الأقصى: ${r.points} ن)`).join("\n");
      return `السؤال ${i + 1} — المحور: ${q.topic} (${q.points} ن)\nنص السؤال: ${q.prompt}\nالحل النموذجي: ${q.solution}\nمعايير التصحيح:\n${rubricLines}`;
    })
    .join("\n\n");

  const imageBlocks = input.imagePaths.map((imagePath, i) => {
    const mimeType = IMAGE_MIME_TO_CONTENT_TYPE[input.imageMimeTypes[i]];
    if (!mimeType) throw new GradingAgentError(`صيغة صورة غير مدعومة: ${input.imageMimeTypes[i]}`);
    const data = fs.readFileSync(imagePath).toString("base64");
    return { type: "image" as const, source: { type: "base64" as const, media_type: mimeType, data } };
  });

  const instructions = `أنت أستاذ خبير تُصحّح ورقة إجابة التلميذ "${input.studentName}" في امتحان بعنوان "${input.examTitle}" لمستوى "${input.gradeLevel}".
الصور المرفقة (بالترتيب) هي صفحات ورقة إجابة هذا التلميذ تحديدًا.

قائمة أسئلة الامتحان مع الحل النموذجي ومعايير التصحيح لكل سؤال:

${questionList}

لكل سؤال من الأسئلة أعلاه (بنفس العدد والترتيب): اعثر على إجابة التلميذ المقابلة في الصور، انقلها بدقة، قارنها بالحل النموذجي، وامنح نقطة لكل معيار من معايير التصحيح (لا تتجاوز الحد الأقصى لكل معيار). إن كان السؤال بلا إجابة أو غير مقروء، امنح 0 لكل معاييره واذكر ذلك صراحة في الملاحظة والنقل.
أعد بالضبط ${input.questions.length} نتيجة سؤال، بنفس ترتيب الأسئلة أعلاه.`;

  let response;
  try {
    response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [...imageBlocks, { type: "text", text: instructions }],
        },
      ],
      output_config: { format: zodOutputFormat(GradingResultSchema) },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new GradingAgentError("تعذّر الاتصال بخدمة التصحيح — مفتاح API غير صالح، يرجى التواصل مع الإدارة");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new GradingAgentError("خدمة التصحيح مشغولة حاليًا — يرجى إعادة المحاولة بعد لحظات");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new GradingAgentError("تعذّر الاتصال بخدمة التصحيح — تحقق من الاتصال بالإنترنت وأعد المحاولة");
    }
    if (err instanceof Anthropic.APIError) {
      throw new GradingAgentError("حدث خطأ في خدمة التصحيح — يرجى إعادة المحاولة لاحقًا أو التواصل مع الإدارة");
    }
    throw err;
  }

  const parsed = response.parsed_output;
  if (!parsed || parsed.questions.length !== input.questions.length) {
    throw new GradingAgentError("لم يتمكن النموذج من تصحيح جميع الأسئلة بالصيغة المتوقعة");
  }

  return input.questions.map((q, i): QuestionGradeResult => {
    const graded = parsed.questions.find((p) => p.questionIndex === i + 1) ?? parsed.questions[i];
    const criteriaResults = q.rubric.map((r, j) => {
      const award = graded.criteriaAwards[j];
      const awardedPoints = award ? Math.max(0, Math.min(r.points, award.awardedPoints)) : 0;
      return {
        criterion: r.criterion,
        maxPoints: r.points,
        awardedPoints,
        note: award?.note ?? "",
      };
    });
    return {
      questionId: q.id,
      topic: q.topic,
      maxPoints: q.points,
      awardedPoints: Math.round(criteriaResults.reduce((s, c) => s + c.awardedPoints, 0) * 10) / 10,
      transcription: graded.transcription,
      feedback: graded.feedback,
      criteriaResults,
    };
  });
}
