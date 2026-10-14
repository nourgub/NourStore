import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { approvePaperGrade, GradingError } from "@/lib/grading";
import type { QuestionGradeResult } from "@/lib/types";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const approvedTotal = Number(body?.approvedTotal);
  if (!Number.isFinite(approvedTotal) || approvedTotal < 0) {
    return NextResponse.json({ error: "النقطة المعتمدة غير صالحة" }, { status: 400 });
  }
  const questionResults = Array.isArray(body?.questionResults)
    ? (body.questionResults as QuestionGradeResult[])
    : undefined;

  try {
    const paper = approvePaperGrade(id, teacher.id, approvedTotal, questionResults);
    return NextResponse.json({ paper });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
