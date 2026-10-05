import {
  eq,
} from "drizzle-orm";
import {
  platformSettings,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function getPlatformSetting(key: string) {
    const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setPlatformSetting(key: string, value: string) {
    const db = await getDb();
  if (!db) return false;
  await db
    .insert(platformSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
  return true;
}
