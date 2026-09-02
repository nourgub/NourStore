import {
  and,
  desc,
  eq,
} from "drizzle-orm";
import {
  userSubscriptions,
  notifications,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(input: {
  id: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, input.id),
        eq(notifications.userId, input.userId)
      )
    );
  return true;
}

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
    });
}

export async function notifyExpiringSubscriptions(withinDays = 3) {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  const expiring = await db
    .select({
      userId: userSubscriptions.userId,
      expiresAt: userSubscriptions.expiresAt,
      updatedAt: userSubscriptions.updatedAt,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.status, "active"));
  let notified = 0;
  for (const sub of expiring) {
    if (
      !sub.expiresAt ||
      sub.expiresAt.getTime() > cutoff.getTime() ||
      sub.expiresAt.getTime() < Date.now()
    )
      continue;
    // De-dup: only re-notify if the most recent such notification predates this subscription's last update.
    const recentRows = await db
      .select({ createdAt: notifications.createdAt })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, sub.userId),
          eq(notifications.type, "subscription_expiring")
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1);
    if (
      recentRows[0] &&
      recentRows[0].createdAt.getTime() > sub.updatedAt.getTime()
    )
      continue;
    await createNotification({
      userId: sub.userId,
      type: "subscription_expiring",
      title: "notifications.subscriptionExpiring",
      body: sub.expiresAt.toISOString(),
    });
    notified += 1;
  }
  return notified;
}
