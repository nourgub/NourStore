import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { createGeneration, GenerationError } from "@/lib/generation";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "@/lib/extractText";
import { assertFeatureAllowed, recordUsage, UsageLimitError } from "@/lib/usage";
import type { SubjectId } from "@/lib/types";

// Lets a teacher use grading entirely standalone: upload an exam they
// already wrote plus its model-correction document, instead of generating
// one through this platform. Gated on the "grading" feature/quota (not
// "exams") — this exists specifically so a teacher on the grading_only plan
// (see plans.ts) has an actual way to reach grading, since every grading
// session otherwise requires a GenerationRequest row that only the
// exams-gated /api/generate route could previously create.
export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    assertFeatureAllowed(teacher, "grading");
  } catch (err) {
    if (err instanceof UsageLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const form = await request.formData();
  const examTitle = String(form.get("examTitle") ?? "");
  const gradeLevel = String(form.get("gradeLevel") ?? "");
  const topic = String(form.get("topic") ?? "");
  const subjectId = (form.get("subjectId") as SubjectId) || "math";
  const examFile = form.get("examFile");
  const correctionFile = form.get("correctionFile");

  if (!(examFile instanceof File) || examFile.size === 0) {
    return NextResponse.json({ error: "ملف الامتحان مطلوب" }, { status: 400 });
  }
  if (!(correctionFile instanceof File) || correctionFile.size === 0) {
    return NextResponse.json({ error: "ملف التصحيح النموذجي مطلوب" }, { status: 400 });
  }
  if (examFile.size > MAX_UPLOAD_BYTES || correctionFile.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "حجم أحد الملفين يتجاوز الحد المسموح (10 ميغابايت)" }, { status: 400 });
  }

  const [examExtraction, correctionExtraction] = await Promise.all([
    extractTextFromUpload(examFile),
    extractTextFromUpload(correctionFile),
  ]);

  if (examExtraction.status !== "extracted") {
    return NextResponse.json(
      { error: "تعذّر استخراج نص من ملف الامتحان — تأكد أنه ملف PDF أو Word سليم وقابل لاستخراج النص" },
      { status: 400 },
    );
  }
  if (correctionExtraction.status !== "extracted") {
    return NextResponse.json(
      { error: "تعذّر استخراج نص من ملف التصحيح — تأكد أنه ملف PDF أو Word سليم وقابل لاستخراج النص" },
      { status: 400 },
    );
  }

  try {
    const request_ = await createGeneration({
      teacherId: teacher.id,
      subjectId,
      documentId: null,
      examTitle,
      gradeLevel,
      topics: topic.trim() ? [topic.trim()] : [],
      numQuestions: 0,
      difficultyMix: "متوازن",
      importedExam: { examText: examExtraction.text, correctionText: correctionExtraction.text },
    });
    recordUsage(teacher, "grading");
    return NextResponse.json({ request: request_ });
  } catch (err) {
    if (err instanceof GenerationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
