// Support tickets (server/tafawoq/platform/support.ts): any signed-in user
// writes to the platform about their own problem; admins answer.
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure, rateLimit } from "../_core/procedures";
import * as support from "../tafawoq/platform/support";

const HOUR = 60 * 60 * 1000;
const id = z.number().int().positive();
const message = z.string().trim().min(2).max(4000);

export const supportRouter = router({
  create: protectedProcedure
    .use(rateLimit("support-create", 10, HOUR))
    .input(z.object({ category: z.enum(support.TICKET_CATEGORIES), subject: z.string().trim().min(3).max(200), message }))
    .mutation(({ ctx, input }) => support.createTicket(ctx.user.id, input)),
  mine: protectedProcedure.query(({ ctx }) => support.myTickets(ctx.user.id)),
  thread: protectedProcedure.input(z.object({ id })).query(({ ctx, input }) => support.ticketThread(ctx.user.id, input.id, ctx.user.role === "admin")),
  reply: protectedProcedure
    .use(rateLimit("support-reply", 30, HOUR))
    .input(z.object({ id, message }))
    .mutation(({ ctx, input }) => support.replyTicket(ctx.user.id, input.id, input.message, ctx.user.role === "admin")),
  adminList: adminProcedure
    .input(z.object({ status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open") }))
    .query(({ input }) => support.adminTickets(input.status)),
  adminSet: adminProcedure
    .input(z.object({ id, status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(), priority: z.enum(["low", "medium", "high"]).optional() }))
    .mutation(({ ctx, input }) => support.adminSetTicket(ctx.user.id, input)),
});
