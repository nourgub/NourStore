import { SignJWT, jwtVerify } from "jose";

export const MERCHANT_SESSION_COOKIE = "ns_merchant_session";
const SESSION_DURATION = "30d";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createMerchantSessionToken(merchantId: string) {
  return new SignJWT({ role: "merchant", merchantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifyMerchantSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "merchant" || typeof payload.merchantId !== "string") return null;
    return payload.merchantId;
  } catch {
    return null;
  }
}
