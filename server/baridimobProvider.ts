// BaridiMob (Algérie Poste) payment provider.
//
// IMPORTANT — read before wiring this up in production:
//
// Algérie Poste does not publish a public, self-serve REST API for
// BaridiMob. Real integration requires:
//   1. Registering as a merchant via https://baridiweb.poste.dz (or through
//      an Algérie-Poste-authorized payment aggregator).
//   2. Algérie Poste (or the aggregator) issuing you real credentials and
//      an integration specification directly — endpoint URLs, request/
//      response field names, and signature scheme are NOT public and are
//      not guessed at here.
//   3. Regulatory note: Algerian rules require online payments for local
//      purchases to be in DZD only (foreign-currency card payments for
//      local goods/services are not permitted) — this module refuses any
//      other currency outright, independent of whatever the real gateway
//      would also enforce.
//
// Until BARIDIMOB_MERCHANT_ID / BARIDIMOB_API_KEY / BARIDIMOB_API_BASE_URL
// are all set (see server/_core/env.ts), this module reports itself as
// unconfigured and refuses to attempt a charge — it never fabricates a
// successful payment or a fake redirect URL.

import { ENV } from "./_core/env";

export const BARIDIMOB_CURRENCY = "DZD" as const;

export function isBaridimobConfigured(): boolean {
  return Boolean(
    ENV.baridimobMerchantId && ENV.baridimobApiKey && ENV.baridimobApiBaseUrl
  );
}

export type BaridimobCheckoutResult =
  | { ok: true; redirectUrl: string; providerReference: string }
  | {
      ok: false;
      reason: "not_configured" | "unsupported_currency" | "provider_error";
      message: string;
    };

/**
 * Initiates a BaridiMob checkout for a given invoice. Returns a redirect URL
 * the learner is sent to complete payment on Algérie Poste's hosted page,
 * per the standard SATIM-style redirect flow used across Algerian payment
 * gateways (create session → redirect → user pays with OTP → provider
 * redirects/calls back with a status the webhook then verifies).
 *
 * NOT IMPLEMENTED: the actual HTTP call to Algérie Poste's API. The request/
 * response shape below is a placeholder structure common to this class of
 * gateway (merchant id, order reference, amount in centimes, return URLs) —
 * it must be replaced with the real specification once Algérie Poste
 * provides it. Calling this function today always returns "not_configured".
 */
export async function initiateBaridimobCheckout(input: {
  invoiceId: number;
  amountCents: number;
  currency: string;
  returnUrl: string;
}): Promise<BaridimobCheckoutResult> {
  if (input.currency !== BARIDIMOB_CURRENCY) {
    return {
      ok: false,
      reason: "unsupported_currency",
      message:
        "BaridiMob only supports DZD — Algerian regulation prohibits foreign-currency payment for local purchases.",
    };
  }
  if (!isBaridimobConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "BaridiMob merchant credentials are not set. Register a merchant account at https://baridiweb.poste.dz and set BARIDIMOB_MERCHANT_ID / BARIDIMOB_API_KEY / BARIDIMOB_API_BASE_URL.",
    };
  }
  // Real implementation goes here once Algérie Poste's actual API spec is
  // available, e.g.:
  //   const response = await fetch(`${ENV.baridimobApiBaseUrl}/payments/sessions`, {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${ENV.baridimobApiKey}`, "Content-Type": "application/json" },
  //     body: JSON.stringify({ merchantId: ENV.baridimobMerchantId, orderId: input.invoiceId, amount: input.amountCents, currency: "012" /* ISO 4217 numeric for DZD, if required */, returnUrl: input.returnUrl }),
  //   });
  //   ... map response into { ok: true, redirectUrl, providerReference } ...
  return {
    ok: false,
    reason: "provider_error",
    message:
      "BaridiMob integration is configured but the real API call has not been implemented — Algérie Poste's exact endpoint/response spec is required first.",
  };
}
