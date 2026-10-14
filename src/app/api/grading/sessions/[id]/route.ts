import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getGradingSession, getPapersForSession } from "@/lib/grading";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const session = getGradingSession(id, teacher.id);
  if (!session) return NextResponse.json({ error: "جلسة التصحيح غير موجودة" }, { status: 404 });

  const papers = getPapersForSession(id, teacher.id);
  return NextResponse.json({ session, papers });
}
