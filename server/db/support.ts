import {
  desc,
  eq,
} from "drizzle-orm";
import {
  users,
  supportTickets,
  supportTicketMessages,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { createNotification } from "./notifications";

export async function createSupportTicket(input: {
  userId: number;
  subject: string;
  message: string;
  priority?: "low" | "medium" | "high";
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db
    .insert(supportTickets)
    .values({
      userId: input.userId,
      subject: input.subject,
      priority: input.priority ?? "medium",
    });
  const inserted = (
    await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, input.userId))
      .orderBy(desc(supportTickets.createdAt))
      .limit(1)
  )[0];
  if (!inserted) return undefined;
  await db
    .insert(supportTicketMessages)
    .values({
      ticketId: inserted.id,
      senderId: input.userId,
      message: input.message,
    });
  return inserted;
}

export async function getUserSupportTickets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.updatedAt));
}

export async function getAllSupportTickets(
  statusFilter?: "open" | "in_progress" | "resolved" | "closed"
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      userName: users.name,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.userId))
    .where(statusFilter ? eq(supportTickets.status, statusFilter) : undefined)
    .orderBy(desc(supportTickets.updatedAt));
}

export async function getTicketMessages(input: {
  ticketId: number;
  requesterId: number;
  role: "learner" | "parent" | "teacher" | "institution" | "admin";
}) {
  const db = await getDb();
  if (!db) return null;
  const ticketRows = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, input.ticketId))
    .limit(1);
  const ticket = ticketRows[0];
  if (!ticket) return null;
  if (input.role !== "admin" && ticket.userId !== input.requesterId)
    return null;
  const messages = await db
    .select({
      id: supportTicketMessages.id,
      senderId: supportTicketMessages.senderId,
      senderName: users.name,
      message: supportTicketMessages.message,
      createdAt: supportTicketMessages.createdAt,
    })
    .from(supportTicketMessages)
    .leftJoin(users, eq(users.id, supportTicketMessages.senderId))
    .where(eq(supportTicketMessages.ticketId, input.ticketId))
    .orderBy(supportTicketMessages.createdAt);
  return { ticket, messages };
}

export async function addSupportTicketMessage(input: {
  ticketId: number;
  senderId: number;
  role: "learner" | "parent" | "teacher" | "institution" | "admin";
  message: string;
}) {
  const db = await getDb();
  if (!db) return false;
  const ticketRows = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      status: supportTickets.status,
    })
    .from(supportTickets)
    .where(eq(supportTickets.id, input.ticketId))
    .limit(1);
  const ticket = ticketRows[0];
  if (!ticket) return false;
  if (input.role !== "admin" && ticket.userId !== input.senderId) return false;
  await db
    .insert(supportTicketMessages)
    .values({
      ticketId: input.ticketId,
      senderId: input.senderId,
      message: input.message,
    });
  // A learner replying to a resolved/closed ticket reopens it; an admin replying moves it to in_progress.
  const nextStatus =
    input.role === "admin"
      ? ("in_progress" as const)
      : ticket.status === "resolved" || ticket.status === "closed"
        ? ("open" as const)
        : ticket.status;
  await db
    .update(supportTickets)
    .set({ status: nextStatus })
    .where(eq(supportTickets.id, input.ticketId));
  if (input.role === "admin")
    await createNotification({
      userId: ticket.userId,
      type: "support",
      title: "notifications.supportReply",
      body: String(input.ticketId),
    });
  return true;
}

export async function updateSupportTicketStatus(
  ticketId: number,
  status: "open" | "in_progress" | "resolved" | "closed"
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(supportTickets)
    .set({ status })
    .where(eq(supportTickets.id, ticketId));
  return true;
}
