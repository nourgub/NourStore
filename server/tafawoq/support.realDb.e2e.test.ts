import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db/shared";
import { createEmailUser } from "../db/usersAuth";
import { emailOpenId, hashPassword } from "../_core/emailAuth";
import { notifications, users, type User } from "../../drizzle/schema";

/**
 * REAL DATABASE: support tickets — a user sees only their own, an admin
 * answers (the user is notified), the whole history is kept, a closed
 * ticket takes no reply, and a user can't open endless tickets.
 * SKIPPED without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ctxFor(user: User): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: "10.8.0.1", get: () => "localhost" } as unknown as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe.skipIf(!HAS_DB)("REAL DB — support tickets", () => {
  let appRouter: typeof import("../routers").appRouter;
  async function fixtureUser(label: string, role: User["role"] = "learner"): Promise<User> {
    const db = (await getDb())!;
    const email = `${label}-${RUN}@support.test`;
    const openId = emailOpenId(email);
    const result = await createEmailUser({ openId, email, name: label, passwordHash: await hashPassword("a-long-test-password") });
    if (!result.ok) throw new Error(`fixture ${email}`);
    if (role !== "learner") await db.update(users).set({ role }).where(eq(users.openId, openId));
    const [row] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return row;
  }
  beforeAll(async () => {
    ({ appRouter } = await import("../routers"));
  });

  it("keeps tickets private, notifies on a reply, and keeps the history", async () => {
    const student = await fixtureUser("student");
    const other = await fixtureUser("other");
    const admin = await fixtureUser("admin", "admin");
    const me = appRouter.createCaller(ctxFor(student));
    const staff = appRouter.createCaller(ctxFor(admin));

    const { id } = await me.support.create({ category: "payment", subject: "دفعت ولم يتفعّل الاشتراك", message: "أرسلت الوصل أمس." });
    expect((await me.support.mine())[0]).toMatchObject({ id, priority: "high", status: "open", category: "payment" });
    await expect(appRouter.createCaller(ctxFor(other)).support.thread({ id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(appRouter.createCaller(ctxFor(other)).support.reply({ id, message: "hello" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(me.support.adminList({ status: "open" })).rejects.toBeTruthy();

    expect((await staff.support.adminList({ status: "open" })).some(ticket => ticket.id === id)).toBe(true);
    await staff.support.reply({ id, message: "تحققنا، فُعّل اليوم." });
    const db = (await getDb())!;
    const notes = await db.select().from(notifications).where(and(eq(notifications.userId, student.id), eq(notifications.type, "support_reply")));
    expect(notes).toHaveLength(1);
    const thread = await me.support.thread({ id });
    expect(thread.ticket.status).toBe("in_progress");
    expect(thread.messages.map(entry => entry.fromStaff)).toEqual([false, true]);
    expect(thread.messages[1].senderName).toBeNull(); // the student sees "the team", not a staff name

    await me.support.reply({ id, message: "شكراً" });
    expect((await staff.support.thread({ id })).ticket.lastSenderRole).toBe("user");
    await staff.support.adminSet({ id, status: "closed" });
    await expect(me.support.reply({ id, message: "سؤال آخر" })).rejects.toMatchObject({ message: "TICKET_CLOSED" });
    expect((await me.support.thread({ id })).messages).toHaveLength(3);
  });

  it("limits how many tickets one user keeps open", async () => {
    const user = await fixtureUser("busy");
    const caller = appRouter.createCaller(ctxFor(user));
    for (let n = 0; n < 5; n++) await caller.support.create({ category: "other", subject: `طلب ${n + 1}`, message: "..." + n });
    await expect(caller.support.create({ category: "other", subject: "طلب 6", message: "..." })).rejects.toMatchObject({ message: "TOO_MANY_OPEN_TICKETS" });
  });
});
