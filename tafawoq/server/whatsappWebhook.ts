// WhatsApp Cloud API webhook — matches Meta's real, documented webhook
// contract (verification handshake + inbound message payload shape). See
// server/whatsappBot.ts for what happens with each inbound message and for
// what credentials are still required before this does anything live.

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { ENV } from "./_core/env";
import {
  handleWhatsAppInboundMessage,
  isWhatsAppBotConfigured,
} from "./whatsappBot";

/**
 * Meta's real, documented scheme: HMAC-SHA256 of the raw request body,
 * keyed with the App Secret, sent as `sha256=<hex>` in
 * X-Hub-Signature-256. Verified here — not just parsed and trusted —
 * so a POST to a discovered webhook URL can't forge inbound messages
 * (e.g. a fake "payment receipt image" from an arbitrary phone number).
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined
): boolean {
  if (!ENV.whatsappAppSecret) return false;
  if (!rawBody || !signatureHeader) return false;
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const expected = crypto
    .createHmac("sha256", ENV.whatsappAppSecret)
    .update(rawBody)
    .digest("hex");
  const provided = signatureHeader.slice(prefix.length);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export function registerWhatsAppWebhook(app: Express) {
  // Meta's webhook verification handshake: it sends this GET once when you
  // register the webhook URL in the Meta App dashboard.
  app.get("/api/webhooks/whatsapp", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (!ENV.whatsappVerifyToken || !isWhatsAppBotConfigured()) {
      res
        .status(501)
        .send("WhatsApp bot is not configured on this deployment.");
      return;
    }
    if (mode === "subscribe" && token === ENV.whatsappVerifyToken) {
      res.status(200).send(String(challenge));
      return;
    }
    res.sendStatus(403);
  });

  app.post("/api/webhooks/whatsapp", async (req: Request, res: Response) => {
    if (!isWhatsAppBotConfigured()) {
      res
        .status(501)
        .json({ error: "WhatsApp bot is not configured on this deployment." });
      return;
    }
    if (!ENV.whatsappAppSecret) {
      // Fails closed rather than silently accepting unverified inbound
      // messages just because a required secret wasn't set — a real Meta
      // App always has an App Secret, so this only ever fires on a
      // genuinely incomplete deployment, never a real one.
      console.error(
        "[whatsapp webhook] WHATSAPP_APP_SECRET is not set — refusing to process inbound webhook payloads until it is configured."
      );
      res.status(501).json({
        error:
          "WhatsApp webhook signature verification is not configured on this deployment.",
      });
      return;
    }
    const signature = req.header("x-hub-signature-256");
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!verifyWhatsAppSignature(rawBody, signature)) {
      res.status(401).json({ error: "Invalid webhook signature." });
      return;
    }
    // Acknowledge immediately per Meta's requirements, then process.
    res.status(200).json({ received: true });
    try {
      const entries = req.body?.entry ?? [];
      for (const entry of entries) {
        for (const change of entry.changes ?? []) {
          const messages = change.value?.messages ?? [];
          for (const message of messages) {
            if (message.type === "text" && message.text?.body) {
              await handleWhatsAppInboundMessage({
                type: "text",
                from: message.from,
                text: message.text.body,
                messageId: message.id,
              });
            } else if (message.type === "image" && message.image?.id) {
              await handleWhatsAppInboundMessage({
                type: "image",
                from: message.from,
                mediaId: message.image.id,
                messageId: message.id,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[whatsapp webhook] handler error", error);
    }
  });
}
