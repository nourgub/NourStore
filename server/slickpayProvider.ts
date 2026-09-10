// SlickPay payment provider — an Algerian payment aggregator with a real,
// public REST API (unlike BaridiMob, see baridimobProvider.ts), reachable
// via a free self-serve sandbox at https://slick-pay.com with no merchant
// agreement required just to get a public_key and start testing.
//
// IMPORTANT — read before wiring this up in production:
//
// The base URLs, authentication scheme, and the invoice-creation endpoint
// below are confirmed directly from slick-pay-algeria's own official SDK
// source (@slick-pay-algeria/slickpay-npm, MIT-licensed, published on npm
// and GitHub) — not guessed. What is NOT yet confirmed is the exact set of
// fields the `merchants/invoices` endpoint's request body requires (their
// hosted API documentation at developers.slick-pay.com is a JavaScript
// single-page app with no fetchable static content, and neither the npm
// package's README nor its Laravel counterpart's README document the
// field names — both just point back at the same JS-rendered site).
//
// Rather than guess field names and ship something that silently fails or
// charges the wrong amount, this module implements everything that IS
// confirmed (config detection, the real endpoint/auth) and stops short of
// the actual request body, matching this codebase's standing rule: never
// fabricate an unconfirmed integration detail. See DEPLOYMENT.md for how to
// finish this once a sandbox public_key is available to test against.
//
// Regulatory note (same as BaridiMob): Algerian rules require online
// payments for local purchases to be in DZD only — this module refuses any
// other currency outright, independent of whatever SlickPay's own gateway
// would also enforce.

import { ENV } from "./_core/env";

export const SLICKPAY_CURRENCY = "DZD" as const;

function slickpayBaseUrl(): string {
  return ENV.slickpaySandbox
    ? "https://devapi.slick-pay.com/api/v2"
    : "https://prodapi.slick-pay.com/api/v2";
}

export function isSlickpayConfigured(): boolean {
  return Boolean(ENV.slickpayPublicKey);
}

export type SlickpayCheckoutResult =
  | { ok: true; redirectUrl: string; providerReference: string }
  | {
      ok: false;
      reason: "not_configured" | "unsupported_currency" | "provider_error";
      message: string;
    };

/**
 * Initiates a SlickPay checkout for a given invoice. Modeled on
 * initiateBaridimobCheckout's contract (same return shape) so
 * payments.initiateCheckout in routers.ts can treat every provider
 * uniformly — see the "slickpay" branch there.
 *
 * NOT IMPLEMENTED: the actual HTTP POST to merchants/invoices. The
 * confirmed pieces (base URL, `Authorization: Bearer <public_key>` header,
 * the endpoint path itself) are wired into slickpayBaseUrl() above and
 * ready to use — what's missing is the exact request body shape, which
 * needs one real test call against the sandbox (a free public_key from
 * slick-pay.com) to confirm rather than guess. Calling this function today
 * always returns "not_configured" until SLICKPAY_PUBLIC_KEY is set, and
 * "provider_error" if it is set but the real request still isn't wired up.
 */
export async function initiateSlickpayCheckout(input: {
  invoiceId: number;
  amountCents: number;
  currency: string;
  returnUrl: string;
}): Promise<SlickpayCheckoutResult> {
  if (input.currency !== SLICKPAY_CURRENCY) {
    return {
      ok: false,
      reason: "unsupported_currency",
      message:
        "SlickPay only supports DZD — Algerian regulation prohibits foreign-currency payment for local purchases.",
    };
  }
  if (!isSlickpayConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "SlickPay is not set up yet. Sign up for a free account at https://slick-pay.com, switch to sandbox mode, and set SLICKPAY_PUBLIC_KEY to your sandbox public key.",
    };
  }
  // Real implementation goes here once a sandbox public_key confirms the
  // exact request body fields, e.g.:
  //   const response = await fetch(`${slickpayBaseUrl()}/merchants/invoices`, {
  //     method: "POST",
  //     headers: {
  //       Accept: "application/json",
  //       Authorization: `Bearer ${ENV.slickpayPublicKey}`,
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({ amount: input.amountCents / 100, url: input.returnUrl, /* + whatever fields the sandbox test confirms */ }),
  //   });
  //   ... map response into { ok: true, redirectUrl, providerReference } ...
  return {
    ok: false,
    reason: "provider_error",
    message:
      "SlickPay is configured but the real request body has not been confirmed against the sandbox yet — see server/slickpayProvider.ts.",
  };
}
