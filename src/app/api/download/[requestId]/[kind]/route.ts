import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getGenerationForTeacher } from "@/lib/generation";

const KIND_TO_FIELD = {
  exam: "examDocx",
  solution: "solutionDocx",
  rubric: "rubricDocx",
} as const;

const KIND_TO_LABEL = {
  exam: "امتحان",
  solution: "حل-نموذجي",
  rubric: "شبكة-تنقيط",
} as const;

const KIND_TO_ASCII_LABEL = {
  exam: "exam",
  solution: "solution",
  rubric: "rubric",
} as const;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ requestId: string; kind: string }> },
) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { requestId, kind } = await context.params;
  if (!(kind in KIND_TO_FIELD)) {
    return NextResponse.json({ error: "نوع ملف غير معروف" }, { status: 400 });
  }

  const generation = await getGenerationForTeacher(teacher.id, requestId);
  if (!generation) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const field = KIND_TO_FIELD[kind as keyof typeof KIND_TO_FIELD];
  const filePath = generation.files[field];
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const label = KIND_TO_LABEL[kind as keyof typeof KIND_TO_LABEL];
  const asciiLabel = KIND_TO_ASCII_LABEL[kind as keyof typeof KIND_TO_ASCII_LABEL];
  const utf8FileName = `${label}-${generation.id}.docx`;
  // HTTP headers must be Latin-1 bytes, so Arabic filenames need the
  // RFC 5987 filename* form; filename= keeps an ASCII fallback.
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${asciiLabel}-${generation.id}.docx"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
    },
  });
}
