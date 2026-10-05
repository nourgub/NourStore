// Real Google Calendar integration for auto-generated Google Meet links on
// a live lesson — a SEPARATE OAuth grant from Google *login*
// (googleAuth.ts): a teacher can sign in with plain email+password and
// still separately "connect Google Calendar" here, because this needs a
// different scope (calendar.events) that login has no reason to request.
//
// Setup required in the same Google Cloud project already used for login
// (see DEPLOYMENT.md):
//   1. Enable the "Google Calendar API" (APIs & Services → Library).
//   2. Add this exact redirect URI to the existing OAuth client:
//      `${your domain}/api/google-calendar/callback`
//   3. Add the `.../auth/calendar.events` scope to the OAuth consent
//      screen's scopes list (Google requires this even for a verified,
//      non-sensitive scope like this one).
// Reuses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — no new env vars.

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./env";
import { authenticateRequest } from "./session";
import * as db from "../db";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";
const CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GCAL_OAUTH_STATE_COOKIE = "__Host-gcal_oauth_state";

function isGoogleConfigured(): boolean {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

function buildRedirectUri(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}/api/google-calendar/callback`;
}

export function registerGoogleCalendarRoutes(app: Express) {
  app.get(
    "/api/google-calendar/connect",
    async (req: Request, res: Response) => {
      if (!isGoogleConfigured()) {
        res
          .status(501)
          .send(
            "Google Calendar is not configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then enable the Calendar API."
          );
        return;
      }
      try {
        // Requires an existing session — this is a teacher connecting
        // their own account, not a login flow.
        await authenticateRequest(req);
      } catch {
        res.status(401).send("Log in first, then connect Google Calendar.");
        return;
      }
      const nonce = crypto.randomUUID();
      res.cookie(GCAL_OAUTH_STATE_COOKIE, nonce, {
        path: "/",
        maxAge: 10 * 60 * 1000,
        sameSite: "none",
        secure: true,
        httpOnly: true,
      });
      const redirectUri = buildRedirectUri(req);
      const url = new URL(GOOGLE_AUTH_ENDPOINT);
      url.searchParams.set("client_id", ENV.googleClientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", `openid email ${CALENDAR_SCOPE}`);
      url.searchParams.set("state", nonce);
      // offline + consent: the only way Google actually issues a
      // refresh_token (needed to create events later without the teacher
      // being present in a browser) is access_type=offline; prompt=consent
      // forces it to be re-issued even if this teacher authorized before
      // and Google would otherwise skip straight to a bare access_token.
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      res.redirect(url.toString());
    }
  );

  app.get(
    "/api/google-calendar/callback",
    async (req: Request, res: Response) => {
      if (!isGoogleConfigured()) {
        res.status(501).send("Google Calendar is not configured.");
        return;
      }
      let user;
      try {
        user = await authenticateRequest(req);
      } catch {
        res.status(401).send("Session expired — log in and try again.");
        return;
      }
      const code =
        typeof req.query.code === "string" ? req.query.code : undefined;
      const state =
        typeof req.query.state === "string" ? req.query.state : undefined;
      if (!code || !state) {
        res.status(400).send("code and state are required");
        return;
      }
      const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
        GCAL_OAUTH_STATE_COOKIE
      ];
      res.clearCookie(GCAL_OAUTH_STATE_COOKIE, { path: "/" });
      if (!expectedNonce || expectedNonce !== state) {
        res.status(403).send("invalid oauth state");
        return;
      }
      try {
        const redirectUri = buildRedirectUri(req);
        const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: ENV.googleClientId,
            client_secret: ENV.googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenResponse.ok) {
          res.status(502).send("Google token exchange failed");
          return;
        }
        const tokens = (await tokenResponse.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };
        if (!tokens.refresh_token) {
          // Happens if the teacher already granted this exact scope before
          // and Google decided not to re-issue one despite prompt=consent
          // (rare, but documented). Nothing usable was stored — surface
          // this rather than silently pretending it connected.
          res
            .status(502)
            .send(
              "Google did not return a refresh token. Revoke this app's access at https://myaccount.google.com/permissions and try connecting again."
            );
          return;
        }
        let googleEmail: string | null = null;
        if (tokens.access_token) {
          const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (userInfoResponse.ok) {
            const info = (await userInfoResponse.json()) as { email?: string };
            googleEmail = info.email ?? null;
          }
        }
        await db.saveGoogleCalendarConnection({
          userId: user.id,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token ?? null,
          accessTokenExpiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          googleEmail,
        });
        res.redirect("/teacher?calendar=connected");
      } catch (error) {
        console.error("[Google Calendar] callback error", error);
        res.status(500).send("Google Calendar connection failed");
      }
    }
  );
}

async function getFreshAccessToken(userId: number): Promise<string | null> {
  const connection = await db.getGoogleCalendarConnection(userId);
  if (!connection) return null;
  if (
    connection.accessToken &&
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return connection.accessToken;
  }
  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) return null;
  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokens.access_token) return null;
  await db.updateGoogleCalendarAccessToken({
    userId,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
  });
  return tokens.access_token;
}

export type CreateMeetEventResult =
  | { ok: true; meetUrl: string }
  | { ok: false; reason: "not_connected" | "google_api_error" };

/** Creates a real Calendar event with a Google Meet link auto-attached, on the teacher's own connected calendar. */
export async function createMeetEvent(input: {
  teacherId: number;
  summary: string;
  startsAt: Date;
  durationMinutes: number;
}): Promise<CreateMeetEventResult> {
  const accessToken = await getFreshAccessToken(input.teacherId);
  if (!accessToken) return { ok: false, reason: "not_connected" };
  const endsAt = new Date(
    input.startsAt.getTime() + input.durationMinutes * 60 * 1000
  );
  const response = await fetch(
    `${CALENDAR_EVENTS_ENDPOINT}?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        start: { dateTime: input.startsAt.toISOString() },
        end: { dateTime: endsAt.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );
  if (!response.ok) {
    console.error(
      "[Google Calendar] event creation failed",
      await response.text().catch(() => "")
    );
    return { ok: false, reason: "google_api_error" };
  }
  const event = (await response.json()) as { hangoutLink?: string };
  if (!event.hangoutLink) return { ok: false, reason: "google_api_error" };
  return { ok: true, meetUrl: event.hangoutLink };
}
