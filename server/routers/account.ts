// The signed-in user's own data: export it, ask for the account to be
// deleted. Deletion is confirmed by an admin (server/db/accountData.ts says
// what is erased and what is kept).
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure, rateLimit } from "../_core/procedures";
import { storageDelete } from "../storage";
import * as accountData from "../db/accountData";
import { logAdminAction } from "../db/adminAudit";
import { logEvent } from "../db/bacPlatform";

const HOUR = 60 * 60 * 1000;

export const accountRouter = router({
  exportMyData: protectedProcedure
    .use(rateLimit("account-export", 5, HOUR))
    .mutation(async ({ ctx }) => {
      const data = await accountData.exportUserData(ctx.user.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
      await logEvent(ctx.user.id, "data_exported", {});
      return data;
    }),

  myRequests: protectedProcedure.query(({ ctx }) => accountData.myAccountRequests(ctx.user.id)),

  requestDeletion: protectedProcedure
    .use(rateLimit("account-delete-request", 5, HOUR))
    .input(z.object({ note: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "ADMIN_ACCOUNT" });
      const opened = await accountData.openDeletionRequest(ctx.user.id, input.note || null);
      if (!opened) throw new TRPCError({ code: "CONFLICT", message: "PENDING_EXISTS" });
      await logEvent(ctx.user.id, "deletion_requested", {});
      return { ok: true };
    }),

  cancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    await accountData.cancelDeletionRequest(ctx.user.id);
    return { ok: true };
  }),
});

export const accountAdminRouter = router({
  requests: adminProcedure
    .input(z.object({ status: z.enum(["open", "done", "rejected"]).optional() }))
    .query(({ input }) => accountData.listAccountRequests(input.status)),

  /** Erases the account (anonymise) or refuses the request. Safe to repeat: a handled request is refused. */
  resolve: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        action: z.enum(["anonymize", "reject"]),
        note: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await accountData.getAccountRequest(input.id);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
      if (request.status !== "open") throw new TRPCError({ code: "CONFLICT", message: "ALREADY_HANDLED" });
      if (input.action === "reject") {
        if (!input.note) throw new TRPCError({ code: "BAD_REQUEST", message: "NOTE_REQUIRED" });
        if (!(await accountData.resolveAccountRequest(input.id, ctx.user.id, "rejected", input.note)))
          throw new TRPCError({ code: "CONFLICT", message: "ALREADY_HANDLED" });
        await logAdminAction({ actorId: ctx.user.id, action: "account_request_rejected", targetType: "user", targetId: request.userId, details: { requestId: input.id } });
        return { ok: true };
      }
      if (request.kind !== "delete") throw new TRPCError({ code: "BAD_REQUEST", message: "NOT_A_DELETION" });
      if ((await accountData.userRole(request.userId)) === "admin")
        throw new TRPCError({ code: "BAD_REQUEST", message: "ADMIN_ACCOUNT" });
      // Claim the request first so two admins can't run it twice.
      if (!(await accountData.resolveAccountRequest(input.id, ctx.user.id, "done", input.note || null)))
        throw new TRPCError({ code: "CONFLICT", message: "ALREADY_HANDLED" });
      const { photoKeys } = await accountData.anonymizeUser(request.userId);
      let photosLeft = 0;
      for (const key of photoKeys) {
        try {
          await storageDelete(key);
        } catch (error) {
          photosLeft += 1;
          console.warn("[account] photo not deleted:", error instanceof Error ? error.message : error);
        }
      }
      await logAdminAction({
        actorId: ctx.user.id,
        action: "account_anonymized",
        targetType: "user",
        targetId: request.userId,
        details: { requestId: input.id, photosDeleted: photoKeys.length - photosLeft, photosLeft },
      });
      return { ok: true, photosDeleted: photoKeys.length - photosLeft, photosLeft };
    }),
});
