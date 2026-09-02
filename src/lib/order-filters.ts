import type { Prisma } from "@/generated/prisma/client";

export const ORDER_STATUS_VALUES = [
  "pending_payment",
  "proof_submitted",
  "paid",
  "fulfilled",
  "cancelled",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

export function buildOrderWhere(params: { status?: string; q?: string }): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (params.status && (ORDER_STATUS_VALUES as readonly string[]).includes(params.status)) {
    where.status = params.status as OrderStatusValue;
  }

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { merchantName: { contains: q } },
      { storeName: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  return where;
}
