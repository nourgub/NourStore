import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { splitDocxIntoPages } from "@/lib/docxPageSplit";
import { MAX_UPLOAD_BYTES } from "@/lib/extractText";

function isDocx(fileName: string, mimeType: string): boolean {
  return (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.toLowerCase().endsWith(".docx")
  );
}

// Stateless utility: splits an uploaded .docx into pages (by manual page
// breaks only — see src/lib/docxPageSplit.ts) so the exam-generation form
// can let a teacher preview each page and map "exercise N -> page M" before
// submitting. Nothing is persisted here; the selected page texts travel
// with the generation request itself.
export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (10 ميغابايت)" }, { status: 400 });
  }
  if (!isDocx(file.name, file.type)) {
    return NextResponse.json({ error: "هذه الميزة تدعم ملفات Word (.docx) فقط" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let pages;
  try {
    pages = await splitDocxIntoPages(buffer);
  } catch {
    // Never log the raw error — it can embed document content/paths.
    return NextResponse.json({ error: "تعذّر قراءة الملف — تأكد أنه ملف Word سليم (.docx)" }, { status: 400 });
  }

  if (pages.length === 0) {
    return NextResponse.json({ error: "لم يُستخرج أي نص من الملف" }, { status: 400 });
  }

  return NextResponse.json({ pages });
}
