import express from "express";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, like } from "drizzle-orm";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db/shared";
import { createEmailUser } from "../db/usersAuth";
import { emailOpenId, hashPassword } from "../_core/emailAuth";
import { createSessionToken } from "../_core/session";
import { COOKIE_NAME } from "@shared/const";
import { notifications, tafawoqSubscriptions, users, type User } from "../../drizzle/schema";

/**
 * REAL DATABASE: manual payments with a receipt — upload checked by content,
 * payment states, a reference reused on another subscription, methods the
 * admin offers, and the receipt served over HTTP to its owner and admins
 * only. Files go to the local storage folder (uploads/, git-ignored). SKIPPED without DATABASE_URL.
 */
const HAS_DB = !!process.env.DATABASE_URL;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c50000000049454e44ae426082", "hex");

function ctxFor(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {}, ip: `10.9.${RUN.length}.1`, get: () => "localhost" } as unknown as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe.skipIf(!HAS_DB || !!process.env.ANTHROPIC_API_KEY)("REAL DB — manual payments with receipts", () => {
  let appRouter: typeof import("../routers").appRouter;
  let admin: User;
  let server: ReturnType<express.Express["listen"]>;
  let base = "";

  async function fixtureUser(label: string, role: User["role"] = "learner"): Promise<User> {
    const db = await getDb();
    const email = `${label}-${RUN}@pay.test`;
    const openId = emailOpenId(email);
    const result = await createEmailUser({ openId, email, name: label, passwordHash: await hashPassword("a-long-test-password") });
    if (!result.ok) throw new Error(`fixture ${email}`);
    if (role !== "learner") await db!.update(users).set({ role }).where(eq(users.openId, openId));
    const [row] = await db!.select().from(users).where(eq(users.openId, openId)).limit(1);
    return row;
  }

  async function studentWithRequest(label: string, reference?: string) {
    const user = await fixtureUser(label);
    const caller = appRouter.createCaller(ctxFor(user));
    await caller.tafawoq.register({ displayName: label, age: 17, schoolLevel: "bac" });
    await caller.bac.chooseStream({ stream: "sciences" });
    const request = await caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp", paymentReference: reference ?? null });
    return { user, caller, request };
  }

  const get = async (url: string, user: User | null) =>
    fetch(`${base}${url}`, { headers: user ? { cookie: `${COOKIE_NAME}=${await createSessionToken(user.openId, {})}` } : {}, redirect: "manual" });

  beforeAll(async () => {
    vi.stubEnv("STORAGE_PROVIDER", "local");
    vi.resetModules();
    ({ appRouter } = await import("../routers"));
    const { registerProtectedFileRoutes } = await import("../protectedFiles");
    const app = express();
    registerProtectedFileRoutes(app);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    admin = await fixtureUser("admin", "admin");
  });
  afterAll(() => {
    server?.close();
    vi.unstubAllEnvs();
  });

  it("moves from awaiting payment to awaiting review with a receipt, refuses fakes, serves it to owner and admin only", async () => {
    const { user, caller, request } = await studentWithRequest("receipt");
    const pending = () => caller.bac.subscription().then(page => page.history.find(row => row.id === request.id)!);
    expect((await pending()).paymentState).toBe("awaiting_payment");

    const fake = Buffer.from("not really a png").toString("base64");
    await expect(caller.bac.uploadReceipt({ subscriptionId: request.id, file: { mimeType: "image/png", base64: fake } })).rejects.toMatchObject({ message: "FILE_CONTENT" });
    await expect(caller.bac.uploadReceipt({ subscriptionId: request.id, file: { mimeType: "text/html", base64: fake } })).rejects.toMatchObject({ message: "FILE_TYPE" });
    // Someone else cannot attach a receipt to this request.
    const intruder = await fixtureUser("intruder");
    await appRouter.createCaller(ctxFor(intruder)).tafawoq.register({ displayName: "Intruder", age: 17, schoolLevel: "bac" });
    await expect(
      appRouter.createCaller(ctxFor(intruder)).bac.uploadReceipt({ subscriptionId: request.id, file: { mimeType: "image/png", base64: PNG.toString("base64") } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await caller.bac.uploadReceipt({ subscriptionId: request.id, file: { mimeType: "image/png", base64: PNG.toString("base64") }, reference: `CCP-${RUN}` });
    const after = await pending();
    expect(after).toMatchObject({ paymentState: "awaiting_review", hasReceipt: true, paymentReference: `CCP-${RUN}` });

    const own = await get(`/api/protected-files/payment-receipt/${request.id}`, user);
    expect(own.status).toBe(200);
    expect(Buffer.from(await own.arrayBuffer()).equals(PNG)).toBe(true);
    expect(own.headers.get("cache-control")).toContain("no-store");
    expect((await get(`/api/protected-files/payment-receipt/${request.id}`, admin)).status).toBe(200);
    expect((await get(`/api/protected-files/payment-receipt/${request.id}`, intruder)).status).toBe(404);
    expect((await get(`/api/protected-files/payment-receipt/${request.id}`, null)).status).toBe(401);

    // Accepted: the state follows; a receipt can no longer be changed.
    await appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa });
    expect((await pending()).paymentState).toBe("accepted");
    await expect(caller.bac.uploadReceipt({ subscriptionId: request.id, file: { mimeType: "image/png", base64: PNG.toString("base64") } })).rejects.toMatchObject({ message: "NOT_PENDING" });
  });

  it("flags a reference already used on another live subscription, and asks the admin for a note", async () => {
    const reference = `BARIDI ${RUN}`;
    const first = await studentWithRequest("ref-a", reference);
    const second = await studentWithRequest("ref-b", reference.toLowerCase().replace(" ", ""));
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    const list = await adminCaller.bacAdmin.subscriptions({ status: "pending_payment" });
    expect(list.find(row => row.id === second.request.id)?.sameReference).toContain(first.request.id);
    await expect(adminCaller.bacAdmin.confirmSubscription({ id: second.request.id, paidAmountDa: second.request.amountDa })).rejects.toMatchObject({
      message: "DUPLICATE_REFERENCE_NOTE",
    });
    await adminCaller.bacAdmin.confirmSubscription({ id: second.request.id, paidAmountDa: second.request.amountDa, note: "two siblings, one transfer (checked)" });
    const db = await getDb();
    const [row] = await db!.select().from(tafawoqSubscriptions).where(eq(tafawoqSubscriptions.id, second.request.id));
    expect(row.status).toBe("active");
  });

  it("offers only the payment methods the admin enabled", async () => {
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await expect(adminCaller.bacAdmin.setSettings({ paymentMethods: [] })).rejects.toMatchObject({ message: "PAYMENT_METHOD_REQUIRED" });
    await adminCaller.bacAdmin.setSettings({ paymentMethods: ["baridimob"] });
    try {
      const user = await fixtureUser("methods");
      const caller = appRouter.createCaller(ctxFor(user));
      await caller.tafawoq.register({ displayName: "Methods", age: 17, schoolLevel: "bac" });
      await caller.bac.chooseStream({ stream: "sciences" });
      expect((await caller.bac.subscription()).paymentMethods).toEqual(["baridimob"]);
      await expect(caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "ccp" })).rejects.toMatchObject({ message: "PAYMENT_METHOD_OFF" });
      await expect(caller.bac.requestSubscription({ plan: "monthly", paymentMethod: "baridimob" })).resolves.toMatchObject({ status: "pending_payment" });
    } finally {
      await adminCaller.bacAdmin.setSettings({ paymentMethods: ["ccp", "baridimob", "cash"] });
    }
  });

  it("sends the expiry reminder once when two instances run the reminders at the same time", async () => {
    const { user, request } = await studentWithRequest("remind");
    await appRouter.createCaller(ctxFor(admin)).bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa });
    const db = (await getDb())!;
    const count = async (prefix: string) =>
      (await db.select().from(notifications).where(and(eq(notifications.userId, user.id), like(notifications.type, `${prefix}%`)))).length;
    const { runReminders } = await import("./platform/reminders");

    await db.update(tafawoqSubscriptions).set({ endsAt: new Date(Date.now() + 2 * 86_400_000) }).where(eq(tafawoqSubscriptions.id, request.id));
    await Promise.all([runReminders(), runReminders(), runReminders()]);
    await runReminders();
    expect(await count("bac_sub_expiring:")).toBe(1);

    // Ended yesterday: one "ended" notice, however many runs.
    await db.update(tafawoqSubscriptions).set({ endsAt: new Date(Date.now() - 86_400_000) }).where(eq(tafawoqSubscriptions.id, request.id));
    await Promise.all([runReminders(), runReminders()]);
    expect(await count("bac_sub_expired:")).toBe(1);

    // Sunday: the weekly parent reports, sent once however many runs.
    const sunday = new Date("2026-10-25T10:00:00Z");
    await Promise.all([runReminders(sunday), runReminders(sunday)]);
    const reports = await db.select().from(notifications).where(eq(notifications.type, "bac_parent_weekly"));
    const keys = reports.map(row => `${row.userId}|${row.dedupeKey}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("refuses a payment only with a reason, which reaches the student", async () => {
    const { user, caller, request } = await studentWithRequest("refused");
    const adminCaller = appRouter.createCaller(ctxFor(admin));
    await expect(adminCaller.bacAdmin.closeSubscription({ id: request.id, status: "rejected" })).rejects.toMatchObject({ message: "REJECT_REASON_REQUIRED" });
    await adminCaller.bacAdmin.closeSubscription({ id: request.id, status: "rejected", note: "الوصل غير مقروء" });
    const page = await caller.bac.subscription();
    expect(page.history.find(row => row.id === request.id)?.paymentState).toBe("rejected");
    const db = (await getDb())!;
    const [notice] = await db.select().from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.type, "bac_subscription_closed")));
    expect(notice.body).toBe("الوصل غير مقروء");
    // Refused, it can't be confirmed afterwards.
    await expect(adminCaller.bacAdmin.confirmSubscription({ id: request.id, paidAmountDa: request.amountDa })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
