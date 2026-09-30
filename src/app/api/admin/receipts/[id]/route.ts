import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminEmail } from "@/lib/billingConfig";
import { findPaymentRequest } from "@/lib/db";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminEmail(teacher.email)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const paymentRequest = findPaymentRequest(id);
  if (!paymentRequest || !fs.existsSync(paymentRequest.receiptPath)) {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }

  const buffer = fs.readFileSync(paymentRequest.receiptPath);
  return new NextResponse(buffer, {
    headers: { "Content-Type": paymentRequest.receiptMimeType },
  });
}
