import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWhatsappMessage } from "@/lib/whatsapp";

const sendSchema = z.object({
  phone: z.string().trim().min(5),
  body: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const result = await sendWhatsappMessage(parsed.data.phone, parsed.data.body);
  return NextResponse.json(result);
}
