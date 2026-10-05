import { describe, expect, it, vi, afterEach } from "vitest";
import crypto from "crypto";
import {
  initiateChargilyCheckout,
  isChargilyConfigured,
  verifyChargilySignature,
  CHARGILY_CURRENCY,
} from "./chargilyProvider";

describe("chargily provider (no real credentials in this environment)", () => {
  it("reports itself as unconfigured when no secret key is set", () => {
    expect(isChargilyConfigured()).toBe(false);
  });

  it("refuses any currency other than DZD, regardless of configuration state", async () => {
    const result = await initiateChargilyCheckout({
      invoiceId: 1,
      amountCents: 1000,
      currency: "USD",
      returnUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_currency");
  });

  it("never fabricates a redirect URL or fake success when unconfigured", async () => {
    const result = await initiateChargilyCheckout({
      invoiceId: 1,
      amountCents: 1000,
      currency: CHARGILY_CURRENCY,
      returnUrl: "https://example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
      expect(result.message).toMatch(/pay\.chargily\.com/);
    }
  });

  it("rejects a webhook signature when no secret key is configured", () => {
    const rawBody = Buffer.from(JSON.stringify({ type: "checkout.paid" }));
    expect(verifyChargilySignature(rawBody, "anything")).toBe(false);
  });
});

// Real HMAC-SHA256 signature verification, against a real (test-only)
// configured secret — same vi.resetModules()/vi.stubEnv()/dynamic re-import
// pattern as whatsappWebhook.test.ts, needed because ENV reads
// process.env.CHARGILY_SECRET_KEY once at module load.
describe("chargily webhook signature verification, once configured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a correctly computed signature", async () => {
    vi.resetModules();
    vi.stubEnv("CHARGILY_SECRET_KEY", "test_sk_example_not_a_real_key");
    const { verifyChargilySignature: verify } = await import("./chargilyProvider");
    const rawBody = Buffer.from(
      JSON.stringify({ type: "checkout.paid", data: { id: "chk_123" } })
    );
    const realSignature = crypto
      .createHmac("sha256", "test_sk_example_not_a_real_key")
      .update(rawBody)
      .digest("hex");
    expect(verify(rawBody, realSignature)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret (forged webhook)", async () => {
    vi.resetModules();
    vi.stubEnv("CHARGILY_SECRET_KEY", "test_sk_example_not_a_real_key");
    const { verifyChargilySignature: verify } = await import("./chargilyProvider");
    const rawBody = Buffer.from(
      JSON.stringify({ type: "checkout.paid", data: { id: "chk_123" } })
    );
    const forgedSignature = crypto
      .createHmac("sha256", "wrong-secret")
      .update(rawBody)
      .digest("hex");
    expect(verify(rawBody, forgedSignature)).toBe(false);
  });

  it("rejects a valid signature computed over a different (tampered) body", async () => {
    vi.resetModules();
    vi.stubEnv("CHARGILY_SECRET_KEY", "test_sk_example_not_a_real_key");
    const { verifyChargilySignature: verify } = await import("./chargilyProvider");
    const originalBody = Buffer.from(
      JSON.stringify({ type: "checkout.paid", data: { id: "chk_123" } })
    );
    const signatureForOriginal = crypto
      .createHmac("sha256", "test_sk_example_not_a_real_key")
      .update(originalBody)
      .digest("hex");
    const tamperedBody = Buffer.from(
      JSON.stringify({ type: "checkout.paid", data: { id: "chk_999" } })
    );
    expect(verify(tamperedBody, signatureForOriginal)).toBe(false);
  });

  it("reports itself as configured once a secret key is set", async () => {
    vi.resetModules();
    vi.stubEnv("CHARGILY_SECRET_KEY", "test_sk_example_not_a_real_key");
    const { isChargilyConfigured: configured } = await import("./chargilyProvider");
    expect(configured()).toBe(true);
  });
});
