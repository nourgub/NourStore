import {
  and,
  desc,
  eq,
  inArray,
  lt,
} from "drizzle-orm";
import {
  subscriptionPlans,
  userSubscriptions,
  users,
  planPrices,
  invoices,
  paymentAttempts,
  refunds,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { createNotification } from "./notifications";
import { grantReferralRewardIfEligible } from "./gamification";

export async function getSubscriptionPlans(
  activeOnly = false,
  currency?: string
) {
  const db = await getDb();
  if (!db) return [];
  const plans = await db
    .select()
    .from(subscriptionPlans)
    .where(activeOnly ? eq(subscriptionPlans.isActive, 1) : undefined)
    .orderBy(subscriptionPlans.priceCents);
  if (!plans.length)
    return plans.map(plan => ({
      ...plan,
      resolvedCurrency: plan.currency,
      resolvedPriceCents: plan.priceCents,
    }));
  const wantedCurrency = (currency || "").toUpperCase();
  const priceRows = wantedCurrency
    ? await db
        .select()
        .from(planPrices)
        .where(
          and(
            inArray(
              planPrices.planId,
              plans.map(p => p.id)
            ),
            eq(planPrices.currency, wantedCurrency)
          )
        )
    : [];
  const priceByPlan = new Map(priceRows.map(row => [row.planId, row]));
  // Falls back to the plan's default priceCents/currency when no row exists
  // for the requested currency — real multi-currency support, not a stub.
  return plans.map(plan => {
    const specific = priceByPlan.get(plan.id);
    return {
      ...plan,
      resolvedCurrency: specific?.currency ?? plan.currency,
      resolvedPriceCents: specific?.priceCents ?? plan.priceCents,
    };
  });
}

export async function getPlanPrices(planId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(planPrices)
    .where(eq(planPrices.planId, planId))
    .orderBy(planPrices.currency);
}

export async function setPlanPrice(input: {
  planId: number;
  currency: string;
  priceCents: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const planRows = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, input.planId))
    .limit(1);
  if (!planRows.length) return false;
  const currency = input.currency.toUpperCase();
  await db
    .insert(planPrices)
    .values({ planId: input.planId, currency, priceCents: input.priceCents })
    .onDuplicateKeyUpdate({ set: { priceCents: input.priceCents } });
  return true;
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      subscriptionId: userSubscriptions.id,
      planId: subscriptionPlans.id,
      planTitleAr: subscriptionPlans.titleAr,
      planTitleFr: subscriptionPlans.titleFr,
      planTitleEn: subscriptionPlans.titleEn,
      status: userSubscriptions.status,
      startedAt: userSubscriptions.startedAt,
      expiresAt: userSubscriptions.expiresAt,
      canceledAt: userSubscriptions.canceledAt,
    })
    .from(userSubscriptions)
    .leftJoin(
      subscriptionPlans,
      eq(subscriptionPlans.id, userSubscriptions.planId)
    )
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        inArray(userSubscriptions.status, ["active", "trialing"])
      )
    )
    .orderBy(desc(userSubscriptions.updatedAt))
    .limit(1);
  return rows.find(
    row => !row.expiresAt || row.expiresAt.getTime() > Date.now()
  );
}

export async function cancelActiveSubscription(
  userId: number
): Promise<{ ok: true; expiresAt: Date | null } | { ok: false; reason: "no_active_subscription" }> {
  // Access is already paid for through expiresAt — canceling stops it from
  // being treated as an ongoing commitment (and would stop any future
  // auto-renewal charge, once one exists) without clawing back days the
  // learner already paid for. Deliberately does NOT flip status away from
  // "active"/"trialing": hasActiveSubscription() and every enrollment gate
  // key off status, and revoking access the instant someone cancels — for
  // time they've already paid for — would be the wrong, unfair behavior.
  // The existing expiry sweep naturally transitions status to "expired"
  // once expiresAt actually passes, canceled or not.
  const db = await getDb();
  if (!db) return { ok: false, reason: "no_active_subscription" };
  const rows = await db
    .select({ id: userSubscriptions.id, expiresAt: userSubscriptions.expiresAt })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, userId),
        inArray(userSubscriptions.status, ["active", "trialing"])
      )
    )
    .orderBy(desc(userSubscriptions.updatedAt))
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, reason: "no_active_subscription" };
  await db
    .update(userSubscriptions)
    .set({ canceledAt: new Date(), autoRenew: 0 })
    .where(eq(userSubscriptions.id, current.id));
  return { ok: true, expiresAt: current.expiresAt };
}

export async function getSubscriptionMembers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      subscriptionId: userSubscriptions.id,
      userId: userSubscriptions.userId,
      userName: users.name,
      userEmail: users.email,
      planId: subscriptionPlans.id,
      planTitleAr: subscriptionPlans.titleAr,
      status: userSubscriptions.status,
      startedAt: userSubscriptions.startedAt,
      expiresAt: userSubscriptions.expiresAt,
    })
    .from(userSubscriptions)
    .leftJoin(users, eq(users.id, userSubscriptions.userId))
    .leftJoin(
      subscriptionPlans,
      eq(subscriptionPlans.id, userSubscriptions.planId)
    )
    .orderBy(desc(userSubscriptions.updatedAt));
}

export async function createSubscriptionPlan(input: {
  slug: string;
  planType?: "free" | "monthly" | "quarterly" | "yearly" | "one_time";
  currency?: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  durationDays: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .insert(subscriptionPlans)
    .values({
      ...input,
      planType: input.planType ?? "monthly",
      currency: (input.currency ?? "DZD").toUpperCase(),
      isActive: 1,
    });
}

export async function updateSubscriptionPlan(input: {
  id: number;
  planType?: "free" | "monthly" | "quarterly" | "yearly" | "one_time";
  currency?: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  durationDays: number;
  isActive: boolean;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(subscriptionPlans)
    .set({
      ...(input.planType ? { planType: input.planType } : {}),
      ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
      titleAr: input.titleAr,
      titleFr: input.titleFr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr,
      descriptionFr: input.descriptionFr,
      descriptionEn: input.descriptionEn,
      priceCents: input.priceCents,
      durationDays: input.durationDays,
      isActive: input.isActive ? 1 : 0,
    })
    .where(eq(subscriptionPlans.id, input.id));
  return true;
}

export async function assignSubscription(input: {
  userId: number;
  planId: number;
  durationDays: number;
  status: "trialing" | "active" | "paused";
}): Promise<
  | { ok: true }
  | { ok: false; reason: "user_not_found" | "plan_not_found" | "unavailable" }
> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "unavailable" };
  // Found via real-database testing (see scripts/verify-real-flow.ts and
  // AUDIT.md): inserting without checking existence first crashed with a
  // raw SQL foreign-key error instead of a clean, actionable response.
  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!userRows.length) return { ok: false, reason: "user_not_found" };
  const planRows = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, input.planId))
    .limit(1);
  if (!planRows.length) return { ok: false, reason: "plan_not_found" };
  const expiresAt = new Date(
    Date.now() + input.durationDays * 24 * 60 * 60 * 1000
  );
  await db
    .update(userSubscriptions)
    .set({ status: "expired" })
    .where(
      and(
        eq(userSubscriptions.userId, input.userId),
        eq(userSubscriptions.status, "active")
      )
    );
  await db
    .insert(userSubscriptions)
    .values({
      userId: input.userId,
      planId: input.planId,
      status: input.status,
      expiresAt,
      paymentProvider: "manual",
    });
  return { ok: true };
}

export async function createInvoice(input: {
  userId: number;
  planId: number;
  currency: string;
  amountCents: number;
  provider: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .insert(invoices)
    .values({
      userId: input.userId,
      planId: input.planId,
      currency: input.currency.toUpperCase(),
      amountCents: input.amountCents,
      provider: input.provider,
      status: "pending",
    });
  // Fetch back by the real insertId, never by "most recent pending row for
  // this user+plan" — a learner who retries checkout (double-click, retry
  // after a network hiccup, a second tab) can have more than one pending
  // invoice for the same plan within the same createdAt second, and
  // ordering by createdAt alone is then ambiguous: it can silently hand
  // back a *different* learner-visible invoice than the one just created,
  // which then gets embedded in their WhatsApp reference message.
  const insertId = (result as unknown as [{ insertId: number }, unknown])[0].insertId;
  const inserted = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, insertId))
    .limit(1);
  return inserted[0];
}

export async function recordPaymentAttempt(input: {
  invoiceId: number;
  provider: string;
  providerReference?: string;
  status: "pending" | "succeeded" | "failed";
  rawResponseJson?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(paymentAttempts).values(input);
}

export async function markInvoicePaid(input: {
  invoiceId: number;
  provider: string;
  providerReference?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, input.invoiceId))
    .limit(1);
  const invoice = invoiceRows[0];
  if (!invoice) return undefined;
  if (invoice.status === "paid") return invoice; // idempotent, cheap fast-path
  const planRows = await db
    .select({ durationDays: subscriptionPlans.durationDays })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, invoice.planId))
    .limit(1);
  const durationDays = planRows[0]?.durationDays ?? 30;
  // Real atomicity, not just a fast-path check: the WHERE clause requires
  // status = "pending" at the moment of the write itself, so two calls
  // racing on the same invoice (a duplicated WhatsApp webhook delivery is
  // a documented, real occurrence on Meta's platform; so is an admin
  // double-clicking "approve") can never both win this update. Only the
  // caller whose UPDATE actually matched a row proceeds to grant a
  // subscription — the loser sees affectedRows === 0 and returns the
  // already-paid invoice untouched, exactly like the idempotent read
  // above, but race-safe instead of merely time-of-check-safe.
  const updateResult = (await db
    .update(invoices)
    .set({
      status: "paid",
      provider: input.provider,
      providerReference: input.providerReference,
      paidAt: new Date(),
    })
    .where(
      and(eq(invoices.id, invoice.id), eq(invoices.status, "pending"))
    )) as unknown as [{ affectedRows: number }, unknown];
  if (updateResult[0].affectedRows === 0) {
    // Lost the race (or the invoice was already rejected, not pending) —
    // never grant a second subscription period for the same invoice.
    const fresh = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice.id))
      .limit(1);
    return fresh[0];
  }
  await recordPaymentAttempt({
    invoiceId: invoice.id,
    provider: input.provider,
    providerReference: input.providerReference,
    status: "succeeded",
  });
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  await db
    .update(userSubscriptions)
    .set({ status: "expired" })
    .where(
      and(
        eq(userSubscriptions.userId, invoice.userId),
        eq(userSubscriptions.status, "active")
      )
    );
  await db
    .insert(userSubscriptions)
    .values({
      userId: invoice.userId,
      planId: invoice.planId,
      status: "active",
      expiresAt,
      paymentProvider: input.provider,
      providerCustomerId: undefined,
      providerSubscriptionId: input.providerReference,
    });
  const subscriptionRows = await db
    .select({ id: userSubscriptions.id })
    .from(userSubscriptions)
    .where(
      and(
        eq(userSubscriptions.userId, invoice.userId),
        eq(userSubscriptions.planId, invoice.planId),
        eq(userSubscriptions.status, "active")
      )
    )
    .orderBy(desc(userSubscriptions.createdAt))
    .limit(1);
  if (subscriptionRows[0])
    await db
      .update(invoices)
      .set({ subscriptionId: subscriptionRows[0].id })
      .where(eq(invoices.id, invoice.id));
  await createNotification({
    userId: invoice.userId,
    type: "payment",
    title: "notifications.paymentSucceeded",
    body: String(invoice.id),
  });
  await grantReferralRewardIfEligible(invoice.userId);
  return { ...invoice, status: "paid" as const };
}

export async function markInvoiceFailed(input: {
  invoiceId: number;
  provider: string;
  providerReference?: string;
  rawResponseJson?: string;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(invoices)
    .set({ status: "failed" })
    .where(eq(invoices.id, input.invoiceId));
  await recordPaymentAttempt({
    invoiceId: input.invoiceId,
    provider: input.provider,
    providerReference: input.providerReference,
    status: "failed",
    rawResponseJson: input.rawResponseJson,
  });
  return true;
}

export async function expireStalePendingInvoices(
  daysThreshold = 7
): Promise<{ expiredCount: number }> {
  // A checkout that's been "pending" for a week is an abandoned attempt,
  // not an in-progress one — a learner who opens WhatsApp checkout and
  // never sends a receipt, or opens BaridiMob and closes the tab. Left
  // "pending" forever, it clutters admin queues indefinitely and could in
  // principle still be paid months later against a plan price that's
  // since changed. Never touches paid/failed/refunded/canceled invoices —
  // only ones still sitting in "pending".
  const db = await getDb();
  if (!db) return { expiredCount: 0 };
  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
  const stale = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.status, "pending"), lt(invoices.createdAt, cutoff)));
  if (!stale.length) return { expiredCount: 0 };
  await db
    .update(invoices)
    .set({ status: "expired" })
    .where(
      and(eq(invoices.status, "pending"), lt(invoices.createdAt, cutoff))
    );
  return { expiredCount: stale.length };
}

export async function markInvoiceCanceled(invoiceId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(invoices)
    .set({ status: "canceled" })
    .where(eq(invoices.id, invoiceId));
  return true;
}

export async function createRefund(input: {
  invoiceId: number;
  amountCents: number;
  reason?: string;
  provider: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(refunds).values(input);
}

export async function markRefundResult(input: {
  refundId: number;
  status: "succeeded" | "failed";
  providerReference?: string;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(refunds)
    .set({ status: input.status, providerReference: input.providerReference })
    .where(eq(refunds.id, input.refundId));
  if (input.status === "succeeded") {
    const refundRows = await db
      .select({ invoiceId: refunds.invoiceId })
      .from(refunds)
      .where(eq(refunds.id, input.refundId))
      .limit(1);
    const invoiceId = refundRows[0]?.invoiceId;
    if (invoiceId) {
      await db
        .update(invoices)
        .set({ status: "refunded" })
        .where(eq(invoices.id, invoiceId));
      const invoiceRows = await db
        .select({
          userId: invoices.userId,
          subscriptionId: invoices.subscriptionId,
        })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);
      if (invoiceRows[0]?.subscriptionId)
        await db
          .update(userSubscriptions)
          .set({ status: "canceled", canceledAt: new Date() })
          .where(eq(userSubscriptions.id, invoiceRows[0].subscriptionId));
    }
  }
  return true;
}

export async function getInvoiceByProviderReference(
  provider: string,
  providerReference: string
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.provider, provider),
        eq(invoices.providerReference, providerReference)
      )
    )
    .limit(1);
  return rows[0];
}

export async function getInvoiceById(invoiceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  return rows[0];
}

export async function getUserInvoices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt));
  if (!rows.length) return rows as (typeof rows[number] & { lastReceiptStatus: string | null })[];
  // The invoice's own `status` deliberately stays "pending" after a
  // receipt is rejected — rejecting a receipt is not the same as killing
  // the checkout attempt, and a learner must still be able to resubmit a
  // corrected receipt against the same invoice/reference number. But
  // "pending" alone hides real information a learner needs: whether
  // their last attempt was actually rejected, or is simply still
  // awaiting review. This attaches the most recent receipt's real status
  // to each invoice without changing what `status` itself means anywhere
  // else in the codebase (enrollment gating, payment-webhook idempotency,
  // etc. all still read the real, unmodified `status` column).
  const { paymentReceipts } = await import("../../drizzle/schema");
  const invoiceIds = rows.map(r => r.id);
  const receiptRows = await db
    .select({
      invoiceId: paymentReceipts.invoiceId,
      status: paymentReceipts.status,
      createdAt: paymentReceipts.createdAt,
    })
    .from(paymentReceipts)
    .where(inArray(paymentReceipts.invoiceId, invoiceIds))
    .orderBy(desc(paymentReceipts.createdAt));
  const latestReceiptByInvoice = new Map<number, (typeof receiptRows)[number]>();
  for (const receipt of receiptRows) {
    if (!latestReceiptByInvoice.has(receipt.invoiceId)) {
      latestReceiptByInvoice.set(receipt.invoiceId, receipt);
    }
  }
  return rows.map(invoice => ({
    ...invoice,
    lastReceiptStatus: latestReceiptByInvoice.get(invoice.id)?.status ?? null,
  }));
}
