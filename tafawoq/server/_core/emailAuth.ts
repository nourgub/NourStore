// Real email + password authentication. Unlike Google OAuth, this needs
// ZERO external service, ZERO third-party account, and ZERO API
// key — it's entirely self-contained code, running on whatever server this
// app is deployed on. This is the option for someone who wants the site
// working without signing up for anything else first.
//
// Password hashing uses Node's built-in crypto.scrypt (no external
// dependency like bcrypt needed) — scrypt is a real, modern, deliberately
// slow key-derivation function designed for password storage (not a fast
// general-purpose hash like sha256, which would be unsafe here).

import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  try {
    const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
    const storedKey = Buffer.from(hashHex, "hex");
    if (derivedKey.length !== storedKey.length) return false;
    return crypto.timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

/** The openId used internally for an email-authenticated account — namespaced so it can never collide with a Google-issued openId. */
export function emailOpenId(email: string): string {
  return `email_${email.trim().toLowerCase()}`;
}

const PASSWORD_MIN_LENGTH = 8;

export function validatePasswordStrength(
  password: string
): { ok: true } | { ok: false; reason: string } {
  if (password.length < PASSWORD_MIN_LENGTH)
    return {
      ok: false,
      reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return {
      ok: false,
      reason: "Password must contain both letters and numbers.",
    };
  return { ok: true };
}
