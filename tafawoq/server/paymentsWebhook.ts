// Provider-neutral payment webhook endpoint.
//
// No real payment provider is configured in this codebase (no API keys, no
// live integration). This file defines the *contract* a real provider
// (Stripe or otherwise) would call into, and performs real signature
// verification IF a webhook secret is configured — otherwise it refuses the
// request rather than pretending to process it.
//
// To wire up a real provider:
//   1. Set PAYMENT_PROVIDER (e.g. "stripe") and PAYMENT_WEBHOOK_SECRET in the
//      environment (see DEPLOYMENT.md).
//   2. Replace `verifySignature` below with that provider's real signature
//      scheme (e.g. Stripe's `Stripe-Signature` header + HMAC-SHA256 over the
//      raw body — see req.rawBody, captured in server/_core/index.ts's body
//      parser specifically so real webhook verification has the exact bytes
//      the sender actually signed, not a re-serialized JSON.stringify).
//   3. Map that provider's event payload shape into the `WebhookEvent`
//      shape below before calling `handlePaymentWebhookEvent`.
//
// This endpoint is the ONLY place invoices/subscriptions are marked paid —
// never a client-reachable mutation — so a client can never fake a
// successful payment.

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { ENV } from "./_core/env";
import {
  markInvoicePaid,
  markInvoiceFailed,
  markRefundResult,
  getInvoiceByProviderReference,
} from "./db";
import {
  isChargilyConfigured,
  verifyChargilySignature,
  type ChargilyWebhookEvent,
} from "./chargilyProvider";

type WebhookEvent =
  | { type: "payment.succeeded"; invoiceId: number; providerReference: string }
  | { type: "payment.failed"; invoiceId: number; providerReference?: string }
  | { type: "refund.succeeded"; refundId: number; providerReference?: string }
  | { type: "refund.failed"; refundId: number; providerReference?: string };

/**
 * Stub HMAC verification against a single shared secret, now computed over
 * the real raw request bytes (req.rawBody) rather than a re-serialized
 * JSON.stringify(req.body). This is NOT a specific provider's real scheme
 * (Stripe, for example, has its own header format and timestamp-tolerance
 * rules) — it exists so the endpoint fails closed (rejects everything)
 * until a real provider's verification logic replaces it, rather than
 * silently accepting unverified requests.
 */
function verifySignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined
): boolean {
  if (!ENV.paymentWebhookSecret) return false;
  if (!rawBody || !signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", ENV.paymentWebhookSecret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Chargily's real webhook: header "signature", HMAC-SHA256 of the raw body
 * keyed by the same secret key used for outbound requests (see
 * chargilyProvider.ts) — a different scheme from the generic provider-
 * neutral stub below, so it's handled as its own branch before falling
 * through to that stub for any other/future provider.
 */
async function handleChargilyWebhook(req: Request, res: Response) {
  if (!isChargilyConfigured()) {
    res
      .status(501)
      .json({ error: "Chargily is not configured on this deployment." });
    return;
  }
  const signature = req.header("signature");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!verifyChargilySignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid webhook signature." });
    return;
  }
  const event = req.body as ChargilyWebhookEvent;
  try {
    const invoice = await getInvoiceByProviderReference(
      "chargily",
      event.data.id
    );
    if (!invoice) {
      // A checkout id Chargily is telling us about but that was never
      // recorded here — log and acknowledge rather than error, so Chargily
      // doesn't keep retrying a webhook this deployment can never resolve.
      console.warn(
        `[chargily webhook] no invoice found for checkout ${event.data.id}`
      );
      res.status(200).json({ received: true });
      return;
    }
    switch (event.type) {
      case "checkout.paid":
        await markInvoicePaid({
          invoiceId: invoice.id,
          provider: "chargily",
          providerReference: event.data.id,
        });
        break;
      case "checkout.failed":
      case "checkout.canceled":
        await markInvoiceFailed({
          invoiceId: invoice.id,
          provider: "chargily",
          providerReference: event.data.id,
        });
        break;
      default:
        // An event type this deployment doesn't act on yet (Chargily also
        // sends non-checkout events) — acknowledged, not an error.
        break;
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[chargily webhook] handler error", error);
    res.status(500).json({ error: "Webhook processing failed." });
  }
}

export function registerPaymentWebhooks(app: Express) {
  app.post(
    "/api/webhooks/payments/:provider",
    async (req: Request, res: Response) => {
      if (req.params.provider === "chargily") {
        await handleChargilyWebhook(req, res);
        return;
      }
      if (!ENV.paymentProvider || !ENV.paymentWebhookSecret) {
        // Fails closed and says so explicitly — no provider is configured yet.
        res
          .status(501)
          .json({
            error: "No payment provider is configured on this deployment.",
          });
        return;
      }
      const signature = req.header("x-webhook-signature");
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!verifySignature(rawBody, signature)) {
        res.status(401).json({ error: "Invalid webhook signature." });
        return;
      }
      const event = req.body as WebhookEvent;
      try {
        switch (event.type) {
          case "payment.succeeded": {
            await markInvoicePaid({
              invoiceId: event.invoiceId,
              provider: req.params.provider,
              providerReference: event.providerReference,
            });
            break;
          }
          case "payment.failed": {
            await markInvoiceFailed({
              invoiceId: event.invoiceId,
              provider: req.params.provider,
              providerReference: event.providerReference,
            });
            break;
          }
          case "refund.succeeded": {
            await markRefundResult({
              refundId: event.refundId,
              status: "succeeded",
              providerReference: event.providerReference,
            });
            break;
          }
          case "refund.failed": {
            await markRefundResult({
              refundId: event.refundId,
              status: "failed",
              providerReference: event.providerReference,
            });
            break;
          }
          default:
            res.status(400).json({ error: "Unrecognized event type." });
            return;
        }
        res.status(200).json({ received: true });
      } catch (error) {
        console.error("[payments webhook] handler error", error);
        res.status(500).json({ error: "Webhook processing failed." });
      }
    }
  );
}

// Exported for potential reuse (e.g. reconciliation jobs) — not currently called elsewhere.
export { getInvoiceByProviderReference };
