import { describe, expect, it } from "vitest";
import {
  initiateSlickpayCheckout,
  isSlickpayConfigured,
  SLICKPAY_CURRENCY,
} from "./slickpayProvider";

describe("slickpay provider (no real credentials in this environment)", () => {
  it("reports itself as unconfigured when no public key is set", () => {
    expect(isSlickpayConfigured()).toBe(false);
  });

  it("refuses any currency other than DZD, regardless of configuration state", async () => {
    const result = await initiateSlickpayCheckout({
      invoiceId: 1,
      amountCents: 1000,
      currency: "USD",
      returnUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_currency");
  });

  it("never fabricates a redirect URL or fake success when unconfigured", async () => {
    const result = await initiateSlickpayCheckout({
      invoiceId: 1,
      amountCents: 1000,
      currency: SLICKPAY_CURRENCY,
      returnUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
      expect(result.message).toMatch(/slick-pay\.com/);
    }
  });
});
