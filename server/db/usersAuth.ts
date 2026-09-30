import {
  and,
  desc,
  eq,
  gt,
  isNull,
} from "drizzle-orm";
import crypto from "crypto";
import {
  InsertUser,
  User,
  users,
  passwordResetTokens,
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
  | { ok: true; openId: string; userId: number; pending: boolean }
  | { ok: false; reason: "email_taken" };

/**
 * Self-service signup starts "pending" (same gate as createManagedUser)
 * until an admin approves it — either the "Activate" button in the admin
 * panel, or a WhatsApp reply from the configured admin number (see
 * whatsappBot.ts notifyAdminOfPendingRegistration / handleWhatsAppAdminCommand).
 * The bootstrap owner is the one exception: mirrors upsertUser's
 * OWNER_OPEN_ID bootstrap (used by the Google OAuth path) — without this, a
 * deployment running AUTH_PROVIDER=email has no way at all to grant its
 * first admin except a direct database edit.
 */
export async function createEmailUser(input: {
  openId: string;
  email: string;
  name: string;
  passwordHash: string;
  // The registration form's own account-type choice (learner / teacher /
  // institution manager). "admin" can never come through here — see
  // registerWithEmail's z.enum in routers/auth.ts, which never offers it.
  // Defaults to "learner" when omitted (e.g. an older client build).
  role?: "learner" | "teacher" | "institution";
}): Promise<EmailRegisterResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "email_taken" };
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, input.openId))
    .limit(1);
  if (existing.length) return { ok: false, reason: "email_taken" };
  const isOwner = input.openId === ENV.ownerOpenId;
  const chosenRole = input.role ?? "learner";
  const [result] = await db
    .insert(users)
    .values({
      openId: input.openId,
      email: input.email,
      name: input.name,
      loginMethod: "email",
      passwordHash: input.passwordHash,
      role: isOwner ? "admin" : chosenRole,
      // A role picked explicitly at registration counts as "chosen" — the
      // post-login RoleOnboardingModal only ever shows for accounts where
      // this is still null (e.g. registered before this field existed).
      roleChosenAt: isOwner || input.role ? new Date() : undefined,
      accountStatus: isOwner ? "active" : "pending",
      lastSignedIn: new Date(),
    });
  return {
    ok: true,
    openId: input.openId,
    userId: (result as { insertId: number }).insertId,
    pending: !isOwner,
  };
}

/** Minimal lookup used by the admin WhatsApp-approval command handler to
 * confirm a userId is real and to compose a human-readable confirmation
 * reply — never returns passwordHash. */
export async function getUserBasicInfo(userId: number): Promise<{
  id: number;
  name: string | null;
  email: string | null;
  accountStatus: "active" | "pending" | "suspended";
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
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

export type ManagedUserRole = "learner" | "teacher" | "institution" | "admin";

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
      loginMethod: users.loginMethod,
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
  role: "learner" | "teacher" | "institution" | "admin"
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

/**
 * Looks up an email/password account by email for the self-service
 * "forgot password" flow — never matches a Google-authenticated account
 * (loginMethod !== "email"), since those have no password to reset.
 * Deliberately returns only what's needed to send a reset email (never
 * passwordHash), and the caller (requestPasswordReset in
 * routers/auth.ts) never reveals whether a match was found either way —
 * this is looked up purely to decide whether to actually send an email,
 * not to shape the response.
 */
export async function getUserIdForPasswordReset(
  email: string
): Promise<{ userId: number; name: string | null } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ id: users.id, name: users.name, loginMethod: users.loginMethod })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  const user = rows[0];
  if (!user || user.loginMethod !== "email") return undefined;
  return { userId: user.id, name: user.name };
}

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Creates a fresh, single-use reset token for a self-service "forgot
 * password" email — see the passwordResetTokens table comment in
 * schema.ts for why only its SHA-256 hash is ever stored. Returns the raw
 * token (the only time it exists in plaintext) so the caller can embed it
 * in the emailed reset link; nothing later ever reads it back out.
 */
export async function createPasswordResetToken(
  userId: number
): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  });
  return rawToken;
}

/**
 * Validates a raw reset token from an emailed link and, if it's real,
 * unused, and unexpired, atomically marks it used and sets the account's
 * new password in the same call — race-safe via the same
 * "UPDATE ... WHERE still-valid" pattern used by markInvoicePaid
 * (server/db/subscriptions/invoices.ts): two requests racing on the same
 * token can never both succeed, since only the request whose UPDATE
 * actually matches a row proceeds to change the password.
 */
export async function resetPasswordWithToken(
  rawToken: string,
  newPasswordHash: string
): Promise<{ ok: true } | { ok: false; reason: "invalid_or_expired" }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "invalid_or_expired" };
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const updateResult = (await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )) as unknown as [{ affectedRows: number }, unknown];
  if (updateResult[0].affectedRows === 0)
    return { ok: false, reason: "invalid_or_expired" };
  const rows = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);
  const userId = rows[0]?.userId;
  if (!userId) return { ok: false, reason: "invalid_or_expired" };
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, userId));
  return { ok: true };
}

/**
 * The fallback account-recovery path for a deployment that hasn't
 * configured SMTP yet (see server/_core/email.ts's isEmailConfigured) —
 * an admin sets a new password directly here and relays it to the learner
 * through the platform's existing contact channel (WhatsApp), same
 * "manual review is the bottleneck, not silently broken" posture already
 * used for payment approval. Once SMTP is configured, the self-service
 * flow above (createPasswordResetToken/resetPasswordWithToken) is the
 * primary path and this becomes a manual backstop rather than the only option.
 */
export async function adminResetPassword(
  userId: number,
  newPasswordHash: string
): Promise<{ ok: true } | { ok: false; reason: "not_email_account" }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_email_account" };
  const rows = await db
    .select({ loginMethod: users.loginMethod })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (rows[0]?.loginMethod !== "email")
    return { ok: false, reason: "not_email_account" };
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash })
    .where(eq(users.id, userId));
  return { ok: true };
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
