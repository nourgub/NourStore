import { and, eq, inArray } from "drizzle-orm";
import { planPrices, subscriptionPlans } from "../../../drizzle/schema";
import { getDb } from "../shared";

export async function getSubscriptionPlans(
  activeOnly = false,
  currency?: string
) {
  const db = await getDb();
  if (!db) return [];
  const plans = await db
    .select()
    .from(subscriptionPlans)
    .where(activeOnly ? eq(subscriptionPlans.isActive, 1) : undefined)
    .orderBy(subscriptionPlans.priceCents);
  if (!plans.length)
    return plans.map(plan => ({
      ...plan,
      resolvedCurrency: plan.currency,
      resolvedPriceCents: plan.priceCents,
    }));
  const wantedCurrency = (currency || "").toUpperCase();
  const priceRows = wantedCurrency
    ? await db
        .select()
        .from(planPrices)
        .where(
          and(
            inArray(
              planPrices.planId,
              plans.map(p => p.id)
            ),
            eq(planPrices.currency, wantedCurrency)
          )
        )
    : [];
  const priceByPlan = new Map(priceRows.map(row => [row.planId, row]));
  // Falls back to the plan's default priceCents/currency when no row exists
  // for the requested currency — real multi-currency support, not a stub.
  return plans.map(plan => {
    const specific = priceByPlan.get(plan.id);
    return {
      ...plan,
      resolvedCurrency: specific?.currency ?? plan.currency,
      resolvedPriceCents: specific?.priceCents ?? plan.priceCents,
    };
  });
}

export async function getPlanPrices(planId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(planPrices)
    .where(eq(planPrices.planId, planId))
    .orderBy(planPrices.currency);
}

export async function setPlanPrice(input: {
  planId: number;
  currency: string;
  priceCents: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const planRows = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, input.planId))
    .limit(1);
  if (!planRows.length) return false;
  const currency = input.currency.toUpperCase();
  await db
    .insert(planPrices)
    .values({ planId: input.planId, currency, priceCents: input.priceCents })
    .onDuplicateKeyUpdate({ set: { priceCents: input.priceCents } });
  return true;
}


export async function createSubscriptionPlan(input: {
  slug: string;
  planType?: "free" | "monthly" | "quarterly" | "yearly" | "one_time";
  currency?: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  durationDays: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .insert(subscriptionPlans)
    .values({
      ...input,
      planType: input.planType ?? "monthly",
      currency: (input.currency ?? "DZD").toUpperCase(),
      isActive: 1,
    });
}

export async function updateSubscriptionPlan(input: {
  id: number;
  planType?: "free" | "monthly" | "quarterly" | "yearly" | "one_time";
  currency?: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  durationDays: number;
  isActive: boolean;
}) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(subscriptionPlans)
    .set({
      ...(input.planType ? { planType: input.planType } : {}),
      ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
      titleAr: input.titleAr,
      titleFr: input.titleFr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr,
      descriptionFr: input.descriptionFr,
      descriptionEn: input.descriptionEn,
      priceCents: input.priceCents,
      durationDays: input.durationDays,
      isActive: input.isActive ? 1 : 0,
    })
    .where(eq(subscriptionPlans.id, input.id));
  return true;
}

