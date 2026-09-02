import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/merchants";

/**
 * Meta calls this once when the webhook URL is registered in the WhatsApp
 * Cloud API app dashboard, to verify ownership of the endpoint.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type WhatsappTextMessage = {
  from: string;
  type: string;
  text?: { body: string };
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  const messages: WhatsappTextMessage[] =
    payload?.entry?.[0]?.changes?.[0]?.value?.messages ?? [];

  for (const message of messages) {
    if (message.type !== "text" || !message.text?.body) continue;
    await db.whatsappMessage.create({
      data: {
        phone: normalizePhone(message.from),
        direction: "inbound",
        body: message.text.body,
      },
    });
  }

  // Meta expects a fast 200 response regardless of how the payload was handled.
  return NextResponse.json({ ok: true });
}
