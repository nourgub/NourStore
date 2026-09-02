import {
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  userSubscriptions,
  users,
  invoices,
  adminAuditLog,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function logAdminAction(input: {
  actorId: number;
  action: string;
  targetType?: string;
  targetId?: string | number;
  details?: Record<string, unknown>;
}): Promise<void> {
    const db = await getDb();
  if (!db) return;
  try {
    await db.insert(adminAuditLog).values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId !== undefined ? String(input.targetId) : undefined,
      detailsJson: input.details ? JSON.stringify(input.details) : undefined,
    });
  } catch (error) {
    // Never let a logging failure break the real action it's describing.
    console.error("[AuditLog] failed to record admin action:", input.action, error);
  }
}

export async function getAdminAuditLog(input: { limit?: number; action?: string } = {}) {
    const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: adminAuditLog.id,
      actorId: adminAuditLog.actorId,
      actorName: users.name,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      detailsJson: adminAuditLog.detailsJson,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(users.id, adminAuditLog.actorId))
    .where(input.action ? eq(adminAuditLog.action, input.action) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(Math.min(input.limit ?? 100, 500));
  return rows;
}

export async function getRevenueAnalytics() {
  const db = await getDb();
  if (!db)
    return {
      totalsByCurrency: [],
      monthly: [],
      activeSubscriptions: 0,
      canceledOrExpiredSubscriptions: 0,
      pendingInvoiceCount: 0,
      pendingInvoiceValueByCurrency: [],
    };

  const paidInvoices = await db
    .select({
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .where(eq(invoices.status, "paid"));
  const totalsMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>(); // "YYYY-MM|CUR" -> cents
  for (const row of paidInvoices) {
    totalsMap.set(
      row.currency,
      (totalsMap.get(row.currency) ?? 0) + row.amountCents
    );
    if (row.paidAt) {
      const monthKey = `${row.paidAt.getFullYear()}-${String(row.paidAt.getMonth() + 1).padStart(2, "0")}|${row.currency}`;
      monthlyMap.set(
        monthKey,
        (monthlyMap.get(monthKey) ?? 0) + row.amountCents
      );
    }
  }
  const totalsByCurrency = Array.from(totalsMap.entries()).map(
    ([currency, amountCents]) => ({ currency, amountCents })
  );
  const monthly = Array.from(monthlyMap.entries())
    .map(([key, amountCents]) => {
      const [month, currency] = key.split("|");
      return { month, currency, amountCents };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  const pendingInvoices = await db
    .select({ amountCents: invoices.amountCents, currency: invoices.currency })
    .from(invoices)
    .where(eq(invoices.status, "pending"));
  const pendingMap = new Map<string, number>();
  for (const row of pendingInvoices)
    pendingMap.set(
      row.currency,
      (pendingMap.get(row.currency) ?? 0) + row.amountCents
    );
  const pendingInvoiceValueByCurrency = Array.from(pendingMap.entries()).map(
    ([currency, amountCents]) => ({ currency, amountCents })
  );

  const activeSubscriptions = (
    await db
      .select({ id: userSubscriptions.id })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, "active"))
  ).length;
  const canceledOrExpiredSubscriptions = (
    await db
      .select({ id: userSubscriptions.id })
      .from(userSubscriptions)
      .where(inArray(userSubscriptions.status, ["canceled", "expired"]))
  ).length;

  return {
    totalsByCurrency,
    monthly,
    activeSubscriptions,
    canceledOrExpiredSubscriptions,
    pendingInvoiceCount: pendingInvoices.length,
    pendingInvoiceValueByCurrency,
  };
}
