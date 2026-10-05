import { and, desc, eq, inArray } from "drizzle-orm";
import { subscriptionPlans, userSubscriptions, users } from "../../../drizzle/schema";
import { getDb } from "../shared";

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
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
  // tRPC/React Query forbids a query from ever resolving to `undefined` —
  // a real, reachable bug caught by a full browser smoke test: any learner
  // with no active subscription (i.e. every brand-new account) hit this
  // console error on every single dashboard visit, since Array.find()
  // returns undefined, not null, when nothing matches.
  return (
    rows.find(row => !row.expiresAt || row.expiresAt.getTime() > Date.now()) ??
    null
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

