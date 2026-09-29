import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import { ENV } from "../_core/env";
import {
  getSubscriptionPlans,
  getProductById,
  validateCoupon,
  createInvoice,
  redeemCoupon,
  recordPaymentAttempt,
  getPlatformSetting,
} from "../db";

export const paymentsRouter = router({
  // Prepares a real invoice + payment attempt row, but never marks anything
  // paid — that only ever happens from a verified webhook (see
  // paymentsWebhook.ts) or an admin's manual receipt review (see
  // admin.reviewPaymentReceipt). If no provider is configured, this says
  // so honestly instead of pretending a charge could complete.
  //
  // Handles both checkout kinds through the same reusable manual-payment
  // flow: exactly one of planId (a subscription, platform-wide or
  // course-scoped) or productId (a standalone one-time purchase — a book,
  // the full-book bundle) must be given, matching createInvoice's own
  // discriminated union.
  initiateCheckout: protectedProcedure
    .use(rateLimit("checkout-initiate", 20, 60 * 60 * 1000))
    .input(
      z
        .object({
          planId: z.number().int().positive().optional(),
          productId: z.number().int().positive().optional(),
          currency: z
            .string()
            .length(3)
            .regex(/^[A-Za-z]{3}$/)
            .optional(),
          provider: z.enum(["manual", "whatsapp"]).default("manual"),
          returnUrl: z.string().url().optional(),
          couponCode: z.string().min(2).max(40).optional(),
        })
        .refine(v => (v.planId ? 1 : 0) + (v.productId ? 1 : 0) === 1, {
          message: "Exactly one of planId or productId is required",
        })
    )
    .mutation(async ({ ctx, input }) => {
      let titleAr: string;
      let resolvedCurrency: string;
      let resolvedPriceCents: number;
      let invoiceTarget: { planId: number } | { productId: number };
      if (input.planId) {
        const plans = await getSubscriptionPlans(true, input.currency);
        const plan = plans.find(p => p.id === input.planId);
        if (!plan)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found",
          });
        titleAr = plan.titleAr;
        resolvedCurrency = plan.resolvedCurrency;
        resolvedPriceCents = plan.resolvedPriceCents;
        invoiceTarget = { planId: plan.id };
      } else {
        const product = await getProductById(input.productId!);
        if (!product || product.isActive !== 1)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        titleAr = product.titleAr;
        // Products aren't multi-currency (unlike plans/planPrices) — always
        // charged in the product's own set currency, matching real pricing
        // given by the platform owner.
        resolvedCurrency = product.currency;
        resolvedPriceCents = product.priceCents;
        invoiceTarget = { productId: product.id };
      }
      let finalAmountCents = resolvedPriceCents;
      let appliedCoupon: { id: number; code: string } | null = null;
      let couponMessage: string | undefined;
      if (input.couponCode) {
        const validation = await validateCoupon({
          code: input.couponCode,
          userId: ctx.user.id,
          amountCents: resolvedPriceCents,
        });
        if (validation.ok) {
          finalAmountCents = validation.discountedAmountCents;
          appliedCoupon = {
            id: validation.coupon.id,
            code: validation.coupon.code,
          };
        } else {
          const reasons: Record<typeof validation.reason, string> = {
            not_found: "Coupon code not found.",
            inactive: "This coupon is no longer active.",
            not_yet_valid: "This coupon is not valid yet.",
            expired: "This coupon has expired.",
            max_redemptions_reached:
              "This coupon has reached its usage limit.",
            already_redeemed_by_user: "You have already used this coupon.",
          };
          couponMessage = reasons[validation.reason];
        }
      }
      const invoice = await createInvoice({
        userId: ctx.user.id,
        ...invoiceTarget,
        currency: resolvedCurrency,
        amountCents: finalAmountCents,
        provider: input.provider,
      });
      if (!invoice)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Checkout unavailable",
        });
      if (appliedCoupon)
        await redeemCoupon({
          couponId: appliedCoupon.id,
          userId: ctx.user.id,
          invoiceId: invoice.id,
        });
      if (input.provider === "whatsapp") {
        // wa.me links require zero API credentials — this always works as
        // long as an admin has saved a WhatsApp contact number. The bot
        // reply (RIB details) only fires once the learner actually sends
        // this pre-filled message and the Cloud API bot is configured
        // separately — see whatsappBot.ts.
        const whatsappNumber = await getPlatformSetting("whatsapp_number");
        if (!whatsappNumber) {
          return {
            invoice,
            providerConfigured: false,
            redirectUrl: null,
            message:
              "No WhatsApp contact number has been configured yet; an admin can grant access manually in the meantime.",
            couponMessage,
            appliedCoupon: appliedCoupon?.code,
          };
        }
        const prefilledText = encodeURIComponent(
          `مرحبًا، أريد الدفع لـ ${titleAr} — المرجع: NX-INV-${invoice.id} — المبلغ: ${(finalAmountCents / 100).toLocaleString("ar-DZ")} ${resolvedCurrency}`
        );
        return {
          invoice,
          providerConfigured: true,
          redirectUrl: `https://wa.me/${whatsappNumber}?text=${prefilledText}`,
          message: undefined,
          couponMessage,
          appliedCoupon: appliedCoupon?.code,
        };
      }
      return {
        invoice,
        providerConfigured: Boolean(ENV.paymentProvider),
        redirectUrl: null,
        message: ENV.paymentProvider
          ? undefined
          : "No live payment provider is configured on this deployment yet; an admin can grant access manually in the meantime.",
        couponMessage,
        appliedCoupon: appliedCoupon?.code,
      };
    }),
});
