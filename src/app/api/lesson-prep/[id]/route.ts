import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getLessonPrep } from "@/lib/lessonPrep";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const lessonPrep = getLessonPrep(id, teacher.id);
  if (!lessonPrep) return NextResponse.json({ error: "التحضير غير موجود" }, { status: 404 });

  return NextResponse.json({ lessonPrep });
}
