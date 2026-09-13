// Chargily Pay (Chargily EPay) — an Algerian payment gateway with a real,
// public, well-documented REST API (unlike BaridiMob) and a free sandbox
// (unlike SlickPay's undocumented request body, this one's fully
// confirmed) — see https://dev.chargily.com/pay-v2/api-reference.
//
// Confirmed directly from Chargily's own official docs (not guessed):
//   - Base URLs: https://pay.chargily.net/api/v2 (live),
//     https://pay.chargily.net/test/api/v2 (test)
//   - Auth: `Authorization: Bearer <secret key>` (test keys start "test_sk_")
//   - POST /checkouts with { amount, currency, success_url, ... } returns
//     { id, checkout_url, ... }
//   - Webhooks: header "signature", HMAC-SHA256 of the raw request body
//     keyed by the same secret key; event `type` is one of "checkout.paid",
//     "checkout.failed", "checkout.canceled", with the checkout object in
//     `data` (data.id matches the checkout id returned above).
//
// Regulatory note (same as BaridiMob/SlickPay): Algerian rules require
// online payments for local purchases to be in DZD only — this module
// refuses any other currency outright, independent of whatever Chargily's
// own gateway (which does support USD/EUR for other use cases) would also
// allow. If Chargily is ever meant to be the route for a genuinely
// cross-border USD/EUR sale, that's a deliberate policy change to make
// explicitly, not a default.

import crypto from "crypto";
import { ENV } from "./_core/env";

export const CHARGILY_CURRENCY = "dzd" as const;

function chargilyBaseUrl(): string {
  return ENV.chargilySandbox
    ? "https://pay.chargily.net/test/api/v2"
    : "https://pay.chargily.net/api/v2";
}

export function isChargilyConfigured(): boolean {
  return Boolean(ENV.chargilySecretKey);
}

export type ChargilyCheckoutResult =
  | { ok: true; redirectUrl: string; providerReference: string }
  | {
      ok: false;
      reason: "not_configured" | "unsupported_currency" | "provider_error";
      message: string;
    };

/**
 * Initiates a Chargily checkout for a given invoice. Returns a redirect URL
 * (Chargily's own hosted checkout_url) the learner is sent to complete
 * payment on.
 */
export async function initiateChargilyCheckout(input: {
  invoiceId: number;
  amountCents: number;
  currency: string;
  returnUrl: string;
}): Promise<ChargilyCheckoutResult> {
  if (input.currency.toLowerCase() !== CHARGILY_CURRENCY) {
    return {
      ok: false,
      reason: "unsupported_currency",
      message:
        "Chargily is only wired up for DZD here — Algerian regulation prohibits foreign-currency payment for local purchases.",
    };
  }
  if (!isChargilyConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Chargily is not set up yet. Get a secret key from https://pay.chargily.com/dashboard/developers-corner and set CHARGILY_SECRET_KEY (CHARGILY_SANDBOX=false once using a live, non-test_sk_ key).",
    };
  }
  try {
    const response = await fetch(`${chargilyBaseUrl()}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.chargilySecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Chargily's amount unit is the currency's own major unit (e.g. DZD,
        // not centimes) per their quick-start example (amount: 2000 for a
        // 2000 DZD checkout) — this codebase stores amountCents in the
        // smallest unit throughout, so it's converted back here, at the one
        // boundary that talks to Chargily's real API.
        amount: Math.round(input.amountCents / 100),
        currency: CHARGILY_CURRENCY,
        success_url: input.returnUrl,
        description: `Nourix Academy invoice #${input.invoiceId}`,
        metadata: [{ invoiceId: input.invoiceId }],
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        reason: "provider_error",
        message: `Chargily rejected the checkout request (HTTP ${response.status}).`,
      };
    }
    const data = (await response.json()) as {
      id?: string;
      checkout_url?: string;
    };
    if (!data.id || !data.checkout_url) {
      return {
        ok: false,
        reason: "provider_error",
        message: "Chargily's response was missing an id or checkout_url.",
      };
    }
    return { ok: true, redirectUrl: data.checkout_url, providerReference: data.id };
  } catch (error) {
    return {
      ok: false,
      reason: "provider_error",
      message: `Chargily request failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Verifies Chargily's real webhook signature scheme: the "signature" header
 * is an HMAC-SHA256 of the raw request body, keyed by the same secret key
 * used for the Authorization header on outbound requests.
 */
export function verifyChargilySignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined
): boolean {
  if (!ENV.chargilySecretKey) return false;
  if (!rawBody || !signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", ENV.chargilySecretKey)
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

export type ChargilyWebhookEvent = {
  type: "checkout.paid" | "checkout.failed" | "checkout.canceled" | string;
  data: { id: string; amount?: number; status?: string };
};
