// Real verification of the new payment-reminder sweep — a learner who got
// RIB details via WhatsApp but never sent a receipt photo previously got
// zero follow-up at all. Proves: a genuinely stale session gets reminded
// (real in-app notification + remindedAt set), a session with a receipt
// already attached does NOT get reminded, a too-recent session does NOT
// get reminded, and a session already reminded does NOT get reminded again.
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db npx tsx scripts/verify-payment-reminder-sweep.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  subscriptionPlans,
  invoices,
  whatsappCheckoutSessions,
  notifications,
} from "../drizzle/schema";
import { createPaymentReceipt } from "../server/db";
import { remindStaleCheckoutSessions } from "../server/whatsappBot";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();

  console.log("1. Seeding a real user, a plan, and THREE pending invoices for three different scenarios...");
  await db.insert(users).values({ openId: `reminder-user-${tag}`, name: "Reminder User", email: `reminder-${tag}@example.com`, role: "learner" });
  const user = (await db.select().from(users).where(eq(users.openId, `reminder-user-${tag}`)).limit(1))[0];
  await db.insert(subscriptionPlans).values({ slug: `reminder-plan-${tag}`, titleAr: "خ", titleFr: "P", titleEn: "P", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d", currency: "DZD", priceCents: 100000, durationDays: 30 });
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, `reminder-plan-${tag}`)).limit(1))[0];

  // Invoice A: genuinely stale (old session, no receipt) — MUST be reminded.
  await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  // Invoice B: old session, but a receipt WAS already sent — must NOT be reminded.
  await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  // Invoice C: session is too recent — must NOT be reminded yet.
  await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  const [invoiceA, invoiceB, invoiceC] = await db.select().from(invoices).where(eq(invoices.userId, user.id));

  const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000);
  const phoneA = `+213500${String(tag).slice(-6)}`;
  const phoneB = `+213501${String(tag).slice(-6)}`;
  const phoneC = `+213502${String(tag).slice(-6)}`;
  await db.insert(whatsappCheckoutSessions).values({ phoneNumber: phoneA, invoiceId: invoiceA.id, updatedAt: oldTime });
  await db.insert(whatsappCheckoutSessions).values({ phoneNumber: phoneB, invoiceId: invoiceB.id, updatedAt: oldTime });
  await db.insert(whatsappCheckoutSessions).values({ phoneNumber: phoneC, invoiceId: invoiceC.id, updatedAt: recentTime });

  console.log("2. Invoice B already has a real receipt attached (learner DID follow up)...");
  await createPaymentReceipt({ invoiceId: invoiceB.id, storageKey: "k", url: "http://x/1", mimeType: "image/jpeg" });

  console.log("3. Running the reminder sweep with a 24h threshold...");
  const result1 = await remindStaleCheckoutSessions(24);
  console.log("   sweep result:", result1);
  assert(result1.remindedCount === 1, `exactly 1 session (A) must be reminded, got ${result1.remindedCount}`);

  console.log("4. Verifying real state changes in MySQL...");
  const sessionA = (await db.select().from(whatsappCheckoutSessions).where(eq(whatsappCheckoutSessions.invoiceId, invoiceA.id)).limit(1))[0];
  const sessionB = (await db.select().from(whatsappCheckoutSessions).where(eq(whatsappCheckoutSessions.invoiceId, invoiceB.id)).limit(1))[0];
  const sessionC = (await db.select().from(whatsappCheckoutSessions).where(eq(whatsappCheckoutSessions.invoiceId, invoiceC.id)).limit(1))[0];
  assert(sessionA.remindedAt !== null, "session A (genuinely stale) must be marked reminded");
  assert(sessionB.remindedAt === null, "session B (already has a receipt) must NOT be marked reminded");
  assert(sessionC.remindedAt === null, "session C (too recent) must NOT be marked reminded");

  const userNotifs = await db.select().from(notifications).where(eq(notifications.userId, user.id));
  const reminderNotifs = userNotifs.filter(n => n.type === "payment_reminder");
  assert(reminderNotifs.length === 1, `exactly 1 real reminder notification must exist, got ${reminderNotifs.length}`);
  assert(reminderNotifs[0].body === String(invoiceA.id), "the reminder notification must reference invoice A specifically");

  console.log("5. Running the sweep AGAIN — session A must NOT be reminded a second time...");
  const result2 = await remindStaleCheckoutSessions(24);
  assert(result2.remindedCount === 0, `the second sweep must remind 0 sessions (A already reminded), got ${result2.remindedCount}`);
  const userNotifsAfter = await db.select().from(notifications).where(eq(notifications.userId, user.id));
  assert(userNotifsAfter.filter(n => n.type === "payment_reminder").length === 1, "no duplicate reminder notification must be created on a second sweep run");

  console.log("\n✅ ALL PAYMENT REMINDER SWEEP ASSERTIONS PASSED against real MySQL:");
  console.log("   - A genuinely stale session (old, no receipt) gets a real reminder notification");
  console.log("   - A session that already has a receipt is correctly skipped");
  console.log("   - A too-recent session is correctly skipped");
  console.log("   - A second sweep run does not re-remind or duplicate the notification");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
