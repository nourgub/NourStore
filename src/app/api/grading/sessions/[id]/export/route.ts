import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { exportSessionResultsCsv, getGradingSession } from "@/lib/grading";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const csv = exportSessionResultsCsv(id, teacher.id);
  if (csv === null) return NextResponse.json({ error: "جلسة التصحيح غير موجودة" }, { status: 404 });

  const session = getGradingSession(id, teacher.id);
  const fileName = `نتائج-${session?.title ?? id}.csv`;
  // Excel needs a UTF-8 BOM to render Arabic correctly instead of mojibake.
  const withBom = "﻿" + csv;
  return new NextResponse(withBom, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="results-${id}.csv"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
