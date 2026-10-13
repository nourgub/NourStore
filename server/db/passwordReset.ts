// One-time password reset codes (drizzle/0035). Only a SHA-256 of the code
// is stored: a database leak gives no usable code. A code lasts 30 minutes,
// is used at most once (conditional update), and asking for a new one
// cancels the previous ones.
import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { passwordResetTokens } from "../../drizzle/schema";
import { getDb } from "./shared";

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createResetToken(userId: number, now = new Date()): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hash(token),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
  });
  return token;
}

/** The account the code belongs to, marking it used — null if unknown, expired or already used. */
export async function consumeResetToken(token: string, now = new Date()): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hash(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  const [result] = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)));
  return result.affectedRows === 1 ? row.userId : null;
}
