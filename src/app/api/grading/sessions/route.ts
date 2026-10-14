import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { createGradingSession, getGradingSessionsForTeacher, GradingError } from "@/lib/grading";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const sessions = getGradingSessionsForTeacher(teacher.id);
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (teacher.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "الاشتراك غير مفعّل بعد" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.examRequestId) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  try {
    const session = await createGradingSession(teacher.id, String(body.examRequestId), String(body.title ?? ""));
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
