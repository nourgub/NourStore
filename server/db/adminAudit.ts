import { desc, eq } from "drizzle-orm";
import { users, adminAuditLog } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function logAdminAction(input: {
  actorId: number;
  action: string;
  targetType?: string;
  targetId?: string | number;
  details?: Record<string, unknown>;
}): Promise<void> {
    const db = await getDb();
  if (!db) return;
  try {
    await db.insert(adminAuditLog).values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId !== undefined ? String(input.targetId) : undefined,
      detailsJson: input.details ? JSON.stringify(input.details) : undefined,
    });
  } catch (error) {
    // Never let a logging failure break the real action it's describing.
    console.error("[AuditLog] failed to record admin action:", input.action, error);
  }
}

export async function getAdminAuditLog(input: { limit?: number; action?: string } = {}) {
    const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: adminAuditLog.id,
      actorId: adminAuditLog.actorId,
      actorName: users.name,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      detailsJson: adminAuditLog.detailsJson,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(users.id, adminAuditLog.actorId))
    .where(input.action ? eq(adminAuditLog.action, input.action) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(Math.min(input.limit ?? 100, 500));
  return rows;
}
