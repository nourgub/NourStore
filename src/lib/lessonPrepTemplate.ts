import {
  deleteLessonPrepTemplate,
  findLatestLessonPrepTemplate,
  insertLessonPrepTemplate,
} from "./db";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "./extractText";
import { analyzeLessonPrepTemplate, isLessonPrepConfigured } from "./agents/lessonPrepAgent";
import { analyzeLessonPrepTemplateWithGemini, isLessonPrepConfiguredGemini } from "./agents/geminiLessonPrepAgent";
import type { LessonPrepTemplate, SubjectId } from "./types";

export class LessonPrepTemplateError extends Error {}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png"]);

function isImageMime(mimeType: string, fileName: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mimeType) || /\.(jpe?g|png)$/i.test(fileName);
}

export interface UploadLessonPrepTemplateInput {
  teacherId: string;
  subjectId: SubjectId;
  file: File;
}

export async function uploadLessonPrepTemplate(input: UploadLessonPrepTemplateInput): Promise<LessonPrepTemplate> {
  const { file } = input;
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new LessonPrepTemplateError("الملف أكبر من الحجم المسموح به (10 ميغابايت)");
  }

  const useClaude = isLessonPrepConfigured();
  const useGemini = !useClaude && isLessonPrepConfiguredGemini();
  if (!useClaude && !useGemini) {
    throw new LessonPrepTemplateError(
      "تحليل نموذج التحضير المرفوع يتطلب تفعيل مفتاح Claude API أو مفتاح Gemini API.",
    );
  }
  const analyze = useClaude ? analyzeLessonPrepTemplate : analyzeLessonPrepTemplateWithGemini;

  const schema = isImageMime(file.type, file.name)
    ? await analyze({
        imageBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        imageMimeType: file.type || (/\.png$/i.test(file.name) ? "image/png" : "image/jpeg"),
      })
    : await (async () => {
        const extracted = await extractTextFromUpload(file);
        if (extracted.status !== "extracted" || !extracted.text.trim()) {
          throw new LessonPrepTemplateError(
            `تعذّر قراءة الملف "${file.name}" — الصيغ المدعومة: صورة JPG/PNG، PDF، أو Word (.docx)`,
          );
        }
        return analyze({ extractedText: extracted.text });
      })();

  const template: LessonPrepTemplate = {
    id: `lpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
    fileName: file.name,
    schema,
    createdAt: new Date().toISOString(),
  };

  insertLessonPrepTemplate(template);
  return template;
}

export function getActiveLessonPrepTemplate(teacherId: string, subjectId: SubjectId): LessonPrepTemplate | null {
  return findLatestLessonPrepTemplate(teacherId, subjectId);
}

export function removeLessonPrepTemplate(id: string, teacherId: string): void {
  deleteLessonPrepTemplate(id, teacherId);
}
