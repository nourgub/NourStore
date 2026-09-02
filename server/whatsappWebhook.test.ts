import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "crypto";

describe("WhatsApp webhook signature verification (real HMAC-SHA256, Meta's documented scheme)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects everything when WHATSAPP_APP_SECRET is not configured", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    const body = Buffer.from(JSON.stringify({ entry: [] }));
    const validLookingSig =
      "sha256=" + crypto.createHmac("sha256", "irrelevant").update(body).digest("hex");
    expect(verifyWhatsAppSignature(body, validLookingSig)).toBe(false);
  });

  it("accepts a correctly computed signature once configured", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "real-app-secret-123");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    const body = Buffer.from(JSON.stringify({ entry: [{ id: "1" }] }));
    const realSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", "real-app-secret-123")
        .update(body)
        .digest("hex");
    expect(verifyWhatsAppSignature(body, realSignature)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret (forged webhook)", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "real-app-secret-123");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    const body = Buffer.from(JSON.stringify({ entry: [{ id: "1" }] }));
    const forgedSignature =
      "sha256=" +
      crypto
        .createHmac("sha256", "attacker-guessed-secret")
        .update(body)
        .digest("hex");
    expect(verifyWhatsAppSignature(body, forgedSignature)).toBe(false);
  });

  it("rejects a signature computed over different bytes than what was actually sent (tampered payload)", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "real-app-secret-123");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    const originalBody = Buffer.from(JSON.stringify({ entry: [{ id: "1" }] }));
    const signatureForOriginal =
      "sha256=" +
      crypto
        .createHmac("sha256", "real-app-secret-123")
        .update(originalBody)
        .digest("hex");
    const tamperedBody = Buffer.from(JSON.stringify({ entry: [{ id: "2" }] }));
    expect(verifyWhatsAppSignature(tamperedBody, signatureForOriginal)).toBe(
      false
    );
  });

  it("rejects a missing signature header even with a valid secret configured", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "real-app-secret-123");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    const body = Buffer.from(JSON.stringify({ entry: [] }));
    expect(verifyWhatsAppSignature(body, undefined)).toBe(false);
  });

  it("rejects a missing/empty raw body even with a valid secret and header format", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "real-app-secret-123");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    expect(verifyWhatsAppSignature(undefined, "sha256=abcd")).toBe(false);
  });

  it("rejects a header that doesn't start with the sha256= prefix Meta always sends", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_APP_SECRET", "real-app-secret-123");
    const { verifyWhatsAppSignature } = await import("./whatsappWebhook");
    const body = Buffer.from(JSON.stringify({ entry: [] }));
    expect(verifyWhatsAppSignature(body, "not-the-right-format")).toBe(false);
  });
});
