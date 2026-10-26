import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { LessonPrepFieldValue, LessonPrepSection, LessonPrepTableRow, LessonPrepTemplateSchema } from "../types";
import type { TokenUsage } from "./independentGradeTypes";

function usageFrom(response: { usage?: { input_tokens?: number; output_tokens?: number } }): TokenUsage {
  return { inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 };
}

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

export async function generateLessonPrepWithClaude(
  input: GenerateLessonPrepInput,
): Promise<{ sections: LessonPrepSection[]; usage: TokenUsage; model: string }> {
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
  return { sections: parsed.sections, usage: usageFrom(response), model: MODEL };
}

const IMAGE_MIME_TO_CONTENT_TYPE: Record<string, "image/jpeg" | "image/png"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
};

function toImageBlock(base64: string, mimeType: string) {
  const resolvedMimeType = IMAGE_MIME_TO_CONTENT_TYPE[mimeType];
  if (!resolvedMimeType) throw new LessonPrepAgentError(`صيغة صورة غير مدعومة: ${mimeType}`);
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: resolvedMimeType, data: base64 },
  };
}

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
export async function mergeLessonPrepWithClaude(
  input: MergeLessonPrepInput,
): Promise<{ sections: LessonPrepSection[]; usage: TokenUsage; model: string }> {
  if (!isLessonPrepConfigured()) {
    throw new LessonPrepAgentError(
      "دمج المذكرات المرفوعة يتطلب تفعيل مفتاح Claude API — لا يوجد بديل تجريبي لقراءة ودمج محتوى ملفاتك الفعلية.",
    );
  }

  const imageBlocks = input.imageSources.map((img) => toImageBlock(img.base64, img.mimeType));

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
  return { sections: parsed.sections, usage: usageFrom(response), model: MODEL };
}

// ---------- Teacher's own template: analysis + templated content ----------

const TemplateSchemaZod = z.object({
  institutionLabel: z
    .string()
    .describe('التسمية العلوية للمؤسسة كما تظهر في النموذج، مثال: "ثانوية"، "متوسطة"، "إعدادية"'),
  headerFields: z
    .array(z.string())
    .min(1)
    .describe(
      "أسماء حقول المعلومات العامة في أعلى النموذج بالترتيب كما تظهر، مثال: المادة، المستوى، الوحدة التعليمية، ميدان التعلم، موضوع الحصة، المدة",
    ),
  noteFields: z
    .array(z.string())
    .describe(
      "أسماء حقول صندوق الملاحظات/المعلومات التمهيدية إن وُجد، مثال: المكتسبات القبلية، الكفاءة المستهدفة، المراجع",
    ),
  tableColumns: z
    .array(z.string())
    .min(1)
    .describe("عناوين أعمدة جدول سير الدرس كما تظهر في النموذج، بنفس ترتيب ظهورها من اليمين إلى اليسار"),
});

export interface AnalyzeTemplateInput {
  imageBase64?: string;
  imageMimeType?: string;
  extractedText?: string;
}

// Analyzing an arbitrary teacher-uploaded form (especially a photographed or
// scanned one) needs real vision/reading, not a template bank — no mock path.
export async function analyzeLessonPrepTemplate(
  input: AnalyzeTemplateInput,
): Promise<{ schema: LessonPrepTemplateSchema; usage: TokenUsage; model: string }> {
  if (!isLessonPrepConfigured()) {
    throw new LessonPrepAgentError("تحليل نموذج التحضير المرفوع يتطلب تفعيل مفتاح Claude API.");
  }

  const content: (
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png"; data: string } }
    | { type: "text"; text: string }
  )[] = [];
  if (input.imageBase64 && input.imageMimeType) {
    content.push(toImageBlock(input.imageBase64, input.imageMimeType));
  }

  const instructions = `هذا نموذج تحضير درس فارغ (ورقة يستخدمها الأستاذ لتحضير دروسه) — حلّل بنيته بدقة ولا تملأ أي محتوى، فقط صف شكل النموذج:
- ما التسمية المكتوبة أعلى الورقة (عادة اسم نوع المؤسسة مثل "ثانوية" أو "متوسطة")؟
- ما حقول المعلومات العامة الظاهرة (عادة في صندوق علوي)، بترتيبها؟
- هل يوجد صندوق آخر يحتوي حقول ملاحظات تمهيدية (مثل المكتسبات القبلية أو الكفاءة المستهدفة أو المراجع)؟ اذكر أسماءها بالترتيب، أو أرجع قائمة فارغة إن لم يوجد.
- ما عناوين أعمدة الجدول الرئيسي الذي يُفصّل فيه سير الدرس (مراحل الدرس)، بترتيب ظهورها؟
${input.extractedText ? `\nفيما يلي نص مستخرج من الملف المرفوع:\n"""\n${input.extractedText.slice(0, 8000)}\n"""\n` : ""}`;
  content.push({ type: "text", text: instructions });

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(TemplateSchemaZod) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new LessonPrepAgentError("تعذّر تحليل شكل النموذج المرفوع");
  }
  return { schema: parsed, usage: usageFrom(response), model: MODEL };
}

const TemplatedLessonPrepSchema = z.object({
  headerValues: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("قيمة كل حقل من حقول المعلومات العامة في النموذج، بنفس أسماء الحقول المعطاة"),
  noteValues: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("قيمة كل حقل من حقول صندوق الملاحظات في النموذج، بنفس أسماء الحقول المعطاة"),
  tableRows: z
    .array(z.object({ cells: z.array(z.string()) }))
    .min(1)
    .describe("صفوف جدول سير الدرس؛ كل صف يمثل مرحلة، وعدد الخلايا في كل صف يطابق عدد أعمدة الجدول المعطى بنفس الترتيب"),
});

function templateInstructions(schema: LessonPrepTemplateSchema): string {
  return `استخدم بالضبط نموذج التحضير الخاص بالأستاذ التالي بنيته:
- حقول المعلومات العامة (بالترتيب): ${schema.headerFields.join("، ")}
- حقول الملاحظات التمهيدية (بالترتيب): ${schema.noteFields.length > 0 ? schema.noteFields.join("، ") : "لا يوجد"}
- أعمدة جدول سير الدرس (بالترتيب): ${schema.tableColumns.join("، ")}
املأ قيمة كل حقل من حقول المعلومات العامة وحقول الملاحظات بما يناسب هذا الدرس تحديدًا.
ثم ابنِ جدول سير الدرس: كل صف يمثل مرحلة من مراحل الدرس (مثل التمهيد، بناء التعلمات، التطبيق، التقويم أو ما يناسب الأعمدة المعطاة)، وعدد الخلايا في كل صف يجب أن يطابق تمامًا عدد الأعمدة أعلاه وبنفس ترتيبها.`;
}

export interface GenerateTemplatedLessonPrepInput extends GenerateLessonPrepInput {
  template: LessonPrepTemplateSchema;
}

export interface TemplatedLessonPrepResult {
  headerValues: LessonPrepFieldValue[];
  noteValues: LessonPrepFieldValue[];
  tableRows: LessonPrepTableRow[];
}

export async function generateTemplatedLessonPrepWithClaude(
  input: GenerateTemplatedLessonPrepInput,
): Promise<{ result: TemplatedLessonPrepResult; usage: TokenUsage; model: string }> {
  const prompt = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}".
${templateInstructions(input.template)}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ التي يجب مراعاتها: "${input.styleNotes}"\n` : ""}
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى، بأسلوب تربوي واضح ومناسب لمستوى التلاميذ المستهدف.`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(TemplatedLessonPrepSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.tableRows.length === 0) {
    throw new LessonPrepAgentError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return { result: parsed, usage: usageFrom(response), model: MODEL };
}

export interface MergeTemplatedLessonPrepInput extends MergeLessonPrepInput {
  template: LessonPrepTemplateSchema;
}

// Same no-mock posture as mergeLessonPrepWithClaude.
export async function mergeTemplatedLessonPrepWithClaude(
  input: MergeTemplatedLessonPrepInput,
): Promise<{ result: TemplatedLessonPrepResult; usage: TokenUsage; model: string }> {
  if (!isLessonPrepConfigured()) {
    throw new LessonPrepAgentError(
      "دمج المذكرات المرفوعة يتطلب تفعيل مفتاح Claude API — لا يوجد بديل تجريبي لقراءة ودمج محتوى ملفاتك الفعلية.",
    );
  }

  const imageBlocks = input.imageSources.map((img) => toImageBlock(img.base64, img.mimeType));
  const textExcerpt = input.textSources.map((s) => `--- ملف: ${s.fileName} ---\n${s.text}`).join("\n\n");

  const instructions = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}" اعتمادًا على مذكرات الأستاذ المرفقة (نصوص مستخرجة من ملفات PDF/Word و/أو صور ممسوحة ضوئيًا مرفقة أعلاه إن وجدت).
اقرأ كل المصادر بعناية وادمج محتواها في تحضير درس واحد منسجم وغير مكرر — لا تكتفِ بنسخ كل مصدر على حدة، بل وحّد المحتوى في عرض تربوي متكامل.
${templateInstructions(input.template)}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ: "${input.styleNotes}"\n` : ""}${
    textExcerpt ? `\nفيما يلي النصوص المستخرجة من الملفات المرفوعة:\n"""\n${textExcerpt.slice(0, 12000)}\n"""\n` : ""
  }
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى.`;

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: instructions }] }],
    output_config: { format: zodOutputFormat(TemplatedLessonPrepSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.tableRows.length === 0) {
    throw new LessonPrepAgentError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return { result: parsed, usage: usageFrom(response), model: MODEL };
}
