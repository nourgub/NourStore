import { eq } from "drizzle-orm";
import { googleCalendarConnections } from "../../drizzle/schema";
import { getDb } from "./shared";

export async function getGoogleCalendarConnection(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  return rows[0];
}

export async function saveGoogleCalendarConnection(input: {
  userId: number;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  googleEmail: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(googleCalendarConnections)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        refreshToken: input.refreshToken,
        accessToken: input.accessToken,
        accessTokenExpiresAt: input.accessTokenExpiresAt,
        googleEmail: input.googleEmail,
      },
    });
}

export async function updateGoogleCalendarAccessToken(input: {
  userId: number;
  accessToken: string;
  accessTokenExpiresAt: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(googleCalendarConnections)
    .set({
      accessToken: input.accessToken,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
    })
    .where(eq(googleCalendarConnections.userId, input.userId));
}

export async function disconnectGoogleCalendar(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId));
  return true;
}

export async function getGoogleCalendarStatus(userId: number) {
  const connection = await getGoogleCalendarConnection(userId);
  return {
    connected: Boolean(connection),
    googleEmail: connection?.googleEmail ?? null,
  };
}
