import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { MERCHANT_SESSION_COOKIE, verifyMerchantSessionToken } from "@/lib/merchant-auth";
import { renderInvoiceHtml } from "@/lib/invoice";
import { renderHtmlToPdf } from "@/lib/pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { product: true },
  });
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const merchantId = await verifyMerchantSessionToken(
    cookieStore.get(MERCHANT_SESSION_COOKIE)?.value,
  );
  const isOwner = merchantId && merchantId === order.merchantId;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const html = renderInvoiceHtml(order);
    const pdf = await renderHtmlToPdf(html);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[invoice:pdf-error]", error);
    return NextResponse.json(
      {
        error:
          "تعذر إنشاء ملف PDF. تأكد من توفر متصفح Chromium على الخادم (راجع قسم الفواتير في README).",
      },
      { status: 500 },
    );
  }
}
