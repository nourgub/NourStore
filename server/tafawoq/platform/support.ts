// Support tickets: a student, parent or teacher writes to the platform
// (category, subject, message); staff answer; every message is kept in the
// ticket's history. A user sees only their own tickets; staff (admins) see
// all. Each reply notifies the other side in the app. No email is sent from
// here (SMTP is only used for password reset).
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { supportTicketMessages, supportTickets, users } from "../../../drizzle/schema";
import { getDb } from "../../db/shared";
import * as bac from "../../db/bacPlatform";
import { logAdminAction } from "../../db/adminAudit";

export const TICKET_CATEGORIES = ["account", "payment", "content", "technical", "sessions", "other"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
const OPEN_TICKETS_MAX = 5;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database not configured" });
  return db;
}

export async function createTicket(userId: number, input: { category: TicketCategory; subject: string; message: string }) {
  const db = await requireDb();
  const open = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(eq(supportTickets.userId, userId), inArray(supportTickets.status, ["open", "in_progress"])));
  if (open.length >= OPEN_TICKETS_MAX) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "TOO_MANY_OPEN_TICKETS" });
  // Payment problems first.
  const priority = input.category === "payment" ? "high" : input.category === "account" ? "medium" : "low";
  return db.transaction(async tx => {
    const [result] = await tx.insert(supportTickets).values({ userId, subject: input.subject, category: input.category, priority });
    const id = (result as { insertId: number }).insertId;
    await tx.insert(supportTicketMessages).values({ ticketId: id, senderId: userId, message: input.message });
    return { id };
  });
}

async function ticketFor(userId: number, ticketId: number, staff: boolean) {
  const db = await requireDb();
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  // Same answer for "does not exist" and "not yours".
  if (!ticket || (!staff && ticket.userId !== userId)) throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
  return ticket;
}

export async function myTickets(userId: number) {
  const db = await requireDb();
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.updatedAt)).limit(50);
}

export async function ticketThread(userId: number, ticketId: number, staff: boolean) {
  const ticket = await ticketFor(userId, ticketId, staff);
  const db = await requireDb();
  const messages = await db
    .select({ id: supportTicketMessages.id, message: supportTicketMessages.message, createdAt: supportTicketMessages.createdAt, senderId: supportTicketMessages.senderId, senderRole: users.role, senderName: users.name })
    .from(supportTicketMessages)
    .leftJoin(users, eq(users.id, supportTicketMessages.senderId))
    .where(eq(supportTicketMessages.ticketId, ticketId))
    .orderBy(asc(supportTicketMessages.id));
  return {
    ticket,
    // Staff names are not shown to users: "the platform" answers.
    messages: messages.map(entry => ({
      id: entry.id,
      message: entry.message,
      createdAt: entry.createdAt,
      mine: entry.senderId === userId,
      fromStaff: entry.senderId !== ticket.userId,
      senderName: staff ? entry.senderName : null,
    })),
  };
}

export async function replyTicket(userId: number, ticketId: number, message: string, staff: boolean) {
  const ticket = await ticketFor(userId, ticketId, staff);
  if (ticket.status === "closed") throw new TRPCError({ code: "CONFLICT", message: "TICKET_CLOSED" });
  const db = await requireDb();
  const fromStaff = staff && userId !== ticket.userId;
  await db.insert(supportTicketMessages).values({ ticketId, senderId: userId, message });
  await db
    .update(supportTickets)
    .set({ lastSenderRole: fromStaff ? "staff" : "user", status: fromStaff ? (ticket.status === "open" ? "in_progress" : ticket.status) : ticket.status === "resolved" ? "open" : ticket.status })
    .where(eq(supportTickets.id, ticketId));
  if (fromStaff) {
    await bac.insertNotifications([{ userId: ticket.userId, type: "support_reply", title: "رد على طلب الدعم", body: `وصلك رد على: ${ticket.subject}` }]);
    await logAdminAction({ actorId: userId, action: "support_reply", targetType: "support_ticket", targetId: String(ticketId) });
  }
  return { ok: true };
}

export async function adminTickets(status: "open" | "in_progress" | "resolved" | "closed") {
  const db = await requireDb();
  return db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      lastSenderRole: supportTickets.lastSenderRole,
      updatedAt: supportTickets.updatedAt,
      userName: users.name,
      userRole: users.role,
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.userId))
    .where(eq(supportTickets.status, status))
    .orderBy(desc(supportTickets.priority), desc(supportTickets.updatedAt))
    .limit(200);
}

export async function adminSetTicket(adminId: number, input: { id: number; status?: "open" | "in_progress" | "resolved" | "closed"; priority?: "low" | "medium" | "high" }) {
  const ticket = await ticketFor(adminId, input.id, true);
  const db = await requireDb();
  await db
    .update(supportTickets)
    .set({ ...(input.status ? { status: input.status } : {}), ...(input.priority ? { priority: input.priority } : {}) })
    .where(eq(supportTickets.id, input.id));
  if (input.status && input.status !== ticket.status && (input.status === "resolved" || input.status === "closed")) {
    await bac.insertNotifications([{ userId: ticket.userId, type: "support_status", title: "طلب الدعم", body: `«${ticket.subject}»: ${input.status === "resolved" ? "عولج" : "أُغلق"}.` }]);
  }
  await logAdminAction({ actorId: adminId, action: "support_status", targetType: "support_ticket", targetId: String(input.id), details: { status: input.status ?? null, priority: input.priority ?? null } });
  return { ok: true };
}
