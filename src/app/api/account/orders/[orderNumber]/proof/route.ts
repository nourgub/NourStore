import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MERCHANT_SESSION_COOKIE, verifyMerchantSessionToken } from "@/lib/merchant-auth";
import { saveUploadedImage, UploadValidationError } from "@/lib/upload";

const EDITABLE_STATUSES = new Set(["pending_payment", "proof_submitted"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;

  const cookieStore = await cookies();
  const merchantId = await verifyMerchantSessionToken(
    cookieStore.get(MERCHANT_SESSION_COOKIE)?.value,
  );
  if (!merchantId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order || order.merchantId !== merchantId) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }
  if (!EDITABLE_STATUSES.has(order.status)) {
    return NextResponse.json(
      { error: "لا يمكن تعديل إثبات الدفع بعد تأكيد هذا الطلب" },
      { status: 409 },
    );
  }

  const formData = await request.formData();
  const proofFile = formData.get("proofImage");
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return NextResponse.json({ error: "الرجاء اختيار صورة" }, { status: 400 });
  }

  let proofImagePath: string;
  try {
    proofImagePath = await saveUploadedImage(proofFile);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const updated = await db.order.update({
    where: { id: order.id },
    data: { proofImage: proofImagePath, status: "proof_submitted" },
  });

  return NextResponse.json({ order: updated });
}
