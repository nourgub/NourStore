import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getStudentPaper } from "@/lib/grading";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const paper = getStudentPaper(id, teacher.id);
  if (!paper) return NextResponse.json({ error: "الورقة غير موجودة" }, { status: 404 });

  return NextResponse.json({ paper });
}
