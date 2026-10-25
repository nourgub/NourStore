import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { cleanupOldApprovedPaperImages, DEFAULT_IMAGE_RETENTION_DAYS } from "@/lib/grading";

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const olderThanDays = Number(body?.olderThanDays) > 0 ? Number(body.olderThanDays) : DEFAULT_IMAGE_RETENTION_DAYS;

  const result = cleanupOldApprovedPaperImages(olderThanDays);
  return NextResponse.json(result);
}
