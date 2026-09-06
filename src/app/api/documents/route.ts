import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { createDocument, listDocumentsForTeacher } from "@/lib/documents";
import type { SubjectId } from "@/lib/types";

export async function GET(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const subjectId = (request.nextUrl.searchParams.get("subjectId") as SubjectId) ?? "math";
  const documents = await listDocumentsForTeacher(teacher.id, subjectId);
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const form = await request.formData();
  const subjectId = (form.get("subjectId") as SubjectId) || "math";
  const gradeLevel = String(form.get("gradeLevel") ?? "").trim();
  const styleNotes = String(form.get("styleNotes") ?? "").trim();
  const topicsRaw = String(form.get("topics") ?? "").trim();
  const topics = topicsRaw
    ? topicsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const file = form.get("file");
  const fileName = file instanceof File ? file.name : "بدون ملف — محاور مُدخلة يدويًا";

  if (!gradeLevel) {
    return NextResponse.json({ error: "المستوى الدراسي مطلوب" }, { status: 400 });
  }
  if (topics.length === 0) {
    return NextResponse.json({ error: "أدخل محورًا واحدًا على الأقل" }, { status: 400 });
  }

  const document = await createDocument({
    teacherId: teacher.id,
    subjectId,
    fileName,
    gradeLevel,
    topics,
    styleNotes,
  });

  return NextResponse.json({ document });
}
