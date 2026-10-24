import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { GenerationError, updateExamQuestions, type EditedQuestionInput } from "@/lib/generation";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const questions = Array.isArray(body?.questions) ? (body.questions as EditedQuestionInput[]) : null;
  if (!questions) return NextResponse.json({ error: "صيغة الطلب غير صالحة" }, { status: 400 });

  try {
    const updated = await updateExamQuestions(teacher.id, id, questions);
    return NextResponse.json({ generation: updated });
  } catch (err) {
    if (err instanceof GenerationError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
