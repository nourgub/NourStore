import { z } from "zod";
import type { LessonPrepFieldValue, LessonPrepSection, LessonPrepTableRow, LessonPrepTemplateSchema } from "../types";
import { callGeminiJson, isGeminiConfigured, GeminiReviewError, type GeminiImageInput } from "./geminiClient";
import type {
  AnalyzeTemplateInput,
  GenerateLessonPrepInput,
  GenerateTemplatedLessonPrepInput,
  LessonSourceImage,
  MergeLessonPrepInput,
  MergeTemplatedLessonPrepInput,
  TemplatedLessonPrepResult,
} from "./lessonPrepAgent";

// Gemini's equivalent of lessonPrepAgent.ts — used as the PRIMARY engine for
// lesson prep (generate / merge / template analysis / templated generate /
// templated merge) whenever ANTHROPIC_API_KEY isn't configured. Prompt text
// is identical in intent to the Claude versions; only the call mechanics
// (plain JSON Schema + Zod re-validation instead of messages.parse) differ,
// same pattern as geminiRealContent.ts.
export function isLessonPrepConfiguredGemini(): boolean {
  return isGeminiConfigured();
}

export class GeminiLessonPrepError extends GeminiReviewError {}

const MATH_NOTATION_INSTRUCTIONS =
  'عند كتابة أي رمز أو معادلة رياضية، استخدم صيغة LaTeX مبسّطة محصورة بين علامتي دولار، مثال: $x^2 + 3x - 1 = 0$، $\\frac{a}{b}$، $\\sqrt{x}$ — ولا تستخدم رموز يونيكود يدويًا داخل النص العادي.';

const SECTION_STRUCTURE_HINT = `اكتب تحضير الدرس بالأقسام التالية بالترتيب (بنفس الأسماء تقريبًا):
1. الكفاءة المستهدفة
2. الوسائل التعليمية
3. التمهيد (الوضعية الانطلاقية)
4. بناء التعلمات (الشرح، التعريفات، الأمثلة، الخاصيات)
5. التطبيق (تمارين تطبيقية مباشرة محلولة جزئيًا)
6. التقويم (أسئلة تقويمية قصيرة لقياس الفهم)
7. التمارين المنزلية`;

const IMAGE_MIME_TO_GEMINI: Record<string, "image/jpeg" | "image/png"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
};

function toGeminiImage(img: LessonSourceImage): GeminiImageInput {
  const mimeType = IMAGE_MIME_TO_GEMINI[img.mimeType];
  if (!mimeType) throw new GeminiLessonPrepError(`صيغة صورة غير مدعومة: ${img.mimeType}`);
  return { data: img.base64, mimeType };
}

const SECTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        properties: {
          heading: { type: "string", description: "عنوان القسم" },
          body: { type: "string", description: "محتوى القسم بالتفصيل، ويمكن أن يتضمن رموزًا رياضية بصيغة LaTeX داخل $...$" },
        },
        required: ["heading", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["sections"],
  additionalProperties: false,
};

const SectionsResultSchema = z.object({
  sections: z.array(z.object({ heading: z.string(), body: z.string() })).min(4),
});

export async function generateLessonPrepWithGemini(input: GenerateLessonPrepInput): Promise<LessonPrepSection[]> {
  const prompt = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}".
${SECTION_STRUCTURE_HINT}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ التي يجب مراعاتها: "${input.styleNotes}"\n` : ""}
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى، بأسلوب تربوي واضح ومناسب لمستوى التلاميذ المستهدف.
أعد فقط JSON مطابقًا للمخطط المطلوب.`;

  const { text } = await callGeminiJson({ prompt, jsonSchema: SECTIONS_JSON_SCHEMA, maxOutputTokens: 8000 });
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(text);
  } catch {
    throw new GeminiLessonPrepError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  const result = SectionsResultSchema.safeParse(rawParsed);
  if (!result.success || result.data.sections.length === 0) {
    throw new GeminiLessonPrepError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return result.data.sections;
}

export async function mergeLessonPrepWithGemini(input: MergeLessonPrepInput): Promise<LessonPrepSection[]> {
  const images = input.imageSources.map(toGeminiImage);
  const textExcerpt = input.textSources.map((s) => `--- ملف: ${s.fileName} ---\n${s.text}`).join("\n\n");

  const prompt = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}" اعتمادًا على مذكرات الأستاذ المرفقة (نصوص مستخرجة من ملفات PDF/Word و/أو صور ممسوحة ضوئيًا مرفقة أعلاه إن وجدت).
اقرأ كل المصادر بعناية وادمج محتواها في تحضير درس واحد منسجم وغير مكرر — لا تكتفِ بنسخ كل مصدر على حدة، بل وحّد المحتوى في عرض تربوي متكامل، واملأ أي فجوة منطقية بين المصادر بما يناسب المستوى الدراسي.
${SECTION_STRUCTURE_HINT}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ: "${input.styleNotes}"\n` : ""}${
    textExcerpt ? `\nفيما يلي النصوص المستخرجة من الملفات المرفوعة:\n"""\n${textExcerpt.slice(0, 12000)}\n"""\n` : ""
  }
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى.
أعد فقط JSON مطابقًا للمخطط المطلوب.`;

  const { text } = await callGeminiJson({ prompt, images, jsonSchema: SECTIONS_JSON_SCHEMA, maxOutputTokens: 8000 });
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(text);
  } catch {
    throw new GeminiLessonPrepError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  const result = SectionsResultSchema.safeParse(rawParsed);
  if (!result.success || result.data.sections.length === 0) {
    throw new GeminiLessonPrepError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return result.data.sections;
}

const TEMPLATE_SCHEMA_JSON_SCHEMA = {
  type: "object",
  properties: {
    institutionLabel: { type: "string", description: 'التسمية العلوية للمؤسسة كما تظهر في النموذج، مثال: "ثانوية"، "متوسطة"، "إعدادية"' },
    headerFields: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
      description: "أسماء حقول المعلومات العامة في أعلى النموذج بالترتيب كما تظهر",
    },
    noteFields: {
      type: "array",
      items: { type: "string" },
      description: "أسماء حقول صندوق الملاحظات/المعلومات التمهيدية إن وُجد",
    },
    tableColumns: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
      description: "عناوين أعمدة جدول سير الدرس كما تظهر في النموذج، بنفس ترتيب ظهورها",
    },
  },
  required: ["institutionLabel", "headerFields", "noteFields", "tableColumns"],
  additionalProperties: false,
};

const TemplateSchemaResultSchema = z.object({
  institutionLabel: z.string(),
  headerFields: z.array(z.string()).min(1),
  noteFields: z.array(z.string()),
  tableColumns: z.array(z.string()).min(1),
});

export async function analyzeLessonPrepTemplateWithGemini(input: AnalyzeTemplateInput): Promise<LessonPrepTemplateSchema> {
  const images: GeminiImageInput[] = [];
  if (input.imageBase64 && input.imageMimeType) {
    const mimeType = IMAGE_MIME_TO_GEMINI[input.imageMimeType];
    if (!mimeType) throw new GeminiLessonPrepError(`صيغة صورة غير مدعومة: ${input.imageMimeType}`);
    images.push({ data: input.imageBase64, mimeType });
  }

  const prompt = `هذا نموذج تحضير درس فارغ (ورقة يستخدمها الأستاذ لتحضير دروسه) — حلّل بنيته بدقة ولا تملأ أي محتوى، فقط صف شكل النموذج:
- ما التسمية المكتوبة أعلى الورقة (عادة اسم نوع المؤسسة مثل "ثانوية" أو "متوسطة")؟
- ما حقول المعلومات العامة الظاهرة (عادة في صندوق علوي)، بترتيبها؟
- هل يوجد صندوق آخر يحتوي حقول ملاحظات تمهيدية (مثل المكتسبات القبلية أو الكفاءة المستهدفة أو المراجع)؟ اذكر أسماءها بالترتيب، أو أرجع قائمة فارغة إن لم يوجد.
- ما عناوين أعمدة الجدول الرئيسي الذي يُفصّل فيه سير الدرس (مراحل الدرس)، بترتيب ظهورها؟
${input.extractedText ? `\nفيما يلي نص مستخرج من الملف المرفوع:\n"""\n${input.extractedText.slice(0, 8000)}\n"""\n` : ""}
أعد فقط JSON مطابقًا للمخطط المطلوب.`;

  const { text } = await callGeminiJson({ prompt, images, jsonSchema: TEMPLATE_SCHEMA_JSON_SCHEMA, maxOutputTokens: 2000 });
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(text);
  } catch {
    throw new GeminiLessonPrepError("تعذّر تحليل شكل النموذج المرفوع");
  }
  const result = TemplateSchemaResultSchema.safeParse(rawParsed);
  if (!result.success) {
    throw new GeminiLessonPrepError("تعذّر تحليل شكل النموذج المرفوع");
  }
  return result.data;
}

function templateInstructions(schema: LessonPrepTemplateSchema): string {
  return `استخدم بالضبط نموذج التحضير الخاص بالأستاذ التالي بنيته:
- حقول المعلومات العامة (بالترتيب): ${schema.headerFields.join("، ")}
- حقول الملاحظات التمهيدية (بالترتيب): ${schema.noteFields.length > 0 ? schema.noteFields.join("، ") : "لا يوجد"}
- أعمدة جدول سير الدرس (بالترتيب): ${schema.tableColumns.join("، ")}
املأ قيمة كل حقل من حقول المعلومات العامة وحقول الملاحظات بما يناسب هذا الدرس تحديدًا.
ثم ابنِ جدول سير الدرس: كل صف يمثل مرحلة من مراحل الدرس (مثل التمهيد، بناء التعلمات، التطبيق، التقويم أو ما يناسب الأعمدة المعطاة)، وعدد الخلايا في كل صف يجب أن يطابق تمامًا عدد الأعمدة أعلاه وبنفس ترتيبها.`;
}

const TEMPLATED_RESULT_JSON_SCHEMA = {
  type: "object",
  properties: {
    headerValues: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    noteValues: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    tableRows: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: { cells: { type: "array", items: { type: "string" } } },
        required: ["cells"],
        additionalProperties: false,
      },
    },
  },
  required: ["headerValues", "noteValues", "tableRows"],
  additionalProperties: false,
};

const TemplatedResultSchema = z.object({
  headerValues: z.array(z.object({ label: z.string(), value: z.string() })),
  noteValues: z.array(z.object({ label: z.string(), value: z.string() })),
  tableRows: z.array(z.object({ cells: z.array(z.string()) })).min(1),
});

function parseTemplatedResult(text: string): TemplatedLessonPrepResult {
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(text);
  } catch {
    throw new GeminiLessonPrepError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  const result = TemplatedResultSchema.safeParse(rawParsed);
  if (!result.success || result.data.tableRows.length === 0) {
    throw new GeminiLessonPrepError("لم يتمكن النموذج من إرجاع تحضير الدرس بالصيغة المتوقعة");
  }
  return result.data as TemplatedLessonPrepResult;
}

export async function generateTemplatedLessonPrepWithGemini(
  input: GenerateTemplatedLessonPrepInput,
): Promise<TemplatedLessonPrepResult> {
  const prompt = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}".
${templateInstructions(input.template)}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ التي يجب مراعاتها: "${input.styleNotes}"\n` : ""}
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى، بأسلوب تربوي واضح ومناسب لمستوى التلاميذ المستهدف.
أعد فقط JSON مطابقًا للمخطط المطلوب.`;

  const { text } = await callGeminiJson({ prompt, jsonSchema: TEMPLATED_RESULT_JSON_SCHEMA, maxOutputTokens: 8000 });
  return parseTemplatedResult(text);
}

export async function mergeTemplatedLessonPrepWithGemini(
  input: MergeTemplatedLessonPrepInput,
): Promise<TemplatedLessonPrepResult> {
  const images = input.imageSources.map(toGeminiImage);
  const textExcerpt = input.textSources.map((s) => `--- ملف: ${s.fileName} ---\n${s.text}`).join("\n\n");

  const prompt = `أنت ${input.subjectPersona} تُحضّر درسًا بعنوان "${input.lessonTitle}" لمستوى "${input.gradeLevel}" اعتمادًا على مذكرات الأستاذ المرفقة (نصوص مستخرجة من ملفات PDF/Word و/أو صور ممسوحة ضوئيًا مرفقة أعلاه إن وجدت).
اقرأ كل المصادر بعناية وادمج محتواها في تحضير درس واحد منسجم وغير مكرر — لا تكتفِ بنسخ كل مصدر على حدة، بل وحّد المحتوى في عرض تربوي متكامل.
${templateInstructions(input.template)}
${input.styleNotes ? `\nملاحظات أسلوب الأستاذ: "${input.styleNotes}"\n` : ""}${
    textExcerpt ? `\nفيما يلي النصوص المستخرجة من الملفات المرفوعة:\n"""\n${textExcerpt.slice(0, 12000)}\n"""\n` : ""
  }
${MATH_NOTATION_INSTRUCTIONS}
اكتب كل شيء باللغة العربية الفصحى.
أعد فقط JSON مطابقًا للمخطط المطلوب.`;

  const { text } = await callGeminiJson({ prompt, images, jsonSchema: TEMPLATED_RESULT_JSON_SCHEMA, maxOutputTokens: 8000 });
  return parseTemplatedResult(text);
}
