// Real verification of the WhatsApp multi-invoice session fix. Proves a
// learner referencing two pending invoices from the same phone number no
// longer loses the ability to have a receipt correctly attributed to
// whichever one they most recently mentioned — and that resolving one
// invoice doesn't strand the other's session.
//
// Run with: DATABASE_URL=mysql://user:pass@host:3306/db npx tsx scripts/verify-whatsapp-multi-invoice-session.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, subscriptionPlans, invoices, whatsappCheckoutSessions } from "../drizzle/schema";
import { getWhatsappSession, setWhatsappSession, markInvoicePaid } from "../server/db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");
  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();
  const phone = `+213555${String(tag).slice(-6)}`;

  console.log("1. Seeding a real learner, a plan, and TWO simultaneously pending invoices...");
  await db.insert(users).values({ openId: `wa-session-user-${tag}`, name: "WA User", email: `wa-${tag}@example.com`, role: "learner" });
  const user = (await db.select().from(users).where(eq(users.openId, `wa-session-user-${tag}`)).limit(1))[0];
  await db.insert(subscriptionPlans).values({ slug: `wa-plan-${tag}`, titleAr: "خطة", titleFr: "Plan", titleEn: "Plan", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d", currency: "DZD", priceCents: 100000, durationDays: 30 });
  const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, `wa-plan-${tag}`)).limit(1))[0];
  await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 100000, provider: "whatsapp", status: "pending" });
  const [invoiceA, invoiceB] = await db.select().from(invoices).where(eq(invoices.userId, user.id));
  assert(invoiceA && invoiceB, "two pending invoices must exist");

  console.log("2. The learner texts the reference for invoice A first...");
  await setWhatsappSession(phone, invoiceA.id);
  const sessionAfterA = await getWhatsappSession(phone);
  assert(sessionAfterA?.invoiceId === invoiceA.id, `session must point to invoice A right after referencing it, got ${sessionAfterA?.invoiceId}`);

  console.log("3. THE BUG THIS FIXES: the learner then also texts the reference for invoice B (e.g. retrying checkout)...");
  await setWhatsappSession(phone, invoiceB.id);
  const sessionAfterB = await getWhatsappSession(phone);
  assert(sessionAfterB?.invoiceId === invoiceB.id, `session must now point to the more-recently-referenced invoice B, got ${sessionAfterB?.invoiceId}`);

  const bothRowsStillExist = await db.select().from(whatsappCheckoutSessions).where(eq(whatsappCheckoutSessions.phoneNumber, phone));
  assert(bothRowsStillExist.length === 2, `BOTH session rows must still exist (old bug: referencing B would have destroyed A's row) — got ${bothRowsStillExist.length} row(s)`);
  assert(bothRowsStillExist.some(r => r.invoiceId === invoiceA.id), "invoice A's session row must still be present");
  assert(bothRowsStillExist.some(r => r.invoiceId === invoiceB.id), "invoice B's session row must still be present");

  console.log("4. Invoice B gets paid (e.g. the learner's photo for B was reviewed and approved)...");
  await markInvoicePaid({ invoiceId: invoiceB.id, provider: "whatsapp" });

  console.log("5. THE REAL FIX: a photo now arrives with no new text reference — the session must fall back to invoice A (still pending), NOT stay stuck on the now-paid invoice B...");
  const sessionAfterBPaid = await getWhatsappSession(phone);
  assert(sessionAfterBPaid?.invoiceId === invoiceA.id, `session must fall back to the still-pending invoice A once B is paid, got ${sessionAfterBPaid?.invoiceId}`);

  console.log("6. Re-referencing invoice B again after it's already paid must NOT resurrect it as the active session...");
  await setWhatsappSession(phone, invoiceB.id); // learner accidentally re-sends the old reference
  const sessionAfterReReference = await getWhatsappSession(phone);
  assert(sessionAfterReReference?.invoiceId === invoiceA.id, `re-referencing an already-paid invoice must not shadow the real pending one (A), got ${sessionAfterReReference?.invoiceId}`);

  console.log("\n✅ ALL WHATSAPP MULTI-INVOICE SESSION ASSERTIONS PASSED against real MySQL:");
  console.log("   - Referencing a second pending invoice no longer destroys the first invoice's session row");
  console.log("   - The most-recently-referenced PENDING invoice is always the resolved session");
  console.log("   - Once an invoice is paid, its session correctly stops shadowing a different still-pending one");
  console.log("   - Re-referencing an already-resolved invoice does not resurrect it over a real pending one");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
