// Real-database verification for notifyAdminsOfStaleReceipts — proves the
// sweep genuinely finds receipts stuck in manual review past a threshold,
// notifies every admin exactly once per receipt, respects the threshold
// (doesn't flag receipts that aren't actually stale yet), and never
// re-notifies the same admin about the same receipt on a repeat run.
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db npx tsx scripts/verify-stale-receipt-sweep.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  subscriptionPlans,
  invoices,
  paymentReceipts,
  notifications,
} from "../drizzle/schema";
import { notifyAdminsOfStaleReceipts } from "../server/db/whatsappPayments";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();

  console.log("1. Seeding two real admins, a learner, a plan, and two invoices...");
  await db.insert(users).values({ openId: `sweep-admin-1-${tag}`, name: "Admin One", email: `admin1-${tag}@example.com`, role: "admin" });
  await db.insert(users).values({ openId: `sweep-admin-2-${tag}`, name: "Admin Two", email: `admin2-${tag}@example.com`, role: "admin" });
  await db.insert(users).values({ openId: `sweep-learner-${tag}`, name: "Learner", email: `learner-${tag}@example.com`, role: "learner" });
  const admin1 = (await db.select().from(users).where(eq(users.openId, `sweep-admin-1-${tag}`)).limit(1))[0];
  const admin2 = (await db.select().from(users).where(eq(users.openId, `sweep-admin-2-${tag}`)).limit(1))[0];
  const learner = (await db.select().from(users).where(eq(users.openId, `sweep-learner-${tag}`)).limit(1))[0];
  assert(admin1 && admin2 && learner, "all seeded users must exist");

  await db.insert(subscriptionPlans).values({ slug: `sweep-plan-${tag}`, titleAr: "خطة", titleFr: "Plan", titleEn: "Plan", descriptionAr: "وصف", descriptionFr: "desc", descriptionEn: "desc", currency: "DZD", priceCents: 100000, durationDays: 30 });
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, `sweep-plan-${tag}`)).limit(1))[0];

  await db.insert(invoices).values({ userId: learner.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  await db.insert(invoices).values({ userId: learner.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  const allInvoices = await db.select().from(invoices).where(eq(invoices.userId, learner.id));
  assert(allInvoices.length === 2, "two invoices must exist");
  const [oldInvoice, freshInvoice] = allInvoices;

  console.log("2. Creating a real STALE receipt (48h old) and a real FRESH receipt (1h old)...");
  const now = Date.now();
  const staleTime = new Date(now - 48 * 60 * 60 * 1000);
  const freshTime = new Date(now - 1 * 60 * 60 * 1000);
  await db.insert(paymentReceipts).values({ invoiceId: oldInvoice.id, storageKey: "k1", url: "http://x/1", mimeType: "image/jpeg", status: "pending_review", createdAt: staleTime });
  await db.insert(paymentReceipts).values({ invoiceId: freshInvoice.id, storageKey: "k2", url: "http://x/2", mimeType: "image/jpeg", status: "pending_review", createdAt: freshTime });

  console.log("3. Running the sweep with a 24h threshold...");
  const result1 = await notifyAdminsOfStaleReceipts(24);
  console.log("   sweep result:", result1);
  assert(result1.staleCount === 1, `sweep must find exactly 1 stale receipt (the 48h one), got ${result1.staleCount}`);
  assert(result1.notificationsSent === 2, `sweep must notify both admins (2 notifications), got ${result1.notificationsSent}`);

  console.log("4. Confirming real notification rows exist for BOTH admins, referencing the STALE receipt only...");
  const staleReceiptRow = (await db.select().from(paymentReceipts).where(eq(paymentReceipts.invoiceId, oldInvoice.id)).limit(1))[0];
  const freshReceiptRow = (await db.select().from(paymentReceipts).where(eq(paymentReceipts.invoiceId, freshInvoice.id)).limit(1))[0];
  const admin1Notifs = await db.select().from(notifications).where(eq(notifications.userId, admin1.id));
  const admin2Notifs = await db.select().from(notifications).where(eq(notifications.userId, admin2.id));
  assert(admin1Notifs.some(n => n.type === "payment_receipt_stale" && n.body === String(staleReceiptRow.id)), "admin1 must have a real notification for the stale receipt");
  assert(admin2Notifs.some(n => n.type === "payment_receipt_stale" && n.body === String(staleReceiptRow.id)), "admin2 must have a real notification for the stale receipt");
  assert(!admin1Notifs.some(n => n.type === "payment_receipt_stale" && n.body === String(freshReceiptRow.id)), "the FRESH receipt (1h old) must NOT have triggered a notification");

  console.log("5. Running the sweep AGAIN — must NOT duplicate notifications (de-dup)...");
  const result2 = await notifyAdminsOfStaleReceipts(24);
  console.log("   second sweep result:", result2);
  assert(result2.staleCount === 1, "the second sweep must still see the same 1 stale receipt");
  assert(result2.notificationsSent === 0, `the second sweep must send 0 NEW notifications (de-dup), got ${result2.notificationsSent}`);
  const admin1NotifsAfter = await db.select().from(notifications).where(eq(notifications.userId, admin1.id));
  assert(admin1NotifsAfter.length === admin1Notifs.length, "admin1's notification count must be unchanged after the second sweep");

  console.log("6. Sanity check: a 72h threshold must find NOTHING (our stale receipt is only 48h old)...");
  const result3 = await notifyAdminsOfStaleReceipts(72);
  assert(result3.staleCount === 0, `a 72h threshold must find 0 receipts (48h < 72h), got ${result3.staleCount}`);

  console.log("\n✅ ALL STALE-RECEIPT SWEEP ASSERTIONS PASSED against real MySQL:");
  console.log("   - Correctly distinguishes a 48h-stale receipt from a 1h-fresh one");
  console.log("   - Notifies every real admin exactly once per stale receipt");
  console.log("   - De-dup verified: a second run sends zero duplicate notifications");
  console.log("   - Threshold verified: a stricter 72h threshold correctly finds nothing");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
