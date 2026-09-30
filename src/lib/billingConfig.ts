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

export function isAdminEmail(email: string): boolean {
  const adminEmail = getAdminEmail();
  return Boolean(adminEmail) && email.toLowerCase() === adminEmail;
}
