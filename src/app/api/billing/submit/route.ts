import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { submitPaymentReceipt, BillingError } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "الرجاء اختيار ملف الوصل" }, { status: 400 });
  }

  try {
    const paymentRequest = await submitPaymentReceipt(teacher.id, file);
    return NextResponse.json({ paymentRequest });
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
