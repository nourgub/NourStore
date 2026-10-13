import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db/shared";
import { createEmailUser } from "../db/usersAuth";
import { emailOpenId, hashPassword } from "../_core/emailAuth";
import { createSessionToken, verifySession } from "../_core/session";
import { captureMailForTests } from "../_core/mailer";
import {
  accountRequests,
  parentLinks,
  passwordResetTokens,
  tafawoqMessages,
  tafawoqStudents,
  tafawoqSubscriptions,
  users,
  type User,
} from "../../drizzle/schema";

/**
 * REAL DATABASE run of account self-service: password reset by email (no
 * account discovery, single use, expiry, older sessions revoked), password
 * change, data export, and an admin-confirmed account deletion.
 * Email is captured in memory — nothing is sent. SKIPPED without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
// A fresh address per run: rate-limit counters live in the database.
const IP = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const PASSWORD = "a-long-test-password";

function ctxFor(user: User | null, cookies: string[] = []): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: IP, get: () => "localhost" } as unknown as TrpcContext["req"],
    res: { cookie: (_n: string, v: string) => cookies.push(v), clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

async function fixtureUser(label: string, role: User["role"] = "learner"): Promise<User> {
  const db = await getDb();
  const email = `${label}-${RUN}@account.test`;
  const openId = emailOpenId(email);
  const result = await createEmailUser({ openId, email, name: label, passwordHash: await hashPassword(PASSWORD) });
  if (!result.ok) throw new Error(`fixture ${email}`);
  if (role !== "learner") await db!.update(users).set({ role }).where(eq(users.openId, openId));
  const [row] = await db!.select().from(users).where(eq(users.openId, openId)).limit(1);
  return row;
}

async function reload(user: User): Promise<User> {
  const db = await getDb();
  const [row] = await db!.select().from(users).where(eq(users.id, user.id)).limit(1);
  return row;
}

/** Whether a session token would still let its holder in. */
async function sessionStillValid(token: string, user: User) {
  const session = await verifySession(token);
  const fresh = await reload(user);
  return !!session && session.sessionVersion === (fresh.sessionVersion ?? 0);
}

describe.skipIf(!HAS_DB || !!process.env.ANTHROPIC_API_KEY)("REAL DB — account self-service", () => {
  let outbox: ReturnType<typeof captureMailForTests>;
  let admin: User;

  beforeAll(async () => {
    vi.stubEnv("APP_BASE_URL", "https://tafawoq.test");
    outbox = captureMailForTests();
    admin = await fixtureUser("admin", "admin");
  });

  it("resets a forgotten password by email without revealing which emails have accounts", async () => {
    const user = await fixtureUser("forgot");
    const oldToken = await createSessionToken(user.openId, {});
    const pub = appRouter.createCaller(ctxFor(null));

    // Unknown email: same answer, no email.
    await expect(pub.auth.requestPasswordReset({ email: `nobody-${RUN}@account.test` })).resolves.toEqual({ ok: true });
    await expect(pub.auth.requestPasswordReset({ email: user.email! })).resolves.toEqual({ ok: true });
    await vi.waitFor(() => expect(outbox.some(m => m.to === user.email)).toBe(true));
    expect(outbox.some(m => m.to.startsWith("nobody-"))).toBe(false);

    const mail = outbox.find(m => m.to === user.email)!;
    const token = decodeURIComponent(/token=([^\s]+)/.exec(mail.text)![1]);
    expect(mail.text).toContain("https://tafawoq.test/reset-password?token=");
    // Only a hash is stored, never the code itself.
    const db = await getDb();
    const stored = await db!.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    expect(stored.map(r => r.tokenHash)).not.toContain(token);

    await expect(pub.auth.resetPassword({ token, newPassword: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await pub.auth.resetPassword({ token, newPassword: "a-brand-new-password-42" });
    // Single use.
    await expect(pub.auth.resetPassword({ token, newPassword: "another-new-password-42" })).rejects.toMatchObject({ message: "RESET_INVALID" });
    // The session opened before the reset no longer works.
    expect(await sessionStillValid(oldToken, user)).toBe(false);
    // The new password works, the old one doesn't.
    await expect(pub.auth.loginWithEmail({ email: user.email!, password: PASSWORD })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(pub.auth.loginWithEmail({ email: user.email!, password: "a-brand-new-password-42" })).resolves.toEqual({ ok: true });
  });

  it("refuses an expired code, and a new request cancels the previous code", async () => {
    const user = await fixtureUser("expired");
    const pub = appRouter.createCaller(ctxFor(null));
    const codes: string[] = [];
    for (let i = 0; i < 2; i++) {
      const before = outbox.filter(m => m.to === user.email).length;
      await pub.auth.requestPasswordReset({ email: user.email! });
      await vi.waitFor(() => expect(outbox.filter(m => m.to === user.email).length).toBe(before + 1));
      const mail = outbox.filter(m => m.to === user.email).at(-1)!;
      codes.push(decodeURIComponent(/token=([^\s]+)/.exec(mail.text)![1]));
    }
    await expect(pub.auth.resetPassword({ token: codes[0], newPassword: "a-brand-new-password-42" })).rejects.toMatchObject({ message: "RESET_INVALID" });
    const db = await getDb();
    await db!.update(passwordResetTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(passwordResetTokens.userId, user.id));
    await expect(pub.auth.resetPassword({ token: codes[1], newPassword: "a-brand-new-password-42" })).rejects.toMatchObject({ message: "RESET_INVALID" });
  });

  it("changes the password only with the current one, and signs out other sessions", async () => {
    const user = await fixtureUser("change");
    const otherDevice = await createSessionToken(user.openId, {});
    const cookies: string[] = [];
    const caller = appRouter.createCaller(ctxFor(user, cookies));
    await expect(caller.auth.changePassword({ currentPassword: "wrong-password-xx", newPassword: "a-brand-new-password-42" })).rejects.toMatchObject({
      message: "WRONG_PASSWORD",
    });
    await caller.auth.changePassword({ currentPassword: PASSWORD, newPassword: "a-brand-new-password-42" });
    expect(await sessionStillValid(otherDevice, user)).toBe(false);
    // This device received a fresh, valid session.
    expect(cookies).toHaveLength(1);
    expect(await sessionStillValid(cookies[0], user)).toBe(true);

    await appRouter.createCaller(ctxFor(await reload(user))).auth.logoutEverywhere();
    expect(await sessionStillValid(cookies[0], user)).toBe(false);
  });

  it("exports the user's own data without the password hash", async () => {
    const user = await fixtureUser("export");
    const caller = appRouter.createCaller(ctxFor(user));
    await caller.tafawoq.register({ displayName: "Export Test", age: 17, schoolLevel: "bac" });
    const data = await caller.account.exportMyData();
    expect(data.user.email).toBe(user.email);
    expect(data.student?.displayName).toBe("Export Test");
    expect(JSON.stringify(data)).not.toContain("scrypt:");
    expect(Object.keys(data)).toEqual(expect.arrayContaining(["subscriptions", "attempts", "chats", "exercises", "bookings", "parentLinks"]));
  });

  it("deletes an account only after an admin confirms, erasing identity and keeping payment records", async () => {
    const user = await fixtureUser("delete-me");
    const parent = await fixtureUser("delete-parent", "parent");
    const caller = appRouter.createCaller(ctxFor(user));
    await caller.tafawoq.register({ displayName: "Delete Me", age: 17, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "sciences" });
    const sub = await caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp" });
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await adminCaller.bacAdmin.confirmSubscription({ id: sub.id, paidAmountDa: sub.amountDa });
    const db = await getDb();
    const [student] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, user.id));
    await db!.insert(tafawoqMessages).values({ studentId: student.id, lessonKey: "math-derivatives", role: "student", content: "سؤالي الخاص" });
    await db!.insert(parentLinks).values({ parentId: parent.id, childId: user.id, status: "active" });

    // Admins can't delete their own account through this path; a user can't resolve.
    await expect(appRouter.createCaller(ctxFor(admin)).account.requestDeletion({})).rejects.toMatchObject({ message: "ADMIN_ACCOUNT" });
    await caller.account.requestDeletion({ note: "لم أعد أحتاجه" });
    await expect(caller.account.requestDeletion({})).rejects.toMatchObject({ message: "PENDING_EXISTS" });
    await expect(caller.accountAdmin.requests({})).rejects.toMatchObject({ code: "FORBIDDEN" });

    const open = (await adminCaller.accountAdmin.requests({ status: "open" })).find(r => r.userId === user.id)!;
    expect(open.kind).toBe("delete");
    // Two admins clicking at once: the account is erased once.
    const results = await Promise.allSettled([
      adminCaller.accountAdmin.resolve({ id: open.id, action: "anonymize" }),
      adminCaller.accountAdmin.resolve({ id: open.id, action: "anonymize" }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);

    const gone = await reload(user);
    expect(gone.email).toBeNull();
    expect(gone.name).toBeNull();
    expect(gone.passwordHash).toBeNull();
    expect(gone.accountStatus).toBe("suspended");
    expect(gone.openId).not.toBe(user.openId);
    const [anonStudent] = await db!.select().from(tafawoqStudents).where(eq(tafawoqStudents.id, student.id));
    expect(anonStudent.displayName).toBe("-");
    expect(await db!.select().from(tafawoqMessages).where(eq(tafawoqMessages.studentId, student.id))).toHaveLength(0);
    const [link] = await db!.select().from(parentLinks).where(eq(parentLinks.childId, user.id));
    expect(link.status).toBe("revoked");
    // Payment records are kept (accounting), without the person's name.
    const subs = await db!.select().from(tafawoqSubscriptions).where(eq(tafawoqSubscriptions.userId, user.id));
    expect(subs).toHaveLength(1);
    const [request] = await db!.select().from(accountRequests).where(eq(accountRequests.id, open.id));
    expect(request.status).toBe("done");
    // The old email can't sign in.
    await expect(
      appRouter.createCaller(ctxFor(null)).auth.loginWithEmail({ email: user.email!, password: PASSWORD })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires a reason to refuse a deletion request", async () => {
    const user = await fixtureUser("refused");
    await appRouter.createCaller(ctxFor(user)).account.requestDeletion({});
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const open = (await adminCaller.accountAdmin.requests({ status: "open" })).find(r => r.userId === user.id)!;
    await expect(adminCaller.accountAdmin.resolve({ id: open.id, action: "reject" })).rejects.toMatchObject({ message: "NOTE_REQUIRED" });
    await adminCaller.accountAdmin.resolve({ id: open.id, action: "reject", note: "اشتراك قيد التسوية" });
    expect((await reload(user)).email).toBe(user.email);
  });

  it("records a lesson's pedagogical review only by an admin, and an approval names the teacher", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const learner = await fixtureUser("not-admin");
    await expect(
      appRouter.createCaller(ctxFor(learner)).bacAdmin.setContentReview({ lessonKey: "math-derivatives", status: "approved", reviewerName: "x" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminCaller.bacAdmin.setContentReview({ lessonKey: "math-derivatives", status: "approved" })).rejects.toMatchObject({
      message: "REVIEWER_REQUIRED",
    });
    await expect(adminCaller.bacAdmin.setContentReview({ lessonKey: "no-such-lesson", status: "in_review" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await adminCaller.bacAdmin.setContentReview({ lessonKey: "math-derivatives", status: "in_review", note: `run ${RUN}` });
    const data = await adminCaller.bacAdmin.contentInventory();
    expect(data.reviews.find(review => review.lessonKey === "math-derivatives")?.status).toBe("in_review");
    expect(data.inventory.some(row => row.stream === "sciences" && row.subject === "math" && row.lessons.length > 0)).toBe(true);
    // Back to its initial state so a repeated run starts the same.
    await adminCaller.bacAdmin.setContentReview({ lessonKey: "math-derivatives", status: "unreviewed" });
  });
});
