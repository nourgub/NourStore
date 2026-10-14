import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getLessonPrep } from "@/lib/lessonPrep";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const lessonPrep = getLessonPrep(id, teacher.id);
  if (!lessonPrep) return NextResponse.json({ error: "التحضير غير موجود" }, { status: 404 });

  const filePath = lessonPrep.fileDocx;
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const utf8FileName = `تحضير-${lessonPrep.lessonTitle}-${lessonPrep.id}.docx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="lesson-prep-${lessonPrep.id}.docx"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
    },
  });
}
