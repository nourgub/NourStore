import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/merchants";

function isConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Sends a WhatsApp message via Meta's WhatsApp Cloud API and records it in the
 * thread history. No-ops (but still logs the message) when the store owner
 * hasn't configured their own WhatsApp Business credentials yet.
 */
export async function sendWhatsappMessage(toPhone: string, body: string) {
  const phone = normalizePhone(toPhone);

  if (!isConfigured()) {
    console.log(`[whatsapp:not-configured] would send to ${phone}: ${body}`);
    await db.whatsappMessage.create({
      data: { phone, direction: "outbound", body, status: "not_configured" },
    });
    return { sent: false, reason: "not_configured" as const };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body },
        }),
      },
    );

    const ok = response.ok;
    await db.whatsappMessage.create({
      data: { phone, direction: "outbound", body, status: ok ? "sent" : "failed" },
    });

    if (!ok) {
      const errorText = await response.text();
      console.error(`[whatsapp:send-failed] ${response.status}: ${errorText}`);
    }

    return { sent: ok };
  } catch (error) {
    console.error("[whatsapp:send-error]", error);
    await db.whatsappMessage.create({
      data: { phone, direction: "outbound", body, status: "failed" },
    });
    return { sent: false, reason: "network_error" as const };
  }
}
