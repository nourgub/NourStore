import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

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
  });

  return NextResponse.json({ order });
}
