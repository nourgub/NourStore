import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { parentProcedure, adminProcedure, rateLimit } from "../_core/procedures";
import {
  getParentLinks,
  getParentDashboard,
  getReportsForParent,
  createParentInvite,
  acceptParentInvite,
  unlinkParent,
} from "../db";

export const parentRouter = router({
  links: parentProcedure.query(({ ctx }) => getParentLinks(ctx.user.id)),
  dashboard: parentProcedure.query(({ ctx }) =>
    getParentDashboard(ctx.user.id)
  ),
  reports: parentProcedure.query(({ ctx }) => getReportsForParent(ctx.user.id)),
  createInvite: adminProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const invite = await createParentInvite(input.childId);
      if (!invite)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Child account not found",
        });
      return invite;
    }),
  // Restricted to role=parent (or admin), matching the brief exactly: any other
  // authenticated role must not be able to accept a parent invite.
  acceptInvite: parentProcedure
    .use(rateLimit("parent-invite-accept", 10, 60 * 60 * 1000))
    .input(z.object({ code: z.string().min(6).max(32) }))
    .mutation(({ ctx, input }) =>
      acceptParentInvite(ctx.user.id, input.code)
    ),
  unlink: protectedProcedure
    .input(z.object({ linkId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      unlinkParent({
        linkId: input.linkId,
        requesterId: ctx.user.id,
        role: ctx.user.role,
      })
    ),
});
