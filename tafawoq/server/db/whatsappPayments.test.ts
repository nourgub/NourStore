import { describe, expect, it } from "vitest";
import {
  notifyAdminsOfStaleReceipts,
  getWhatsappSession,
  setWhatsappSession,
} from "./whatsappPayments";

// Every test in this file specifically exercises the "no database
// configured" fallback contract (getDb() returning null) — not a
// coincidence of empty results, an explicit code path. Two of the three
// assertions happen to also hold against a real, empty database (a SELECT
// that matches nothing is "undefined" either way), but the third
// (setWhatsappSession, a real INSERT) is not: against a real MySQL
// instance it correctly attempts to write a real row and fails on a real
// foreign-key constraint (invoiceId 1 doesn't exist) instead of hitting
// the null-db early return at all. Skipping this whole file when
// DATABASE_URL is set — rather than leaving it to fail unpredictably —
// is the honest fix: it was never testing real database behavior in the
// first place, so "does it still pass against a real DB" was never the
// right question to ask about it. Real database behavior for this exact
// module is covered separately by server/realDb.e2e.test.ts.
describe.skipIf(!!process.env.DATABASE_URL)(
  "notifyAdminsOfStaleReceipts (no DB in this environment)",
  () => {
    it("returns a safe zero result instead of throwing when no database is configured", async () => {
      await expect(notifyAdminsOfStaleReceipts(24)).resolves.toEqual({
        staleCount: 0,
        notificationsSent: 0,
      });
    });
  }
);

describe.skipIf(!!process.env.DATABASE_URL)(
  "WhatsApp checkout session (no DB in this environment)",
  () => {
    it("getWhatsappSession returns undefined instead of throwing with no database", async () => {
      await expect(
        getWhatsappSession("+213500000000")
      ).resolves.toBeUndefined();
    });

    it("setWhatsappSession returns false instead of throwing with no database", async () => {
      await expect(setWhatsappSession("+213500000000", 1)).resolves.toBe(
        false
      );
    });
  }
);
