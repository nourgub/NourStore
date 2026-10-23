import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { parentInviteCodes, parentLinks, users } from "../../drizzle/schema";

// Parent ↔ student links: a student creates a one-time code, the parent
// accepts it, either side can revoke the link.
import { getDb } from "./shared";
import { createNotification } from "./notifications";
import { nanoid } from "nanoid";

export async function getParentLinks(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: parentLinks.id,
      childId: parentLinks.childId,
      status: parentLinks.status,
      createdAt: parentLinks.createdAt,
      childName: users.name,
    })
    .from(parentLinks)
    .leftJoin(users, eq(users.id, parentLinks.childId))
    .where(eq(parentLinks.parentId, parentId))
    .orderBy(desc(parentLinks.createdAt));
}

export async function createParentInvite(childId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // Found via real-database integration testing: inserting straight away let an admin-supplied,
  // nonexistent childId crash with a raw SQL foreign-key error instead of a clean "not found".
  const childRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, childId))
    .limit(1);
  if (!childRows.length) return undefined;
  // One live code at a time: a new code cancels the student's earlier unused ones.
  await db
    .update(parentInviteCodes)
    .set({ canceledAt: new Date() })
    .where(and(eq(parentInviteCodes.childId, childId), isNull(parentInviteCodes.usedAt), isNull(parentInviteCodes.canceledAt)));
  const code = nanoid(10).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(parentInviteCodes).values({ childId, code, expiresAt });
  return { code, expiresAt };
}

export async function acceptParentInvite(parentId: number, code: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(parentInviteCodes)
    .where(eq(parentInviteCodes.code, code.trim().toUpperCase()))
    .limit(1);
  const invite = rows[0];
  if (
    !invite ||
    invite.usedAt ||
    invite.canceledAt ||
    invite.expiresAt.getTime() < Date.now()
  )
    return false;
  // Claim the code first, conditionally: two parents (or two clicks) at the
  // same moment cannot both use it.
  const [claim] = await db
    .update(parentInviteCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(parentInviteCodes.id, invite.id),
        isNull(parentInviteCodes.usedAt),
        isNull(parentInviteCodes.canceledAt),
        gt(parentInviteCodes.expiresAt, new Date())
      )
    );
  if ((claim as { affectedRows?: number }).affectedRows !== 1) return false;
  const existingLink = await db
    .select()
    .from(parentLinks)
    .where(
      and(
        eq(parentLinks.parentId, parentId),
        eq(parentLinks.childId, invite.childId)
      )
    )
    .limit(1);
  if (existingLink[0]) {
    // Re-activate a previously revoked link instead of violating the parentId+childId unique constraint.
    if (existingLink[0].status !== "active")
      await db
        .update(parentLinks)
        .set({ status: "active" })
        .where(eq(parentLinks.id, existingLink[0].id));
  } else {
    await db
      .insert(parentLinks)
      .values({ parentId, childId: invite.childId, status: "active" });
  }
  await createNotification({
    userId: invite.childId,
    type: "parent_link",
    title: "تم ربط حساب وليّك",
    body: "أصبح وليّك يرى مستواك وتقدمك واشتراكك (ومحادثاتك فقط إن فعّلت مشاركتها). يمكنك إلغاء الربط من «حسابي».",
  });
  return true;
}

export async function unlinkParent(input: {
  linkId: number;
  requesterId: number;
  role: "learner" | "parent" | "teacher" | "institution" | "admin";
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(parentLinks)
    .where(eq(parentLinks.id, input.linkId))
    .limit(1);
  const link = rows[0];
  if (!link) return false;
  if (
    input.role !== "admin" &&
    link.parentId !== input.requesterId &&
    link.childId !== input.requesterId
  )
    return false;
  await db
    .update(parentLinks)
    .set({ status: "revoked" })
    .where(eq(parentLinks.id, link.id));
  // The other side learns the link has ended.
  const other = link.parentId === input.requesterId ? link.childId : link.parentId;
  if (link.status === "active" && other !== input.requesterId)
    await createNotification({ userId: other, type: "parent_link", title: "أُلغي ربط حساب الولي", body: "لم يعد هذا الحساب مرتبطاً: لا يرى الولي تقدم التلميذ بعد الآن." });
  return true;
}

/** The parents linked to a student (for the student's own "who can see my progress" list). */
export async function getChildParentLinks(childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: parentLinks.id, parentName: users.name, status: parentLinks.status, createdAt: parentLinks.createdAt })
    .from(parentLinks)
    .leftJoin(users, eq(users.id, parentLinks.parentId))
    .where(and(eq(parentLinks.childId, childId), or(eq(parentLinks.status, "active"), eq(parentLinks.status, "pending"))))
    .orderBy(desc(parentLinks.createdAt));
}
