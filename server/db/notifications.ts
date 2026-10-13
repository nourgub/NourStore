import { notifications } from "../../drizzle/schema";

// In-app notifications (the bell in Tafawoq). Reading them is served by
// bac.myNotifications (server/db/bacPlatform.ts).
import { getDb } from "./shared";

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
    });
}
