import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export function normalizePhone(phone: string) {
  return phone.replace(/[\s-]/g, "");
}

export async function findMerchantByPhone(phone: string) {
  return db.merchant.findUnique({ where: { phone: normalizePhone(phone) } });
}

export async function createMerchant(params: {
  name: string;
  storeName: string;
  phone: string;
  password: string;
}) {
  return db.merchant.create({
    data: {
      name: params.name,
      storeName: params.storeName,
      phone: normalizePhone(params.phone),
      passwordHash: hashPassword(params.password),
    },
  });
}

export async function verifyMerchantCredentials(phone: string, password: string) {
  const merchant = await findMerchantByPhone(phone);
  if (!merchant) return null;
  const valid = verifyPassword(password, merchant.passwordHash);
  return valid ? merchant : null;
}
