import { secretsMatch } from "./auth";

// Placeholder payment details until the real BaridiMob/CCP account is wired
// in via env vars. Safe to ship as-is (nothing secret), but replace before
// accepting real payments.
export const BILLING_CONFIG = {
  priceLabel: process.env.BILLING_PRICE_LABEL || "1000 دج / شهريًا",
  accountHolderName: process.env.BILLING_ACCOUNT_NAME || "اسم صاحب المنصة (مثال)",
  accountRip: process.env.BILLING_ACCOUNT_RIP || "00799999000123456789 (رقم تجريبي)",
  whatsappNumber: process.env.BILLING_WHATSAPP_NUMBER || "213500000000",
};

export function getAdminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
}

// Admin access is a persisted, one-time-verified flag (teacher.isAdmin) —
// never re-derived from an email match at request time. Matching ADMIN_EMAIL
// alone used to be sufficient, which meant whoever registered that exact
// email address first (not necessarily its real owner, since signup has no
// email verification) got permanent admin access with no way for the real
// owner to reclaim it. See db.ts's is_admin migration and
// /api/auth/signup's ADMIN_BOOTSTRAP_TOKEN check.
export function isAdminTeacher(teacher: { isAdmin: boolean }): boolean {
  return teacher.isAdmin === true;
}

// The one place that decides whether a brand-new signup becomes an admin —
// extracted out of the signup route so this security-critical decision is
// directly unit-testable. Requires BOTH the email match AND proof of the
// server-side secret; either alone is not enough.
export function shouldGrantAdminOnSignup(email: string, providedToken: string): boolean {
  const adminEmail = getAdminEmail();
  const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!adminEmail || !bootstrapToken) return false;
  if (email.trim().toLowerCase() !== adminEmail) return false;
  return secretsMatch(providedToken, bootstrapToken);
}
