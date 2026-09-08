import { cookies } from "next/headers";
import { deleteSession, findSession, findTeacherById, insertSession } from "./db";
import { generateToken } from "./auth";
import type { Teacher } from "./types";

export const SESSION_COOKIE = "nourstore_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSessionCookie(teacherId: string) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  insertSession({
    token,
    teacherId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySessionCookie() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentTeacher(): Promise<Teacher | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = findSession(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }
  return findTeacherById(session.teacherId);
}
