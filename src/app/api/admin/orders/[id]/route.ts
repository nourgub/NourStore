import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { statusLabels } from "@/components/status-badge";

const statusSchema = z.object({
  status: z.enum(["pending_payment", "proof_submitted", "paid", "fulfilled", "cancelled"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const order = await db.order.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { product: true },
  });

  const notifyPhone = order.whatsapp || order.phone;
  void sendWhatsappMessage(
    notifyPhone,
    `تحديث بخصوص طلبك ${order.orderNumber} (${order.product.name}): الحالة الآن "${statusLabels[order.status] ?? order.status}".`,
  );

  return NextResponse.json({ order });
}
