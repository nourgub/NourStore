import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
} from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import {
  subscriptionPlans,
  users,
  invoices,
  paymentReceipts,
  whatsappCheckoutSessions,
  notifications,
} from "../../drizzle/schema";
import { getDb } from "./shared";
import { markInvoicePaid } from "./subscriptions";
import { createNotification } from "./notifications";
import { getAdminUserIds } from "./usersAuth";

/**
 * Resolves to the most-recently-referenced STILL-PENDING invoice for this
 * phone number. A phone number can have multiple session rows now (one per
 * invoice it has referenced) — filtering to `status = "pending"` and
 * ordering by recency means an already-paid/failed invoice's old session
 * never shadows a different, still-open one, and a learner juggling two
 * pending invoices can still get a photo correctly attributed to whichever
 * one they most recently mentioned by reference.
 */
export async function getWhatsappSession(phoneNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      id: whatsappCheckoutSessions.id,
      phoneNumber: whatsappCheckoutSessions.phoneNumber,
      invoiceId: whatsappCheckoutSessions.invoiceId,
      updatedAt: whatsappCheckoutSessions.updatedAt,
    })
    .from(whatsappCheckoutSessions)
    .innerJoin(invoices, eq(invoices.id, whatsappCheckoutSessions.invoiceId))
    .where(
      and(
        eq(whatsappCheckoutSessions.phoneNumber, phoneNumber),
        eq(invoices.status, "pending")
      )
    )
    .orderBy(desc(whatsappCheckoutSessions.updatedAt), desc(whatsappCheckoutSessions.id))
    .limit(1);
  return rows[0];
}

/**
 * Inserts (or, if this exact phoneNumber+invoiceId pair was already
 * referenced before, refreshes the recency of) a session row. Deliberately
 * does NOT overwrite or remove any other pending invoice's session row for
 * this same phone number — see getWhatsappSession for how the right one is
 * picked back out later.
 */
export async function setWhatsappSession(
  phoneNumber: string,
  invoiceId: number
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .insert(whatsappCheckoutSessions)
    .values({ phoneNumber, invoiceId })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  return true;
}

export async function createPaymentReceipt(input: {
  invoiceId: number;
  storageKey: string;
  url: string;
  mimeType: string;
  whatsappFromNumber?: string;
  whatsappMessageId?: string;
  contentHash?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(paymentReceipts).values(input);
}

export type DirectReceiptUploadResult =
  | { ok: true; receiptId: number }
  | {
      ok: false;
      reason:
        | "invoice_not_found"
        | "invoice_not_pending"
        | "duplicate_receipt"
        | string;
    };

/**
 * The web-based alternative to the WhatsApp receipt flow: a learner
 * uploads their transfer screenshot directly on the site (for postal
 * account / CCP transfers, no WhatsApp needed at all). Shares the exact
 * same downstream review queue and admin approval flow as WhatsApp
 * receipts — `getPendingPaymentReceipts` and `reviewPaymentReceipt`
 * already work generically on any row in `paymentReceipts`, regardless
 * of which path created it.
 *
 * Real anti-fraud check, not just a UI nicety: SHA-256 of the actual
 * decoded bytes is computed and checked against every previously
 * submitted receipt (any invoice, any learner) via a DB UNIQUE
 * constraint — the exact same screenshot can never be submitted twice,
 * whether resubmitted for the same invoice after a rejection or reused
 * to try to claim a second course from one real transfer.
 */
export async function submitDirectPaymentReceipt(input: {
  invoiceId: number;
  userId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: string; // base64
}): Promise<DirectReceiptUploadResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "invoice_not_found" };
  const invoiceRows = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      status: invoices.status,
    })
    .from(invoices)
    .where(and(eq(invoices.id, input.invoiceId), eq(invoices.userId, input.userId)))
    .limit(1);
  const invoice = invoiceRows[0];
  if (!invoice) return { ok: false, reason: "invoice_not_found" };
  if (invoice.status !== "pending")
    return { ok: false, reason: "invoice_not_pending" };

  const bytes = Buffer.from(input.data, "base64");
  const { validateUploadBytes } = await import("../uploadValidation");
  const validation = validateUploadBytes({
    fileName: input.fileName,
    mimeType: input.mimeType,
    declaredSizeBytes: input.sizeBytes,
    decodedByteLength: bytes.length,
    bytes,
  });
  if (!validation.ok) return { ok: false, reason: validation.reason };

  const crypto = await import("crypto");
  const contentHash = crypto.createHash("sha256").update(bytes).digest("hex");
  const existing = await db
    .select({ id: paymentReceipts.id })
    .from(paymentReceipts)
    .where(eq(paymentReceipts.contentHash, contentHash))
    .limit(1);
  if (existing.length) return { ok: false, reason: "duplicate_receipt" };

  const { storagePut } = await import("../storage");
  const ext = input.fileName.split(".").pop()?.toLowerCase() || "jpg";
  const uploaded = await storagePut(
    `payment-receipts/${invoice.id}/${contentHash.slice(0, 16)}.${ext}`,
    bytes,
    input.mimeType
  );

  const insertResult = await db.insert(paymentReceipts).values({
    invoiceId: invoice.id,
    storageKey: uploaded.key,
    url: uploaded.url,
    mimeType: input.mimeType,
    contentHash,
  });
  const receiptId = Number(
    (insertResult as unknown as [{ insertId: number }])[0].insertId
  );

  // Real-time admin notification — the WhatsApp path relies on an admin
  // periodically checking the review queue, which is acceptable there
  // since WhatsApp itself already pings the admin's phone; a silent web
  // upload has no equivalent, so it gets one here.
  const adminIds = await getAdminUserIds();
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: "payment_receipt_submitted",
      title: "إيصال دفع جديد بانتظار المراجعة",
      body: `فاتورة #${invoice.id} — تحتاج مراجعة يدوية.`,
    });
  }

  return { ok: true, receiptId };
}

export async function getPendingPaymentReceipts() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: paymentReceipts.id,
      invoiceId: paymentReceipts.invoiceId,
      url: paymentReceipts.url,
      whatsappFromNumber: paymentReceipts.whatsappFromNumber,
      createdAt: paymentReceipts.createdAt,
      invoiceAmountCents: invoices.amountCents,
      invoiceCurrency: invoices.currency,
      invoiceUserId: invoices.userId,
      learnerName: users.name,
      planTitleAr: subscriptionPlans.titleAr,
    })
    .from(paymentReceipts)
    .leftJoin(invoices, eq(invoices.id, paymentReceipts.invoiceId))
    .leftJoin(users, eq(users.id, invoices.userId))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, invoices.planId))
    .where(eq(paymentReceipts.status, "pending_review"))
    // Oldest first: this is a manual-review queue, and the receipt that's
    // been waiting longest is the one most likely to need attention first
    // (see notifyAdminsOfStaleReceipts below for the same "oldest = most
    // urgent" logic surfaced as a proactive notification, not just an
    // admin who happens to sort the list correctly by eye).
    .orderBy(asc(paymentReceipts.createdAt));
  // The stored URL is local storage's raw key path, which no route
  // actually serves unauthenticated (see server/protectedFiles.ts) — but
  // it's still not a URL a browser can fetch directly, so it's rewritten
  // to the authenticated proxy path here, which re-checks who's asking on
  // every request. Real S3 presigned URLs (ENV.storageProvider === "s3")
  // are already genuinely protected and expiring, so they pass through
  // unchanged.
  const { ENV } = await import("../_core/env");
  if (ENV.storageProvider !== "s3") {
    return rows.map(row => ({
      ...row,
      url: `/api/protected-files/receipt/${row.id}`,
    }));
  }
  return rows;
}

// Already-reviewed receipts (approved or rejected), most recent decision
// first — so an admin reviewing a stale receipt from a learner can first
// check whether that same learner has a history of rejected submissions,
// and any admin can see who took the last action on a given receipt and
// when, without cross-referencing the separate general audit log.
export async function getPaymentReceiptHistory(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const reviewer = alias(users, "reviewer");
  const rows = await db
    .select({
      id: paymentReceipts.id,
      invoiceId: paymentReceipts.invoiceId,
      status: paymentReceipts.status,
      createdAt: paymentReceipts.createdAt,
      reviewedAt: paymentReceipts.reviewedAt,
      reviewerName: reviewer.name,
      invoiceAmountCents: invoices.amountCents,
      invoiceCurrency: invoices.currency,
      invoiceUserId: invoices.userId,
      learnerName: users.name,
      planTitleAr: subscriptionPlans.titleAr,
    })
    .from(paymentReceipts)
    .leftJoin(invoices, eq(invoices.id, paymentReceipts.invoiceId))
    .leftJoin(users, eq(users.id, invoices.userId))
    .leftJoin(reviewer, eq(reviewer.id, paymentReceipts.reviewedBy))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, invoices.planId))
    .where(inArray(paymentReceipts.status, ["approved", "rejected"]))
    .orderBy(desc(paymentReceipts.reviewedAt))
    .limit(limit);
  return rows;
}

// Invoices still "pending" (awaiting payment) that have been open for a
// while with NO receipt submitted at all — distinct from the review queue
// above, which only ever shows invoices that already HAVE a receipt
// waiting. This is what lets an admin proactively nudge a learner before
// expireStalePendingInvoices (server/db/subscriptions.ts) silently expires
// the invoice after its own, much longer, threshold.
export async function getOverdueInvoicesWithoutReceipt(hoursThreshold = 48) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: invoices.id,
      createdAt: invoices.createdAt,
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      userId: invoices.userId,
      learnerName: users.name,
      planTitleAr: subscriptionPlans.titleAr,
    })
    .from(invoices)
    .leftJoin(users, eq(users.id, invoices.userId))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, invoices.planId))
    .leftJoin(
      paymentReceipts,
      and(
        eq(paymentReceipts.invoiceId, invoices.id),
        // A rejected receipt doesn't count as "covering" the invoice — the
        // learner still owes a fresh one, so that invoice should still
        // surface here as needing a nudge.
        inArray(paymentReceipts.status, ["pending_review", "approved"])
      )
    )
    .where(
      and(
        eq(invoices.status, "pending"),
        lt(invoices.createdAt, cutoff),
        isNull(paymentReceipts.id)
      )
    )
    .orderBy(asc(invoices.createdAt));
  return rows;
}

export async function reviewPaymentReceipt(input: {
  receiptId: number;
  approve: boolean;
  reviewerId: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const receiptRows = await db
    .select()
    .from(paymentReceipts)
    .where(eq(paymentReceipts.id, input.receiptId))
    .limit(1);
  const receipt = receiptRows[0];
  if (!receipt || receipt.status !== "pending_review") return false;
  await db
    .update(paymentReceipts)
    .set({
      status: input.approve ? "approved" : "rejected",
      reviewedBy: input.reviewerId,
      reviewedAt: new Date(),
    })
    .where(eq(paymentReceipts.id, receipt.id));
  if (input.approve) {
    await markInvoicePaid({
      invoiceId: receipt.invoiceId,
      provider: "whatsapp",
      providerReference: receipt.whatsappMessageId || undefined,
    });
  } else {
    const invoiceRows = await db
      .select({ userId: invoices.userId })
      .from(invoices)
      .where(eq(invoices.id, receipt.invoiceId))
      .limit(1);
    if (invoiceRows[0])
      await createNotification({
        userId: invoiceRows[0].userId,
        type: "payment",
        title: "notifications.receiptRejected",
        body: String(receipt.invoiceId),
      });
  }
  return true;
}

/**
 * Manual payment review is a real bottleneck (flagged explicitly — every
 * WhatsApp payment needs a human to look at a receipt photo before an
 * invoice can be marked paid). Nothing previously surfaced *how long* a
 * receipt had been waiting, or proactively told an admin about one stuck
 * for a while — an admin only saw a problem if they happened to check the
 * dashboard. This closes that: real notifications to every admin, with a
 * per-receipt de-dup so nobody gets spammed on every sweep run.
 *
 * No cron/scheduler exists in this environment (same documented limitation
 * as notifyExpiringSubscriptions) — exposed as `admin.staleReceiptSweep`
 * for an external scheduled job to call periodically. This is a real gap,
 * not silently pretended to be automatic.
 */
export async function notifyAdminsOfStaleReceipts(hoursThreshold = 24) {
  const db = await getDb();
  if (!db) return { staleCount: 0, notificationsSent: 0 };
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  const stale = await db
    .select({ id: paymentReceipts.id, createdAt: paymentReceipts.createdAt })
    .from(paymentReceipts)
    .where(
      and(
        eq(paymentReceipts.status, "pending_review"),
        lt(paymentReceipts.createdAt, cutoff)
      )
    );
  if (stale.length === 0) return { staleCount: 0, notificationsSent: 0 };

  const adminIds = await getAdminUserIds();
  let notificationsSent = 0;
  for (const receipt of stale) {
    for (const adminId of adminIds) {
      // De-dup: skip if this admin was already notified about this exact
      // receipt (identified by receipt id in the notification body) —
      // otherwise every sweep run would re-notify about the same backlog.
      const existing = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, adminId),
            eq(notifications.type, "payment_receipt_stale"),
            eq(notifications.body, String(receipt.id))
          )
        )
        .limit(1);
      if (existing.length) continue;
      await createNotification({
        userId: adminId,
        type: "payment_receipt_stale",
        title: "notifications.paymentReceiptStale",
        body: String(receipt.id),
      });
      notificationsSent += 1;
    }
  }
  return { staleCount: stale.length, notificationsSent };
}

export type StaleCheckoutSession = {
  sessionId: number;
  phoneNumber: string;
  invoiceId: number;
  userId: number;
  amountCents: number;
  currency: string;
};

/**
 * Finds checkout sessions where a learner got RIB details via WhatsApp but
 * never followed up with a receipt photo — previously these just sat
 * "pending" forever with no follow-up of any kind. Excludes sessions that
 * already have a receipt (any status — even a rejected one means they did
 * follow up), an invoice that's no longer pending, or one already
 * reminded (see `remindedAt`, never re-nags the same session).
 */
export async function getStaleCheckoutSessionsForReminder(
  hoursThreshold = 24
): Promise<StaleCheckoutSession[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  const rows = await db
    .select({
      sessionId: whatsappCheckoutSessions.id,
      phoneNumber: whatsappCheckoutSessions.phoneNumber,
      invoiceId: whatsappCheckoutSessions.invoiceId,
      userId: invoices.userId,
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      hasReceipt: paymentReceipts.id,
    })
    .from(whatsappCheckoutSessions)
    .innerJoin(invoices, eq(invoices.id, whatsappCheckoutSessions.invoiceId))
    .leftJoin(paymentReceipts, eq(paymentReceipts.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.status, "pending"),
        lt(whatsappCheckoutSessions.updatedAt, cutoff),
        isNull(whatsappCheckoutSessions.remindedAt)
      )
    );
  // hasReceipt is checked in JS rather than a SQL "NOT EXISTS" so the same
  // straightforward left-join-and-filter pattern used elsewhere in this
  // file stays consistent; the row set here is small (a genuine backlog of
  // stuck sessions, not a hot path).
  const withoutReceipt = rows.filter(r => r.hasReceipt === null);
  // De-dup sessionId (the left join can produce >1 row per session if a
  // rejected-then-retried invoice history existed — defensive, not
  // expected in practice since one invoice maps to one session row).
  const seen = new Set<number>();
  return withoutReceipt.filter(r => {
    if (seen.has(r.sessionId)) return false;
    seen.add(r.sessionId);
    return true;
  });
}

export async function markSessionReminded(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(whatsappCheckoutSessions)
    .set({ remindedAt: new Date() })
    .where(eq(whatsappCheckoutSessions.id, sessionId));
}
