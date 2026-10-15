import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { createLessonPrep, LessonPrepError, listLessonPrepsForTeacher } from "@/lib/lessonPrep";
import { assertFeatureAllowed, recordUsage, UsageLimitError } from "@/lib/usage";
import type { LessonPrepMode, SubjectId } from "@/lib/types";

export async function GET(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const subjectId = (request.nextUrl.searchParams.get("subjectId") as SubjectId) || "math";
  const lessonPreps = listLessonPrepsForTeacher(teacher.id, subjectId);
  return NextResponse.json({ lessonPreps });
}

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (teacher.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "الاشتراك غير مفعّل بعد" }, { status: 403 });
  }

  try {
    assertFeatureAllowed(teacher, "lessonPrep");
  } catch (err) {
    if (err instanceof UsageLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const subjectId = (form.get("subjectId") as string) || "math";
  const mode = (form.get("mode") as string) === "merge" ? "merge" : ("generate" as LessonPrepMode);
  const lessonTitle = String(form.get("lessonTitle") ?? "");
  const gradeLevel = String(form.get("gradeLevel") ?? "");
  const styleNotes = String(form.get("styleNotes") ?? "") || undefined;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  try {
    const lessonPrep = await createLessonPrep({
      teacherId: teacher.id,
      subjectId: subjectId as SubjectId,
      mode,
      lessonTitle,
      gradeLevel,
      styleNotes,
      files,
    });
    recordUsage(teacher.id, "lessonPrep");
    return NextResponse.json({ lessonPrep });
  } catch (err) {
    if (err instanceof LessonPrepError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
