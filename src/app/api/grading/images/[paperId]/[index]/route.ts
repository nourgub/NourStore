import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getStudentPaper } from "@/lib/grading";

const EXT_TO_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ paperId: string; index: string }> },
) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { paperId, index } = await context.params;
  const paper = getStudentPaper(paperId, teacher.id);
  if (!paper) return NextResponse.json({ error: "الورقة غير موجودة" }, { status: 404 });

  const imagePath = paper.imagePaths[Number(index)];
  if (!imagePath || !fs.existsSync(imagePath)) {
    return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });
  }

  const ext = imagePath.split(".").pop()?.toLowerCase() ?? "";
  const buffer = fs.readFileSync(imagePath);
  return new NextResponse(buffer, {
    headers: { "Content-Type": EXT_TO_MIME[ext] ?? "application/octet-stream" },
  });
}
