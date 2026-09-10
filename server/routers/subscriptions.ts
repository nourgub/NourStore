import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { roleProcedure, rateLimit } from "../_core/procedures";
import {
  getSubscriptionPlans,
  getUserSubscription,
  cancelActiveSubscription,
  getUserInvoices,
  getPlatformSetting,
  submitDirectPaymentReceipt,
  getSubscriptionMembers,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  assignSubscription,
  logAdminAction,
  getPlanPrices,
  setPlanPrice,
} from "../db";

export const subscriptionsRouter = router({
  plans: publicProcedure
    .input(
      z
        .object({
          currency: z
            .string()
            .length(3)
            .regex(/^[A-Za-z]{3}$/)
            .optional(),
        })
        .optional()
    )
    .query(({ input }) => getSubscriptionPlans(true, input?.currency)),
  managedPlans: roleProcedure(["admin"], "Admin access required").query(() =>
    getSubscriptionPlans(false)
  ),
  mine: protectedProcedure.query(({ ctx }) =>
    getUserSubscription(ctx.user.id)
  ),
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await cancelActiveSubscription(ctx.user.id);
    if (!result.ok)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "You don't have an active subscription to cancel.",
      });
    return result;
  }),
  myInvoices: protectedProcedure.query(({ ctx }) =>
    getUserInvoices(ctx.user.id)
  ),
  paymentRib: protectedProcedure.query(
    async () => (await getPlatformSetting("payment_rib_details")) || ""
  ),
  uploadPaymentReceipt: protectedProcedure
    .use(rateLimit("upload-payment-receipt", 10, 60 * 60 * 1000))
    .input(
      z.object({
        invoiceId: z.number().int().positive(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        sizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
        data: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await submitDirectPaymentReceipt({
        invoiceId: input.invoiceId,
        userId: ctx.user.id,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        data: input.data,
      });
      if (!result.ok) {
        const messages: Record<string, string> = {
          invoice_not_found: "Invoice not found.",
          invoice_not_pending:
            "This invoice is no longer pending — it may already be paid or expired.",
          duplicate_receipt:
            "This exact receipt image has already been submitted before. Please upload a new, real transfer receipt.",
        };
        throw new TRPCError({
          code:
            result.reason === "invoice_not_found" ? "NOT_FOUND" : "BAD_REQUEST",
          message: messages[result.reason] || "Upload rejected: " + result.reason,
        });
      }
      return result;
    }),
  members: roleProcedure(["admin"], "Admin access required").query(() =>
    getSubscriptionMembers()
  ),
  createPlan: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        slug: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/),
        planType: z
          .enum(["free", "monthly", "quarterly", "yearly", "one_time"])
          .optional(),
        currency: z
          .string()
          .length(3)
          .regex(/^[A-Za-z]{3}$/)
          .optional(),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        descriptionAr: z.string().min(2),
        descriptionFr: z.string().min(2),
        descriptionEn: z.string().min(2),
        priceCents: z.number().int().min(0).max(100000000),
        durationDays: z.number().int().min(1).max(3650),
      })
    )
    .mutation(({ input }) => createSubscriptionPlan(input)),
  updatePlan: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        id: z.number().int().positive(),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        descriptionAr: z.string().min(2),
        descriptionFr: z.string().min(2),
        descriptionEn: z.string().min(2),
        priceCents: z.number().int().min(0).max(100000000),
        durationDays: z.number().int().min(1).max(3650),
        isActive: z.boolean(),
      })
    )
    .mutation(({ input }) => updateSubscriptionPlan(input)),
  assign: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        userId: z.number().int().positive(),
        planId: z.number().int().positive(),
        durationDays: z.number().int().min(1).max(3650),
        status: z.enum(["trialing", "active", "paused"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await assignSubscription(input);
      if (!result.ok) {
        if (result.reason === "user_not_found")
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        if (result.reason === "plan_not_found")
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Plan not found",
          });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Assignment unavailable",
        });
      }
      await logAdminAction({
        actorId: ctx.user.id,
        action: "assign_subscription",
        targetType: "user",
        targetId: input.userId,
        details: {
          planId: input.planId,
          durationDays: input.durationDays,
          status: input.status,
        },
      });
      return result;
    }),
  planPrices: roleProcedure(["admin"], "Admin access required")
    .input(z.object({ planId: z.number().int().positive() }))
    .query(({ input }) => getPlanPrices(input.planId)),
  setPlanPrice: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        planId: z.number().int().positive(),
        currency: z
          .string()
          .length(3)
          .regex(/^[A-Za-z]{3}$/),
        priceCents: z.number().int().min(0).max(100000000),
      })
    )
    .mutation(({ input }) => setPlanPrice(input)),
});
