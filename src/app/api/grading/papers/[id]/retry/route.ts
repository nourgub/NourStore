import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { retryPaperGrading, GradingError } from "@/lib/grading";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  try {
    const paper = retryPaperGrading(id, teacher.id);
    return NextResponse.json({ paper });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
