import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { MERCHANT_SESSION_COOKIE, verifyMerchantSessionToken } from "@/lib/merchant-auth";

export async function getCurrentMerchant() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MERCHANT_SESSION_COOKIE)?.value;
  const merchantId = await verifyMerchantSessionToken(token);
  if (!merchantId) return null;
  return db.merchant.findUnique({ where: { id: merchantId } });
}
