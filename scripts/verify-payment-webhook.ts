// Real end-to-end verification of the payment webhook path — the gap
// AUDIT.md flagged: "the payment/invoice webhook path... [was] not walked
// through against real rows the way the core learning flow was."
//
// This starts the ACTUAL Express server as a child process (so real HTTP
// signature verification is exercised, not just the underlying DB
// functions in-process), sends genuinely signed requests, and verifies
// every resulting state change by reading real rows back from MySQL.
//
// Run with:
//   DATABASE_URL=mysql://user:pass@host:3306/db \
//   JWT_SECRET=... PAYMENT_PROVIDER=stripe PAYMENT_WEBHOOK_SECRET=test-secret \
//   npx tsx scripts/verify-payment-webhook.ts

import { spawn } from "child_process";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  subscriptionPlans,
  invoices,
  paymentAttempts,
  userSubscriptions,
  refunds,
  referralCodes,
  referralRedemptions,
  pointsLedger,
  notifications,
} from "../drizzle/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

const PORT = 3057;
const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET || "test-webhook-secret";
const PROVIDER = process.env.PAYMENT_PROVIDER || "stripe";

function sign(rawBody: string): string {
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
}

async function postWebhook(event: object, signature?: string) {
  const rawBody = JSON.stringify(event);
  const res = await fetch(
    `http://localhost:${PORT}/api/webhooks/payments/${PROVIDER}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature !== undefined
          ? { "x-webhook-signature": signature }
          : {}),
      },
      body: rawBody,
    }
  );
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("Server did not become healthy in time");
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL to a real MySQL instance before running this script.");

  const db = drizzle(process.env.DATABASE_URL);
  const tag = Date.now();

  console.log("1. Starting the real server as a child process...");
  const server = spawn(
    "npx",
    ["tsx", "server/_core/index.ts"],
    {
      env: {
        ...process.env,
        PORT: String(PORT),
        PAYMENT_PROVIDER: PROVIDER,
        PAYMENT_WEBHOOK_SECRET: WEBHOOK_SECRET,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let serverOutput = "";
  server.stdout?.on("data", d => (serverOutput += d.toString()));
  server.stderr?.on("data", d => (serverOutput += d.toString()));

  try {
    await waitForServer();
    console.log("   Server is up.");

    console.log("2. Seeding a real user, plan, and two pending invoices...");
    await db.insert(users).values({ openId: `webhook-user-${tag}`, name: "Webhook User", email: `webhook-${tag}@example.com`, role: "learner" });
    const user = (await db.select().from(users).where(eq(users.openId, `webhook-user-${tag}`)).limit(1))[0];
    await db.insert(users).values({ openId: `webhook-referrer-${tag}`, name: "Referrer", email: `referrer-${tag}@example.com`, role: "learner" });
    const referrer = (await db.select().from(users).where(eq(users.openId, `webhook-referrer-${tag}`)).limit(1))[0];
    assert(user && referrer, "seed users must exist");

    await db.insert(subscriptionPlans).values({ slug: `webhook-plan-${tag}`, titleAr: "خطة", titleFr: "Plan", titleEn: "Plan", descriptionAr: "د", descriptionFr: "d", descriptionEn: "d", currency: "DZD", priceCents: 150000, durationDays: 30 });
    const plan = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, `webhook-plan-${tag}`)).limit(1))[0];

    // Set up a referral: referrer -> user, not yet rewarded.
    await db.insert(referralCodes).values({ userId: referrer.id, code: `REF${tag}`.slice(0, 20) });
    const refCode = (await db.select().from(referralCodes).where(eq(referralCodes.userId, referrer.id)).limit(1))[0];
    await db.insert(referralRedemptions).values({ referralCodeId: refCode.id, referredUserId: user.id });

    await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 150000, provider: PROVIDER, status: "pending" });
    await db.insert(invoices).values({ userId: user.id, planId: plan.id, currency: "DZD", amountCents: 150000, provider: PROVIDER, status: "pending" });
    const pendingInvoices = await db.select().from(invoices).where(eq(invoices.userId, user.id));
    assert(pendingInvoices.length === 2, "two pending invoices must exist");
    const [successInvoice, failInvoice] = pendingInvoices;

    console.log("3. Sending a webhook request with NO signature — must be rejected...");
    const noSigResult = await postWebhook({ type: "payment.succeeded", invoiceId: successInvoice.id, providerReference: "pi_test" });
    assert(noSigResult.status === 401, `no-signature request must return 401, got ${noSigResult.status}`);

    console.log("4. Sending a webhook request with a WRONG signature — must be rejected...");
    const wrongSigResult = await postWebhook({ type: "payment.succeeded", invoiceId: successInvoice.id, providerReference: "pi_test" }, "0".repeat(64));
    assert(wrongSigResult.status === 401, `wrong-signature request must return 401, got ${wrongSigResult.status}`);

    const afterRejected = (await db.select().from(invoices).where(eq(invoices.id, successInvoice.id)).limit(1))[0];
    assert(afterRejected.status === "pending", "invoice must still be pending after rejected webhook attempts");

    console.log("5. Sending a REAL, correctly-signed payment.succeeded event...");
    const succeededEvent = { type: "payment.succeeded", invoiceId: successInvoice.id, providerReference: `pi_${tag}` };
    const succeededBody = JSON.stringify(succeededEvent);
    const goodResult = await postWebhook(succeededEvent, sign(succeededBody));
    assert(goodResult.status === 200, `correctly-signed webhook must return 200, got ${goodResult.status}: ${JSON.stringify(goodResult.body)}`);

    console.log("6. Verifying real state changes from real MySQL rows...");
    const paidInvoice = (await db.select().from(invoices).where(eq(invoices.id, successInvoice.id)).limit(1))[0];
    assert(paidInvoice.status === "paid", `invoice must be marked paid, got status=${paidInvoice.status}`);
    assert(paidInvoice.providerReference === `pi_${tag}`, "invoice must record the real provider reference");

    const activeSubs = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id));
    assert(activeSubs.length === 1, `exactly one subscription must be created, got ${activeSubs.length}`);
    assert(activeSubs[0].status === "active", "the new subscription must be active");

    const attempts = await db.select().from(paymentAttempts).where(eq(paymentAttempts.invoiceId, successInvoice.id));
    assert(attempts.some(a => a.status === "succeeded"), "a succeeded payment attempt must be recorded");

    const paymentNotifs = await db.select().from(notifications).where(eq(notifications.userId, user.id));
    assert(paymentNotifs.some(n => n.type === "payment"), "the paying user must get a real payment-succeeded notification");

    console.log("7. Verifying the referral reward was actually granted to the REFERRER...");
    const referrerLedger = await db.select().from(pointsLedger).where(eq(pointsLedger.userId, referrer.id));
    assert(referrerLedger.some(p => p.reason === "referral_reward"), "the referrer must receive real referral_reward points");
    const referrerNotifs = await db.select().from(notifications).where(eq(notifications.userId, referrer.id));
    assert(referrerNotifs.some(n => n.type === "referral"), "the referrer must get a real referral-reward notification");
    const redemptionAfter = (await db.select().from(referralRedemptions).where(eq(referralRedemptions.referredUserId, user.id)).limit(1))[0];
    assert(redemptionAfter.rewardGranted === 1, "the redemption row must be marked reward-granted");

    console.log("8. Replaying the SAME signed event again (simulating a webhook retry) — must be idempotent...");
    const replayResult = await postWebhook(succeededEvent, sign(succeededBody));
    assert(replayResult.status === 200, "a replayed webhook must still return 200 (not an error)");
    const subsAfterReplay = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id));
    assert(subsAfterReplay.length === 1, `replay must NOT create a second subscription, got ${subsAfterReplay.length}`);
    const ledgerAfterReplay = await db.select().from(pointsLedger).where(eq(pointsLedger.userId, referrer.id));
    assert(ledgerAfterReplay.filter(p => p.reason === "referral_reward").length === 1, "replay must NOT double-grant the referral reward");

    console.log("9. Sending a real payment.failed event for the second invoice...");
    const failedEvent = { type: "payment.failed", invoiceId: failInvoice.id };
    const failedBody = JSON.stringify(failedEvent);
    const failResult = await postWebhook(failedEvent, sign(failedBody));
    assert(failResult.status === 200, `payment.failed webhook must return 200, got ${failResult.status}`);
    const failedInvoiceRow = (await db.select().from(invoices).where(eq(invoices.id, failInvoice.id)).limit(1))[0];
    assert(failedInvoiceRow.status === "failed", `invoice must be marked failed, got status=${failedInvoiceRow.status}`);
    const failAttempts = await db.select().from(paymentAttempts).where(eq(paymentAttempts.invoiceId, failInvoice.id));
    assert(failAttempts.some(a => a.status === "failed"), "a failed payment attempt must be recorded");

    console.log("10. Creating a real refund and sending a signed refund.succeeded event...");
    await db.insert(refunds).values({ invoiceId: successInvoice.id, amountCents: 150000, provider: PROVIDER, reason: "verification test", status: "pending" });
    const refundRow = (await db.select().from(refunds).where(eq(refunds.invoiceId, successInvoice.id)).limit(1))[0];
    const refundEvent = { type: "refund.succeeded", refundId: refundRow.id, providerReference: `re_${tag}` };
    const refundBody = JSON.stringify(refundEvent);
    const refundResult = await postWebhook(refundEvent, sign(refundBody));
    assert(refundResult.status === 200, `refund.succeeded webhook must return 200, got ${refundResult.status}`);

    const invoiceAfterRefund = (await db.select().from(invoices).where(eq(invoices.id, successInvoice.id)).limit(1))[0];
    assert(invoiceAfterRefund.status === "refunded", `invoice must be marked refunded, got status=${invoiceAfterRefund.status}`);
    const subAfterRefund = (await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id)).limit(1))[0];
    assert(subAfterRefund.status === "canceled", `the subscription must be canceled after refund, got status=${subAfterRefund.status}`);

    console.log("\n✅ ALL PAYMENT WEBHOOK ASSERTIONS PASSED against a real running server + real MySQL:");
    console.log("   - Unsigned and wrongly-signed requests both cleanly rejected (401), no state change");
    console.log("   - payment.succeeded: invoice paid, subscription activated, payment attempt logged, notification sent");
    console.log("   - Referral reward genuinely granted to the referrer (points + notification), redemption marked");
    console.log("   - Replayed webhook is idempotent: no duplicate subscription, no double-granted referral reward");
    console.log("   - payment.failed: invoice marked failed, attempt logged");
    console.log("   - refund.succeeded: invoice refunded, subscription canceled");
  } finally {
    server.kill();
    if (process.exitCode && process.exitCode !== 0) {
      console.error("--- server output ---\n" + serverOutput.slice(-4000));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  });
