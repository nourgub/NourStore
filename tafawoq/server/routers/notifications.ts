import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getUserNotifications, markNotificationRead } from "../db";

export const notificationsRouter = router({
  mine: protectedProcedure.query(({ ctx }) =>
    getUserNotifications(ctx.user.id)
  ),
  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      markNotificationRead({ id: input.id, userId: ctx.user.id })
    ),
});
