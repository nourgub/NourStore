import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { LessonPrepSection } from "../types";

const MODEL = "claude-sonnet-5";

export function isLessonPrepConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class LessonPrepAgentError extends Error {}

const MATH_NOTATION_INSTRUCTIONS =
  'عند كتابة أي رمز أو معادلة رياضية، استخدم صيغة LaTeX مبسّطة محصورة بين علامتي دولار، مثال: $x^2 + 3x - 1 = 0$، $\\frac{a}{b}$، $\\sqrt{x}$ — ولا تستخدم رموز يونيكود يدويًا داخل النص العادي.';

const LessonPrepSectionSchema = z.object({
  heading: z.string().describe("عنوان القسم (مثال: الكفاءة المستهدفة، الوسائل، التمهيد، بناء التعلمات، التطبيق، التقويم، التمارين المنزلية)"),
  body: z
    .string()
    .describe("محتوى القسم بالتفصيل، ويمكن أن يتضمن رموزًا رياضية بصيغة LaTeX داخل $...$ عند الحاجة"),
});

const LessonPrepSchema = z.object({
  sections: z.array(LessonPrepSectionSchema).min(4),
});

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const SECTION_STRUCTURE_HINT = `اكتب تحضير الدرس بالأقسام التالية بالترتيب (بنفس الأسماء تقريبًا):
1. الكفاءة المستهدفة
2. الوسائل التعليمية
3. التمهيد (الوضعية الانطلاقية)
4. بناء التعلمات (الشرح، التعريفات، الأمثلة، الخاصيات)
5. التطبيق (تمارين تطبيقية مباشرة محلولة جزئيًا)
6. التقويم (أسئلة تقويمية قصيرة لقياس الفهم)
7. التمارين المنزلية`;

export interface GenerateLessonPrepInput {
  subjectPersona: string;
  lessonTitle: string;
  gradeLevel: string;
  styleNotes?: string;
}

export async function generateLessonPrepWithClaude(input: GenerateLessonPrepInput): Promise<LessonPrepSection[]> {
  const prompt = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}".
${SECTION_STRUCTURE_HINT}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ التي يجب مراعاتها: "${input.styleNotes}"\n` : ""}
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى، بأسلوب تربوي واضح ومناسب لمستوى التلاميذ المستهدف.`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(LessonPrepSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.sections.length === 0) {
    throw new LessonPrepAgentError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return parsed.sections;
}

const IMAGE_MIME_TO_CONTENT_TYPE: Record<string, "image/jpeg" | "image/png"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
};

export interface LessonSourceImage {
  base64: string;
  mimeType: string;
}

export interface LessonSourceText {
  fileName: string;
  text: string;
}

export interface MergeLessonPrepInput {
  subjectPersona: string;
  lessonTitle: string;
  gradeLevel: string;
  styleNotes?: string;
  textSources: LessonSourceText[];
  imageSources: LessonSourceImage[];
}

// Merging a teacher's own notes (which may be scanned/photographed and only
// readable via vision) has no sensible mock substitute — same posture as
// gradingAgent.ts — so this always requires a real Claude API call.
export async function mergeLessonPrepWithClaude(input: MergeLessonPrepInput): Promise<LessonPrepSection[]> {
  if (!isLessonPrepConfigured()) {
    throw new LessonPrepAgentError(
      "دمج المذكرات المرفوعة يتطلب تفعيل مفتاح Claude API — لا يوجد بديل تجريبي لقراءة ودمج محتوى ملفاتك الفعلية.",
    );
  }

  const imageBlocks = input.imageSources.map((img) => {
    const mimeType = IMAGE_MIME_TO_CONTENT_TYPE[img.mimeType];
    if (!mimeType) throw new LessonPrepAgentError(`صيغة صورة غير مدعومة: ${img.mimeType}`);
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: mimeType, data: img.base64 },
    };
  });

  const textExcerpt = input.textSources
    .map((s) => `--- ملف: ${s.fileName} ---\n${s.text}`)
    .join("\n\n");

  const instructions = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}" اعتمادًا على مذكرات الأستاذ المرفقة (نصوص مستخرجة من ملفات PDF/Word و/أو صور ممسوحة ضوئيًا مرفقة أعلاه إن وجدت).
اقرأ كل المصادر بعناية وادمج محتواها في تحضير درس واحد منسجم وغير مكرر — لا تكتفِ بنسخ كل مصدر على حدة، بل وحّد المحتوى في عرض تربوي متكامل، واملأ أي فجوة منطقية بين المصادر بما يناسب المستوى الدراسي.
${SECTION_STRUCTURE_HINT}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ: "${input.styleNotes}"\n` : ""}${
    textExcerpt ? `\nفيما يلي النصوص المستخرجة من الملفات المرفوعة:\n"""\n${textExcerpt.slice(0, 12000)}\n"""\n` : ""
  }
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى.`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [...imageBlocks, { type: "text", text: instructions }],
      },
    ],
    output_config: { format: zodOutputFormat(LessonPrepSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.sections.length === 0) {
    throw new LessonPrepAgentError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return parsed.sections;
}
