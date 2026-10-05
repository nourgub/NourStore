import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import {
  createSupportTicket,
  getUserSupportTickets,
  getTicketMessages,
  addSupportTicketMessage,
} from "../db";

export const supportRouter = router({
  createTicket: protectedProcedure
    .use(rateLimit("support-ticket-create", 10, 60 * 60 * 1000))
    .input(
      z.object({
        subject: z.string().min(3).max(255),
        message: z.string().min(3).max(5000),
        priority: z.enum(["low", "medium", "high"]).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createSupportTicket({ userId: ctx.user.id, ...input })
    ),
  myTickets: protectedProcedure.query(({ ctx }) =>
    getUserSupportTickets(ctx.user.id)
  ),
  ticketMessages: protectedProcedure
    .input(z.object({ ticketId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const result = await getTicketMessages({
        ticketId: input.ticketId,
        requesterId: ctx.user.id,
        role: ctx.user.role,
      });
      if (!result)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this ticket",
        });
      return result;
    }),
  addMessage: protectedProcedure
    .use(rateLimit("support-ticket-reply", 30, 60 * 60 * 1000))
    .input(
      z.object({
        ticketId: z.number().int().positive(),
        message: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ok = await addSupportTicketMessage({
        ticketId: input.ticketId,
        senderId: ctx.user.id,
        role: ctx.user.role,
        message: input.message,
      });
      if (!ok)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this ticket",
        });
      return { ok: true };
    }),
});
