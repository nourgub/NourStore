import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import { ENV } from "../_core/env";
import { initiateBaridimobCheckout } from "../baridimobProvider";
import { initiateSlickpayCheckout } from "../slickpayProvider";
import { initiateChargilyCheckout } from "../chargilyProvider";
import {
  getSubscriptionPlans,
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
  initiateCheckout: protectedProcedure
    .use(rateLimit("checkout-initiate", 20, 60 * 60 * 1000))
    .input(
      z.object({
        planId: z.number().int().positive(),
        currency: z
          .string()
          .length(3)
          .regex(/^[A-Za-z]{3}$/),
        provider: z
          .enum(["manual", "baridimob", "slickpay", "chargily", "whatsapp"])
          .default("manual"),
        returnUrl: z.string().url().optional(),
        couponCode: z.string().min(2).max(40).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plans = await getSubscriptionPlans(true, input.currency);
      const plan = plans.find(p => p.id === input.planId);
      if (!plan)
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      let finalAmountCents = plan.resolvedPriceCents;
      let appliedCoupon: { id: number; code: string } | null = null;
      let couponMessage: string | undefined;
      if (input.couponCode) {
        const validation = await validateCoupon({
          code: input.couponCode,
          userId: ctx.user.id,
          amountCents: plan.resolvedPriceCents,
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
        planId: plan.id,
        currency: plan.resolvedCurrency,
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
      if (input.provider === "baridimob") {
        const checkout = await initiateBaridimobCheckout({
          invoiceId: invoice.id,
          amountCents: finalAmountCents,
          currency: plan.resolvedCurrency,
          returnUrl: input.returnUrl || "",
        });
        if (!checkout.ok) {
          // Never fakes success: the invoice stays "pending" and the person is told exactly why the redirect isn't available yet.
          return {
            invoice,
            providerConfigured: false,
            redirectUrl: null,
            message: checkout.message,
            couponMessage,
            appliedCoupon: appliedCoupon?.code,
          };
        }
        await recordPaymentAttempt({
          invoiceId: invoice.id,
          provider: "baridimob",
          providerReference: checkout.providerReference,
          status: "pending",
        });
        return {
          invoice,
          providerConfigured: true,
          redirectUrl: checkout.redirectUrl,
          message: undefined,
          couponMessage,
          appliedCoupon: appliedCoupon?.code,
        };
      }
      if (input.provider === "slickpay") {
        const checkout = await initiateSlickpayCheckout({
          invoiceId: invoice.id,
          amountCents: finalAmountCents,
          currency: plan.resolvedCurrency,
          returnUrl: input.returnUrl || "",
        });
        if (!checkout.ok) {
          // Never fakes success: the invoice stays "pending" and the person is told exactly why the redirect isn't available yet.
          return {
            invoice,
            providerConfigured: false,
            redirectUrl: null,
            message: checkout.message,
            couponMessage,
            appliedCoupon: appliedCoupon?.code,
          };
        }
        await recordPaymentAttempt({
          invoiceId: invoice.id,
          provider: "slickpay",
          providerReference: checkout.providerReference,
          status: "pending",
        });
        return {
          invoice,
          providerConfigured: true,
          redirectUrl: checkout.redirectUrl,
          message: undefined,
          couponMessage,
          appliedCoupon: appliedCoupon?.code,
        };
      }
      if (input.provider === "chargily") {
        const checkout = await initiateChargilyCheckout({
          invoiceId: invoice.id,
          amountCents: finalAmountCents,
          currency: plan.resolvedCurrency,
          returnUrl: input.returnUrl || "",
        });
        if (!checkout.ok) {
          // Never fakes success: the invoice stays "pending" and the person is told exactly why the redirect isn't available yet.
          return {
            invoice,
            providerConfigured: false,
            redirectUrl: null,
            message: checkout.message,
            couponMessage,
            appliedCoupon: appliedCoupon?.code,
          };
        }
        await recordPaymentAttempt({
          invoiceId: invoice.id,
          provider: "chargily",
          providerReference: checkout.providerReference,
          status: "pending",
        });
        return {
          invoice,
          providerConfigured: true,
          redirectUrl: checkout.redirectUrl,
          message: undefined,
          couponMessage,
          appliedCoupon: appliedCoupon?.code,
        };
      }
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
          `مرحبًا، أريد الدفع للاشتراك في ${plan.titleAr} — المرجع: NX-INV-${invoice.id} — المبلغ: ${(finalAmountCents / 100).toLocaleString("ar-DZ")} ${plan.resolvedCurrency}`
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
