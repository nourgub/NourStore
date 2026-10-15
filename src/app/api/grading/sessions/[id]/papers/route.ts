import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { submitStudentPaper, GradingError } from "@/lib/grading";
import { assertFeatureAllowed, recordUsage, UsageLimitError } from "@/lib/usage";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (teacher.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "الاشتراك غير مفعّل بعد" }, { status: 403 });
  }

  try {
    assertFeatureAllowed(teacher, "grading");
  } catch (err) {
    if (err instanceof UsageLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { id } = await context.params;
  const form = await request.formData();
  const studentName = String(form.get("studentName") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  try {
    const paper = await submitStudentPaper(teacher.id, id, studentName, files);
    recordUsage(teacher.id, "grading");
    return NextResponse.json({ paper });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
