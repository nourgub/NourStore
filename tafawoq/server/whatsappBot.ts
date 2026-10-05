// WhatsApp payment bot, built against Meta's real, publicly documented
// WhatsApp Cloud API (developers.facebook.com/docs/whatsapp/cloud-api).
// Unlike BaridiMob, this is not a guessed spec — the endpoints, payload
// shapes, and webhook verification handshake below match Meta's actual API.
//
// What is still required before this is live: a Meta Business Account with
// WhatsApp Business Platform access, a verified sending phone number, a
// permanent access token, and a webhook verify token you choose yourself.
// None of that exists in this environment — set the three WHATSAPP_* env
// vars (see server/_core/env.ts) once you have them.
//
// What this bot deliberately does NOT do: auto-approve a payment. A photo
// of a bank transfer receipt cannot be verified as genuine or as actually
// having landed in the account by an automated script — that requires a
// human checking the real bank/CCP statement. The bot's job ends at
// "collect the receipt and notify a human"; markInvoicePaid is only ever
// called from the admin review action (see routers.ts `admin.reviewPaymentReceipt`).

import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { validateUploadBytes } from "./uploadValidation";
import {
  getInvoiceById,
  createPaymentReceipt,
  getWhatsappSession,
  setWhatsappSession,
  getPlatformSetting,
  getStaleCheckoutSessionsForReminder,
  markSessionReminded,
  createNotification,
} from "./db";

// WhatsApp's own "image" message type already constrains what Meta will
// classify this way, but that's Meta's platform behavior, not something
// this code enforces — so the extension is derived from the mime type
// Meta reports (never hardcoded), and every inbound receipt photo still
// goes through the exact same magic-byte/size validation as a web upload
// (server/uploadValidation.ts) before ever reaching storage.
const WHATSAPP_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isWhatsAppBotConfigured(): boolean {
  return Boolean(
    ENV.whatsappAccessToken &&
      ENV.whatsappPhoneNumberId &&
      ENV.whatsappVerifyToken
  );
}

const GRAPH_API_VERSION = "v20.0";

export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  if (!isWhatsAppBotConfigured()) return false;
  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${ENV.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("[whatsapp bot] failed to send message", error);
    return false;
  }
}

/** Downloads inbound media (a receipt photo) via the Graph API's two-step media-fetch flow, then stores it in our own object storage. */
async function downloadInboundMedia(
  mediaId: string
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!isWhatsAppBotConfigured()) return null;
  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${ENV.whatsappAccessToken}` } }
    );
    if (!metaResponse.ok) return null;
    const meta = (await metaResponse.json()) as {
      url?: string;
      mime_type?: string;
    };
    if (!meta.url) return null;
    const fileResponse = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${ENV.whatsappAccessToken}` },
    });
    if (!fileResponse.ok) return null;
    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    return { bytes, mimeType: meta.mime_type || "image/jpeg" };
  } catch (error) {
    console.error("[whatsapp bot] failed to download inbound media", error);
    return null;
  }
}

/**
 * Extracts an invoice reference (e.g. "NX-INV-42") from free-text a learner
 * typed into WhatsApp — this is how the bot links an incoming conversation
 * to the specific pending invoice created by payments.initiateCheckout.
 */
export function extractInvoiceReference(text: string): number | null {
  const match = text.match(/NX-INV-(\d+)/i);
  return match ? Number(match[1]) : null;
}

export type WhatsAppInboundMessage =
  | { type: "text"; from: string; text: string; messageId: string }
  | { type: "image"; from: string; mediaId: string; messageId: string };

/**
 * Handles one inbound WhatsApp message. Two paths only:
 *   1. Text mentioning a valid pending invoice → reply with RIB + instructions, remember the session.
 *   2. Photo, while a session exists for that phone number → store it as a receipt awaiting human review.
 * Anything else gets a short, honest fallback reply. Never marks any invoice paid.
 */
export async function handleWhatsAppInboundMessage(
  message: WhatsAppInboundMessage
): Promise<void> {
  if (message.type === "text") {
    const invoiceId = extractInvoiceReference(message.text);
    if (!invoiceId) {
      await sendWhatsAppText(
        message.from,
        "مرحبًا 👋 لمتابعة الدفع، الرجاء إرسال رابط الدفع الذي حصلت عليه من المنصة أولًا."
      );
      return;
    }
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice || invoice.status !== "pending") {
      await sendWhatsAppText(
        message.from,
        "لم نجد طلب دفع معلّق بهذا المرجع، أو أنه سبق معالجته. تأكد من الرابط أو تواصل مع الإدارة."
      );
      return;
    }
    const rib =
      (await getPlatformSetting("payment_rib_details")) ||
      "لم يتم ضبط معلومات الحساب البنكي بعد من طرف الإدارة.";
    await setWhatsappSession(message.from, invoiceId);
    await sendWhatsAppText(
      message.from,
      `لإتمام الدفع (المرجع: NX-INV-${invoiceId}، المبلغ: ${(invoice.amountCents / 100).toLocaleString("ar-DZ")} ${invoice.currency}):\n\n${rib}\n\nبعد التحويل، أرسل صورة وصل التحويل هنا مباشرة.`
    );
    return;
  }

  // Image message: only accepted if this phone number has an open session for a specific pending invoice.
  const session = await getWhatsappSession(message.from);
  if (!session) {
    await sendWhatsAppText(
      message.from,
      "لم نجد طلب دفع مرتبطًا برقمك. أرسل أولًا مرجع الدفع الذي تلقيته من المنصة."
    );
    return;
  }
  const invoice = await getInvoiceById(session.invoiceId);
  if (!invoice || invoice.status !== "pending") {
    await sendWhatsAppText(
      message.from,
      "طلب الدفع المرتبط بهذه المحادثة لم يعد معلّقًا. تواصل مع الإدارة إن كنت تعتقد أن هذا خطأ."
    );
    return;
  }
  const media = await downloadInboundMedia(message.mediaId);
  if (!media) {
    await sendWhatsAppText(
      message.from,
      "تعذّر استلام الصورة، حاول إرسالها مرة أخرى."
    );
    return;
  }
  const extension = WHATSAPP_IMAGE_EXTENSIONS[media.mimeType];
  const fileName = `${message.messageId}.${extension || "jpg"}`;
  const validation = validateUploadBytes({
    fileName,
    mimeType: media.mimeType,
    declaredSizeBytes: media.bytes.length,
    decodedByteLength: media.bytes.length,
    bytes: media.bytes,
  });
  if (!extension || !validation.ok) {
    await sendWhatsAppText(
      message.from,
      "الملف المُرسل ليس صورة صالحة أو حجمه غير مقبول. أرسل صورة الوصل بصيغة JPG أو PNG."
    );
    return;
  }
  const uploaded = await storagePut(
    `payment-receipts/${invoice.id}/${fileName}`,
    media.bytes,
    media.mimeType
  );
  await createPaymentReceipt({
    invoiceId: invoice.id,
    storageKey: uploaded.key,
    url: uploaded.url,
    mimeType: media.mimeType,
    whatsappFromNumber: message.from,
    whatsappMessageId: message.messageId,
  });
  await sendWhatsAppText(
    message.from,
    "تم استلام وصل الدفع ✅ سيتم التحقق منه يدويًا من طرف الإدارة، وستصلك رسالة عند التفعيل."
  );
}

/**
 * A learner who got RIB details via WhatsApp but never sent a receipt
 * photo was previously never followed up with at all — the invoice just
 * sat "pending" silently forever, with nothing prompting them to finish
 * paying or to ask for help if something went wrong. This sends one
 * reminder per stale session (never repeats — see markSessionReminded)
 * via WhatsApp (if the bot is configured) and, always, a real in-app
 * notification, so the reminder still reaches the learner even without a
 * live WhatsApp Business setup.
 *
 * No cron/scheduler exists in this environment — same documented pattern
 * as notifyExpiringSubscriptions / notifyAdminsOfStaleReceipts — exposed
 * as `admin.paymentReminderSweep` for an external scheduled job to call
 * periodically (see server/scheduledJobs.ts).
 */
export async function remindStaleCheckoutSessions(
  hoursThreshold = 24
): Promise<{ remindedCount: number }> {
  const staleSessions = await getStaleCheckoutSessionsForReminder(hoursThreshold);
  let remindedCount = 0;
  for (const session of staleSessions) {
    await sendWhatsAppText(
      session.phoneNumber,
      `مرحبًا 👋 لاحظنا أنك لم تُرسل بعد صورة وصل التحويل لطلب الدفع (المرجع: NX-INV-${session.invoiceId}، المبلغ: ${(session.amountCents / 100).toLocaleString("ar-DZ")} ${session.currency}). إذا كنت قد حوّلت المبلغ، أرسل الصورة هنا لإتمام التفعيل. إذا واجهت مشكلة، تواصل مع الدعم.`
    );
    await createNotification({
      userId: session.userId,
      type: "payment_reminder",
      title: "notifications.paymentReminder",
      body: String(session.invoiceId),
    });
    await markSessionReminded(session.sessionId);
    remindedCount += 1;
  }
  return { remindedCount };
}
