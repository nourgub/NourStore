import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { LessonPrepAgentError } from "@/lib/agents/lessonPrepAgent";
import {
  getActiveLessonPrepTemplate,
  LessonPrepTemplateError,
  removeLessonPrepTemplate,
  uploadLessonPrepTemplate,
} from "@/lib/lessonPrepTemplate";
import { assertFeatureEnabled, UsageLimitError } from "@/lib/usage";
import type { SubjectId } from "@/lib/types";

export async function GET(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const subjectId = (request.nextUrl.searchParams.get("subjectId") as SubjectId) || "math";
  const template = getActiveLessonPrepTemplate(teacher.id, subjectId);
  return NextResponse.json({ template });
}

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    assertFeatureEnabled(teacher, "lessonPrep");
  } catch (err) {
    if (err instanceof UsageLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const subjectId = (form.get("subjectId") as string) || "math";
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "أرفق ملف النموذج" }, { status: 400 });

  try {
    const template = await uploadLessonPrepTemplate({ teacherId: teacher.id, subjectId: subjectId as SubjectId, file });
    return NextResponse.json({ template });
  } catch (err) {
    if (err instanceof LessonPrepTemplateError || err instanceof LessonPrepAgentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف النموذج مطلوب" }, { status: 400 });

  removeLessonPrepTemplate(id, teacher.id);
  return NextResponse.json({ ok: true });
}
