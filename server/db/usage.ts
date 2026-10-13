// Daily counters of what costs money or capacity (drizzle/0035): AI calls and
// tokens, emails sent, sessions booked. Numbers only — never content, never
// who. Never throws: a metering failure must not break the action measured.
import { and, desc, gte, sql } from "drizzle-orm";
import { tafawoqUsage } from "../../drizzle/schema";
import { getDb } from "./shared";

export type UsageMetric =
  | "ai_calls"
  | "ai_input_tokens"
  | "ai_output_tokens"
  | "ai_refused_budget"
  | "email_sent"
  | "email_failed"
  | "session_booked";

const today = () => new Date().toISOString().slice(0, 10);

export async function addUsage(metric: UsageMetric, amount = 1): Promise<void> {
  if (!amount) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(tafawoqUsage)
      .values({ day: today(), metric, amount })
      .onDuplicateKeyUpdate({ set: { amount: sql`${tafawoqUsage.amount} + ${amount}` } });
  } catch (error) {
    console.warn("[usage] not recorded:", metric, error instanceof Error ? error.message : error);
  }
}

/** Per-metric totals since `days` days ago (today included), newest first. */
export async function usageSince(days: number) {
  const db = await getDb();
  if (!db) return [];
  const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return db
    .select()
    .from(tafawoqUsage)
    .where(and(gte(tafawoqUsage.day, from)))
    .orderBy(desc(tafawoqUsage.day));
}
