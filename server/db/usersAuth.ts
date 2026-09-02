import {
  desc,
  eq,
} from "drizzle-orm";
import {
  InsertUser,
  User,
  users,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "./shared";

/**
 * The `users` row shape safe to send to a client, with `passwordHash`
 * stripped. `getUserByOpenId` deliberately returns the full row (internal
 * use — e.g. building tRPC context), so anything that forwards a user
 * object to the client must go through this first rather than spreading
 * the row directly. See auth.me in routers.ts, the one place this
 * currently matters.
 */
export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const role =
    user.role !== undefined
      ? user.role
      : user.openId === ENV.ownerOpenId
        ? "admin"
        : undefined;
  const roleChosenAt =
    user.openId === ENV.ownerOpenId && user.role === undefined
      ? new Date()
      : undefined;
    const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
    // The bootstrap owner never needs the "choose your account type"
    // onboarding prompt — they're already an admin the moment they log in.
    values.roleChosenAt = new Date();
    updateSet.roleChosenAt = new Date();
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
    const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export type EmailRegisterResult =
  | { ok: true; openId: string }
  | { ok: false; reason: "email_taken" };

export async function createEmailUser(input: {
  openId: string;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<EmailRegisterResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "email_taken" };
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, input.openId))
    .limit(1);
  if (existing.length) return { ok: false, reason: "email_taken" };
  await db
    .insert(users)
    .values({
      openId: input.openId,
      email: input.email,
      name: input.name,
      loginMethod: "email",
      passwordHash: input.passwordHash,
      role: "learner",
      lastSignedIn: new Date(),
    });
  return { ok: true, openId: input.openId };
}

export async function getEmailUserPasswordHash(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ passwordHash: users.passwordHash, accountStatus: users.accountStatus })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return rows[0] ?? null;
}

export type ManagedUserRole = "learner" | "teacher" | "admin";

export type CreateManagedUserResult =
  | { ok: true; userId: number }
  | { ok: false; reason: "email_taken" };

/**
 * An admin creating an account directly from the admin panel — distinct
 * from createEmailUser (self-service signup, always "learner", always
 * immediately usable). Here the admin chooses the role up front, and a new
 * teacher/learner account starts "pending": it exists but cannot log in
 * (see loginWithEmail in routers.ts) until an admin confirms payment and
 * calls setAccountStatus to flip it "active". An admin-created admin
 * account has no payment step, so it starts active.
 */
export async function createManagedUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  role: ManagedUserRole;
}): Promise<CreateManagedUserResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "email_taken" };
  const openId = `email_${input.email}`;
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  if (existing.length) return { ok: false, reason: "email_taken" };
  const [result] = await db.insert(users).values({
    openId,
    email: input.email,
    name: input.name,
    loginMethod: "email",
    passwordHash: input.passwordHash,
    role: input.role,
    roleChosenAt: new Date(),
    accountStatus: input.role === "admin" ? "active" : "pending",
    lastSignedIn: new Date(),
  });
  return { ok: true, userId: (result as { insertId: number }).insertId };
}

export async function setAccountStatus(
  userId: number,
  accountStatus: "active" | "pending" | "suspended"
) {
  const db = await getDb();
  if (!db) return false;
  const [result] = await db
    .update(users)
    .set({ accountStatus })
    .where(eq(users.id, userId));
  return (result as { affectedRows?: number }).affectedRows
    ? (result as { affectedRows?: number }).affectedRows! > 0
    : false;
}

export async function markUserSignedIn(openId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.openId, openId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function getAdminUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  return rows.map(r => r.id);
}

export async function updateUserRole(
  userId: number,
  role: "learner" | "parent" | "teacher" | "institution" | "admin"
) {
  const db = await getDb();
  if (!db) return false;
  // Found via real-database testing: an UPDATE against a nonexistent userId
  // matches zero rows but doesn't error, so the naive version of this
  // function reported false success for a bad ID. Check affectedRows.
  const [result] = await db
    .update(users)
    .set({ role, roleChosenAt: new Date() })
    .where(eq(users.id, userId));
  return (result as { affectedRows?: number }).affectedRows
    ? (result as { affectedRows?: number }).affectedRows! > 0
    : false;
}

export async function chooseOwnRole(
  userId: number,
  role: "learner" | "teacher" | "institution"
): Promise<{ ok: true } | { ok: false; reason: "already_chosen" }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "already_chosen" };
  const rows = await db
    .select({ roleChosenAt: users.roleChosenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!rows.length) return { ok: false, reason: "already_chosen" };
  if (rows[0].roleChosenAt) return { ok: false, reason: "already_chosen" };
  await db
    .update(users)
    .set({ role, roleChosenAt: new Date() })
    .where(eq(users.id, userId));
  return { ok: true };
}
