import { and, desc, eq, like, or } from "drizzle-orm";
import { errorLog, users } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "./shared";

// ---------------------------------------------------------------------------
// Real, self-hosted error tracking — zero external service, zero account
// with any company (unlike Sentry). Captures both backend (unexpected tRPC
// errors) and frontend (unhandled JS errors/promise rejections) failures
// into a real, queryable table. MySQL-only.
//
// Deliberately does NOT log validation errors (BAD_REQUEST from Zod, etc.)
// or expected auth rejections (UNAUTHORIZED/FORBIDDEN) — those are normal,
// expected outcomes, not bugs. Only genuinely unexpected failures are
// recorded, so this table stays a signal, not noise.
// ---------------------------------------------------------------------------

const EXPECTED_TRPC_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
]);

/** True for errors worth recording — i.e. NOT a normal, expected rejection the app already handles gracefully. */
export function isUnexpectedError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code && EXPECTED_TRPC_CODES.has(code)) return false;
  return true;
}

export async function logError(input: {
  source: "backend" | "frontend";
  message: string;
  stack?: string;
  context?: string;
  userId?: number;
  userAgent?: string;
}): Promise<void> {
    const db = await getDb();
  if (!db) return;
  try {
    await db.insert(errorLog).values({
      source: input.source,
      message: input.message.slice(0, 8000),
      stack: input.stack?.slice(0, 8000),
      context: input.context?.slice(0, 255),
      userId: input.userId,
      userAgent: input.userAgent?.slice(0, 2000),
    });
  } catch (error) {
    // A logging failure must never cascade into a second failure — this is
    // the same principle already applied to logAdminAction.
    console.error("[ErrorLog] failed to record error:", error);
  }
}

export async function getErrorLog(
  input: {
    limit?: number;
    source?: "backend" | "frontend";
    resolved?: boolean;
    search?: string;
  } = {}
) {
    const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (input.source) conditions.push(eq(errorLog.source, input.source));
  if (input.resolved !== undefined)
    conditions.push(eq(errorLog.resolved, input.resolved ? 1 : 0));
  const trimmedSearch = input.search?.trim();
  if (trimmedSearch) {
    // Real keyword search over message/stack/context — not just the
    // resolved/source filters that existed before. Case-insensitive by
    // MySQL's default collation on these columns.
    const pattern = `%${trimmedSearch.replace(/[%_]/g, c => `\\${c}`)}%`;
    conditions.push(
      or(
        like(errorLog.message, pattern),
        like(errorLog.context, pattern),
        like(errorLog.stack, pattern)
      )
    );
  }
  return db
    .select({
      id: errorLog.id,
      source: errorLog.source,
      message: errorLog.message,
      stack: errorLog.stack,
      context: errorLog.context,
      userId: errorLog.userId,
      userName: users.name,
      userAgent: errorLog.userAgent,
      resolved: errorLog.resolved,
      createdAt: errorLog.createdAt,
    })
    .from(errorLog)
    .leftJoin(users, eq(users.id, errorLog.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(errorLog.createdAt))
    .limit(Math.min(input.limit ?? 100, 500));
}

export async function markErrorResolved(
  id: number,
  resolved: boolean
): Promise<boolean> {
    const db = await getDb();
  if (!db) return false;
  await db
    .update(errorLog)
    .set({ resolved: resolved ? 1 : 0 })
    .where(eq(errorLog.id, id));
  return true;
}

export async function getErrorLogSummary() {
    const db = await getDb();
  if (!db) return { totalUnresolved: 0, last24hCount: 0 };
  const unresolvedRows = await db
    .select({ id: errorLog.id })
    .from(errorLog)
    .where(eq(errorLog.resolved, 0));
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRows = await db
    .select({ id: errorLog.id, createdAt: errorLog.createdAt })
    .from(errorLog)
    .where(eq(errorLog.resolved, 0));
  const last24hCount = recentRows.filter(
    r => r.createdAt.getTime() >= since.getTime()
  ).length;
  return { totalUnresolved: unresolvedRows.length, last24hCount };
}
