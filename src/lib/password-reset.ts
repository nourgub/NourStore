import { randomInt } from "node:crypto";
import { db } from "@/lib/db";

const CODE_TTL_MS = 10 * 60 * 1000;

export function generateResetCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function createResetCode(merchantId: string) {
  const code = generateResetCode();
  await db.passwordResetCode.create({
    data: {
      merchantId,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export async function consumeResetCode(merchantId: string, code: string) {
  const match = await db.passwordResetCode.findFirst({
    where: { merchantId, code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!match) return false;

  await db.passwordResetCode.update({
    where: { id: match.id },
    data: { usedAt: new Date() },
  });
  return true;
}
