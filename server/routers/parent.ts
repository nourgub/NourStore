import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { parentProcedure, rateLimit } from "../_core/procedures";
import { acceptParentInvite, getChildParentLinks, getParentLinks, unlinkParent } from "../db/parent";

// Linking a parent account to a student. The student creates the one-time
// code (bac.createParentCode); what a linked parent sees is served by the
// bac router (bac.parentOverview).
export const parentRouter = router({
  links: parentProcedure.query(({ ctx }) => getParentLinks(ctx.user.id)),
  /** A student: the parents who can see their progress (to unlink one). */
  myParents: protectedProcedure.query(({ ctx }) => getChildParentLinks(ctx.user.id)),
  // Restricted to role=parent (or admin): any other authenticated role must
  // not be able to accept a parent invite.
  acceptInvite: parentProcedure
    .use(rateLimit("parent-invite-accept", 10, 60 * 60 * 1000))
    .input(z.object({ code: z.string().min(6).max(32) }))
    .mutation(({ ctx, input }) => acceptParentInvite(ctx.user.id, input.code)),
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
