import fs from "node:fs";
import path from "node:path";
import { findLessonPrep, GENERATED_DIR, insertLessonPrep, listLessonPreps } from "./db";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "./extractText";
import { runLessonPrepPipeline } from "./agents/lessonPrepPipeline";
import { buildLessonPrepDocx } from "./docx/buildLessonPrepDocx";
import type { LessonPrepMode, LessonPrepRequest, SubjectId } from "./types";
import type { LessonSourceImage, LessonSourceText } from "./agents/lessonPrepAgent";

export class LessonPrepError extends Error {}

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png"]);
const MAX_SOURCE_FILES = 5;

function isImageMime(mimeType: string, fileName: string): boolean {
  return ALLOWED_IMAGE_MIME.has(mimeType) || /\.(jpe?g|png)$/i.test(fileName);
}

async function classifySourceFiles(
  files: File[],
): Promise<{ textSources: LessonSourceText[]; imageSources: LessonSourceImage[]; fileNames: string[] }> {
  const textSources: LessonSourceText[] = [];
  const imageSources: LessonSourceImage[] = [];
  const fileNames: string[] = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new LessonPrepError(`الملف "${file.name}" أكبر من الحجم المسموح به (10 ميغابايت)`);
    }
    fileNames.push(file.name);

    if (isImageMime(file.type, file.name)) {
      const mimeType = file.type || (/\.png$/i.test(file.name) ? "image/png" : "image/jpeg");
      const buffer = Buffer.from(await file.arrayBuffer());
      imageSources.push({ base64: buffer.toString("base64"), mimeType });
      continue;
    }

    const extracted = await extractTextFromUpload(file);
    if (extracted.status === "extracted" && extracted.text.trim()) {
      textSources.push({ fileName: file.name, text: extracted.text });
    } else {
      throw new LessonPrepError(`تعذّر قراءة الملف "${file.name}" — الصيغ المدعومة: PDF، Word (.docx)، JPG، PNG`);
    }
  }

  return { textSources, imageSources, fileNames };
}

export interface CreateLessonPrepInput {
  teacherId: string;
  subjectId: SubjectId;
  mode: LessonPrepMode;
  lessonTitle: string;
  gradeLevel: string;
  styleNotes?: string;
  files?: File[];
}

export async function createLessonPrep(input: CreateLessonPrepInput): Promise<LessonPrepRequest> {
  if (!input.lessonTitle.trim()) throw new LessonPrepError("عنوان الدرس مطلوب");
  if (!input.gradeLevel.trim()) throw new LessonPrepError("المستوى الدراسي مطلوب");

  let textSources: LessonSourceText[] = [];
  let imageSources: LessonSourceImage[] = [];
  let sourceFileNames: string[] = [];

  if (input.mode === "merge") {
    const files = input.files ?? [];
    if (files.length === 0) throw new LessonPrepError("أرفق مذكرة واحدة على الأقل (PDF، Word أو صورة)");
    if (files.length > MAX_SOURCE_FILES) throw new LessonPrepError(`الحد الأقصى ${MAX_SOURCE_FILES} ملفات لكل طلب`);
    const classified = await classifySourceFiles(files);
    textSources = classified.textSources;
    imageSources = classified.imageSources;
    sourceFileNames = classified.fileNames;
  }

  const requestId = `lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  let request: LessonPrepRequest;
  try {
    const { steps, sections } = await runLessonPrepPipeline({
      mode: input.mode,
      subjectId: input.subjectId,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      styleNotes: input.styleNotes,
      textSources,
      imageSources,
    });

    const outDir = path.join(GENERATED_DIR, input.teacherId, requestId);
    fs.mkdirSync(outDir, { recursive: true });

    request = {
      id: requestId,
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      mode: input.mode,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      sourceFileNames,
      steps,
      sections,
      status: "done",
      failureReason: null,
      fileDocx: null,
      createdAt,
    };

    const docxBuffer = await buildLessonPrepDocx(request);
    const docxPath = path.join(outDir, "lesson-prep.docx");
    fs.writeFileSync(docxPath, docxBuffer);
    request.fileDocx = docxPath;
  } catch (err) {
    request = {
      id: requestId,
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      mode: input.mode,
      lessonTitle: input.lessonTitle,
      gradeLevel: input.gradeLevel,
      sourceFileNames,
      steps: [],
      sections: [],
      status: "failed",
      failureReason: err instanceof Error ? err.message : "خطأ غير معروف",
      fileDocx: null,
      createdAt,
    };
  }

  insertLessonPrep(request);
  return request;
}

export function listLessonPrepsForTeacher(teacherId: string, subjectId: SubjectId): LessonPrepRequest[] {
  return listLessonPreps(teacherId, subjectId);
}

export function getLessonPrep(id: string, teacherId: string): LessonPrepRequest | null {
  return findLessonPrep(id, teacherId);
}
