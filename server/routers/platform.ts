import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { roleProcedure } from "../_core/procedures";
import {
  getPlatformSetting,
  setPlatformSetting,
  getPendingPaymentReceipts,
  getPaymentReceiptHistory,
  getOverdueInvoicesWithoutReceipt,
  reviewPaymentReceipt,
  logAdminAction,
} from "../db";

export const platformRouter = router({
  whatsapp: publicProcedure.query(async () => {
    const value = await getPlatformSetting("whatsapp_number");
    return typeof value === "string" && value.trim().length > 0
      ? value
      : null;
  }),
  setWhatsapp: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        number: z
          .string()
          .min(8)
          .max(32)
          .regex(/^\+?[0-9 ()-]+$/),
      })
    )
    .mutation(({ input }) =>
      setPlatformSetting(
        "whatsapp_number",
        input.number.replace(/[^0-9]/g, "")
      )
    ),
  socialLinks: publicProcedure.query(async () => ({
    instagram: (await getPlatformSetting("social_instagram_url")) || null,
    facebook: (await getPlatformSetting("social_facebook_url")) || null,
  })),
  setSocialLinks: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        instagram: z.string().url().max(300).optional().or(z.literal("")),
        facebook: z.string().url().max(300).optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input }) => {
      if (input.instagram !== undefined)
        await setPlatformSetting("social_instagram_url", input.instagram);
      if (input.facebook !== undefined)
        await setPlatformSetting("social_facebook_url", input.facebook);
      return true;
    }),
  paymentRib: roleProcedure(["admin"], "Admin access required").query(
    async () => (await getPlatformSetting("payment_rib_details")) || ""
  ),
  setPaymentRib: roleProcedure(["admin"], "Admin access required")
    .input(z.object({ details: z.string().min(4).max(2000) }))
    .mutation(({ input }) =>
      setPlatformSetting("payment_rib_details", input.details)
    ),
  pendingPaymentReceipts: roleProcedure(
    ["admin"],
    "Admin access required"
  ).query(() => getPendingPaymentReceipts()),
  paymentReceiptHistory: roleProcedure(
    ["admin"],
    "Admin access required"
  ).query(() => getPaymentReceiptHistory()),
  overdueInvoices: roleProcedure(
    ["admin"],
    "Admin access required"
  ).query(() => getOverdueInvoicesWithoutReceipt()),
  reviewPaymentReceipt: roleProcedure(["admin"], "Admin access required")
    .input(
      z.object({
        receiptId: z.number().int().positive(),
        approve: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await reviewPaymentReceipt({
        receiptId: input.receiptId,
        approve: input.approve,
        reviewerId: ctx.user.id,
      });
      await logAdminAction({
        actorId: ctx.user.id,
        action: input.approve
          ? "approve_payment_receipt"
          : "reject_payment_receipt",
        targetType: "payment_receipt",
        targetId: input.receiptId,
      });
      return result;
    }),
});
