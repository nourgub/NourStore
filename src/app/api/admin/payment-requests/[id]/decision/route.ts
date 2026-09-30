import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminEmail } from "@/lib/billingConfig";
import { approvePaymentRequest, rejectPaymentRequest, BillingError } from "@/lib/billing";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminEmail(teacher.email)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  }

  try {
    const result = action === "approve" ? approvePaymentRequest(id) : rejectPaymentRequest(id);
    return NextResponse.json({ paymentRequest: result });
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
