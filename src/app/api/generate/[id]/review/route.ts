import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getGenerationForTeacher } from "@/lib/generation";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const generation = await getGenerationForTeacher(teacher.id, id);
  if (!generation) return NextResponse.json({ error: "الامتحان غير موجود" }, { status: 404 });

  return NextResponse.json({ review: generation.review });
}
