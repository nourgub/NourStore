import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { submitStudentPaper, GradingError } from "@/lib/grading";
import { UsageLimitError } from "@/lib/usage";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const form = await request.formData();
  const studentName = String(form.get("studentName") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  try {
    // Usage is reserved atomically inside submitStudentPaper itself (keyed
    // by the paper's own id), not here — see its own comments for why.
    const paper = await submitStudentPaper(teacher, id, studentName, files);
    return NextResponse.json({ paper });
  } catch (err) {
    if (err instanceof UsageLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
