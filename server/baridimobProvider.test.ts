import { describe, expect, it } from "vitest";
import {
  initiateBaridimobCheckout,
  isBaridimobConfigured,
  BARIDIMOB_CURRENCY,
} from "./baridimobProvider";

describe("baridimob provider (no real credentials in this environment)", () => {
  it("reports itself as unconfigured when no merchant credentials are set", () => {
    expect(isBaridimobConfigured()).toBe(false);
  });

  it("refuses any currency other than DZD, regardless of configuration state", async () => {
    const result = await initiateBaridimobCheckout({
      invoiceId: 1,
      amountCents: 1000,
      currency: "USD",
      returnUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_currency");
  });

  it("never fabricates a redirect URL or fake success when unconfigured", async () => {
    const result = await initiateBaridimobCheckout({
      invoiceId: 1,
      amountCents: 1000,
      currency: BARIDIMOB_CURRENCY,
      returnUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
      expect(result.message).toMatch(/baridiweb\.poste\.dz/);
    }
  });
});
