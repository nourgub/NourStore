import {
  and,
  desc,
  eq,
  sql,
} from "drizzle-orm";
import {
  coupons,
  couponRedemptions,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function createCoupon(input: {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxRedemptions?: number;
  validUntil?: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .insert(coupons)
    .values({
      code: input.code.toUpperCase(),
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxRedemptions: input.maxRedemptions,
      validUntil: input.validUntil,
    });
}

export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function setCouponActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(coupons)
    .set({ isActive: isActive ? 1 : 0 })
    .where(eq(coupons.id, id));
  return true;
}

export type CouponValidation =
  | {
      ok: true;
      coupon: typeof coupons.$inferSelect;
      discountedAmountCents: number;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "inactive"
        | "not_yet_valid"
        | "expired"
        | "max_redemptions_reached"
        | "already_redeemed_by_user";
    };

export async function validateCoupon(input: {
  code: string;
  userId: number;
  amountCents: number;
}): Promise<CouponValidation> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, input.code.toUpperCase()))
    .limit(1);
  const coupon = rows[0];
  if (!coupon) return { ok: false, reason: "not_found" };
  if (coupon.isActive !== 1) return { ok: false, reason: "inactive" };
  const now = Date.now();
  if (coupon.validFrom.getTime() > now)
    return { ok: false, reason: "not_yet_valid" };
  if (coupon.validUntil && coupon.validUntil.getTime() < now)
    return { ok: false, reason: "expired" };
  if (
    coupon.maxRedemptions !== null &&
    coupon.timesRedeemed >= coupon.maxRedemptions
  )
    return { ok: false, reason: "max_redemptions_reached" };
  const alreadyUsed = await db
    .select({ id: couponRedemptions.id })
    .from(couponRedemptions)
    .where(
      and(
        eq(couponRedemptions.couponId, coupon.id),
        eq(couponRedemptions.userId, input.userId)
      )
    )
    .limit(1);
  if (alreadyUsed.length)
    return { ok: false, reason: "already_redeemed_by_user" };
  const discountedAmountCents =
    coupon.discountType === "percent"
      ? Math.max(
          0,
          Math.round(input.amountCents * (1 - coupon.discountValue / 100))
        )
      : Math.max(0, input.amountCents - coupon.discountValue);
  return { ok: true, coupon, discountedAmountCents };
}

export async function redeemCoupon(input: {
  couponId: number;
  userId: number;
  invoiceId: number;
}) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(couponRedemptions).values(input);
  await db
    .update(coupons)
    .set({ timesRedeemed: sql`${coupons.timesRedeemed} + 1` })
    .where(eq(coupons.id, input.couponId));
  return true;
}
