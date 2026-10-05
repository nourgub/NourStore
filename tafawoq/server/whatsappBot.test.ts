import { describe, expect, it } from "vitest";
import {
  extractInvoiceReference,
  isWhatsAppBotConfigured,
  remindStaleCheckoutSessions,
} from "./whatsappBot";

describe("whatsapp bot (no real Meta credentials in this environment)", () => {
  it("reports itself as unconfigured with no credentials set", () => {
    expect(isWhatsAppBotConfigured()).toBe(false);
  });

  it("extracts a valid invoice reference from free-text messages", () => {
    expect(extractInvoiceReference("مرحبا أريد الدفع، المرجع: NX-INV-42")).toBe(
      42
    );
    expect(extractInvoiceReference("nx-inv-7 please")).toBe(7);
    expect(extractInvoiceReference("Ref NX-INV-1001, amount 1500 DZD")).toBe(
      1001
    );
  });

  it("returns null when no invoice reference is present", () => {
    expect(extractInvoiceReference("hello, how are you?")).toBeNull();
    expect(extractInvoiceReference("NX-1234")).toBeNull();
  });
});

describe("remindStaleCheckoutSessions (no DB in this environment)", () => {
  it("returns a safe zero result instead of throwing when no database is configured", async () => {
    await expect(remindStaleCheckoutSessions(24)).resolves.toEqual({
      remindedCount: 0,
    });
  });
});
