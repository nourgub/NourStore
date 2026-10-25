import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { replacePaperImages, GradingError } from "@/lib/grading";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  try {
    const paper = await replacePaperImages(teacher.id, id, files);
    return NextResponse.json({ paper });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
