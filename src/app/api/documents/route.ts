import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { createDocument, listDocumentsForTeacher } from "@/lib/documents";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "@/lib/extractText";
import type { ExtractionStatus, SubjectId } from "@/lib/types";

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

  if (!gradeLevel) {
    return NextResponse.json({ error: "المستوى الدراسي مطلوب" }, { status: 400 });
  }
  if (topics.length === 0) {
    return NextResponse.json({ error: "أدخل محورًا واحدًا على الأقل" }, { status: 400 });
  }

  let fileName = "بدون ملف — محاور مُدخلة يدويًا";
  let extractionStatus: ExtractionStatus = "none";
  let extractedText = "";

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (10 ميغابايت)" }, { status: 400 });
    }
    fileName = file.name;
    const extraction = await extractTextFromUpload(file);
    extractionStatus = extraction.status;
    extractedText = extraction.text;
  }

  const document = await createDocument({
    teacherId: teacher.id,
    subjectId,
    fileName,
    gradeLevel,
    topics,
    styleNotes,
    extractionStatus,
    extractedText,
  });

  return NextResponse.json({ document });
}
