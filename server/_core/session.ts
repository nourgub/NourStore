// Session handling for this app — fully self-contained, no external
// identity provider required. A session is just a signed JWT (HS256, via
// `jose`) carrying an openId, verified against JWT_SECRET. Google OAuth
// (server/_core/googleAuth.ts) and email+password (server/_core/emailAuth.ts)
// both create their own user row directly at their own callback/register
// endpoint, then call createSessionToken() here to mint the cookie — this
// module never needs to know which login method produced the openId, and
// never calls out to any third-party auth server to "resync" a user.

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  name: string;
};

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  return signSession({ openId, name: options.name || "" }, options);
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  return new SignJWT({ openId: payload.openId, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; name: string } | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (!isNonEmptyString(openId)) return null;
    return { openId, name: isNonEmptyString(name) ? name : "" };
  } catch (error) {
    console.warn("[Auth] Session verification failed:", error);
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

/**
 * Resolves the signed-in user for a request: session cookie (primary) or a
 * `Bearer` Authorization header (fallback, for browsers that block iframe
 * cookies — Safari ITP, private browsing, some WebViews). Every user row
 * this looks up was already created directly by whichever login method
 * authenticated them (Google OAuth callback or email/password register) —
 * there is no "auto-provision from an external identity server" step here,
 * because there is no external identity server anymore.
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  let sessionToken = cookies.get(COOKIE_NAME);

  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
    }
  }

  const session = await verifySession(sessionToken);
  if (!session) throw ForbiddenError("Invalid session cookie");

  const user = await db.getUserByOpenId(session.openId);
  if (!user) throw ForbiddenError("User not found");

  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}
