import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { getKbSourceDocument } from "@/lib/db";
import { classifyAsExam, classifyAsExercise, classifyAsLesson, KnowledgeBaseError } from "@/lib/knowledgeBase/service";
import { proposeExamFromText, proposeExercisesFromText, proposeLessonFromText, AiClassificationError } from "@/lib/knowledgeBase/aiClassifier";

// Orchestration only: proposes a draft via Gemini (aiClassifier.ts, which
// writes nothing to the DB), then hands that draft to the deterministic
// service layer (classifyAsLesson/Exercise/Exam) to actually create the
// row — every row created here starts at status "classified", never
// verified/published, so an AI proposal is never trusted further than any
// other newly-classified row (submitForVerification + human review still
// apply exactly as they would for a manually-entered one).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const document = getKbSourceDocument(id);
  if (!document) return NextResponse.json({ error: "وثيقة غير موجودة" }, { status: 404 });

  const rawText = document.rawText ?? document.excerpt;
  if (!rawText) {
    return NextResponse.json({ error: "لا يوجد نص مستخرَج لهذه الوثيقة بعد — استخرج النص أولًا" }, { status: 400 });
  }

  try {
    if (document.documentKind === "lesson" || document.documentKind === "curriculum_reference") {
      const draft = await proposeLessonFromText({
        subjectId: document.subjectId,
        educationLevelId: document.educationLevelId,
        sourceDocumentId: document.id,
        rawText,
      });
      const lesson = classifyAsLesson(draft);
      return NextResponse.json({ created: [{ type: "lesson", id: lesson.id }] });
    }

    if (document.documentKind === "exercise_sheet") {
      const drafts = await proposeExercisesFromText({
        subjectId: document.subjectId,
        educationLevelId: document.educationLevelId,
        sourceDocumentId: document.id,
        rawText,
      });
      const created = drafts.map((d) => ({ type: "exercise" as const, id: classifyAsExercise(d).id }));
      return NextResponse.json({ created });
    }

    if (document.documentKind === "exam") {
      const body = await req.json().catch(() => ({}));
      const correctionDocumentId = typeof body?.correctionDocumentId === "string" ? body.correctionDocumentId : null;
      const correctionDoc = correctionDocumentId ? getKbSourceDocument(correctionDocumentId) : null;
      const correctionRawText = correctionDoc ? (correctionDoc.rawText ?? correctionDoc.excerpt) : null;

      const draft = await proposeExamFromText({
        subjectId: document.subjectId,
        educationLevelId: document.educationLevelId,
        sourceDocumentId: document.id,
        examType: "bem",
        contentYear: document.contentYear,
        examRawText: rawText,
        correctionRawText,
      });
      const exam = classifyAsExam(draft);
      return NextResponse.json({ created: [{ type: "exam", id: exam.id }] });
    }

    return NextResponse.json(
      { error: "هذا النوع من الوثائق (model_answer) لا يُصنَّف وحده — اختر وثيقة الامتحان المرتبطة به بدلًا من ذلك" },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof AiClassificationError || err instanceof KnowledgeBaseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
