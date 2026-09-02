// Google OAuth 2.0 login — a real, standard, publicly documented flow
// (accounts.google.com authorization endpoint + oauth2.googleapis.com token
// endpoint + the OpenID Connect userinfo endpoint). This is the default,
// primary login path for this app; email+password (emailAuth.ts) is the
// zero-external-service alternative.
//
// Setup required (see DEPLOYMENT.md): create OAuth 2.0 credentials in the
// Google Cloud Console, set the authorized redirect URI to
// `${your domain}/api/auth/google/callback`, and set GOOGLE_CLIENT_ID /
// GOOGLE_CLIENT_SECRET.

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { parse as parseCookieHeader } from "cookie";
import { OAUTH_STATE_COOKIE, COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken } from "./session";
import * as db from "../db";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";

function isGoogleConfigured(): boolean {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret);
}

function buildRedirectUri(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/login", (req: Request, res: Response) => {
    if (!isGoogleConfigured()) {
      // Fails honestly instead of redirecting into a broken OAuth flow.
      res
        .status(501)
        .send(
          "Google sign-in is not configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        );
      return;
    }
    const nonce = crypto.randomUUID();
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
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
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", nonce);
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    res.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    if (!isGoogleConfigured()) {
      res
        .status(501)
        .send("Google sign-in is not configured on this deployment.");
      return;
    }
    const code =
      typeof req.query.code === "string" ? req.query.code : undefined;
    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce must match the one-time cookie set at /login.
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
      OAUTH_STATE_COOKIE
    ];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    if (!expectedNonce || expectedNonce !== state) {
      res.status(403).json({ error: "invalid oauth state" });
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
        res.status(502).json({ error: "Google token exchange failed" });
        return;
      }
      const tokens = (await tokenResponse.json()) as { access_token?: string };
      if (!tokens.access_token) {
        res
          .status(502)
          .json({ error: "Google did not return an access token" });
        return;
      }

      const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!userInfoResponse.ok) {
        res.status(502).json({ error: "Failed to fetch Google user info" });
        return;
      }
      const googleUser = (await userInfoResponse.json()) as {
        sub?: string;
        email?: string;
        name?: string;
      };
      if (!googleUser.sub) {
        res.status(400).json({ error: "Google user info missing sub" });
        return;
      }

      // Prefixed so a Google-issued id is namespaced distinctly from an
      // email/password-issued id (see emailAuth.ts's emailOpenId()).
      const openId = `google_${googleUser.sub}`;
      const signedInAt = new Date();
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: signedInAt,
      });

      const sessionToken = await createSessionToken(openId, {
        name: googleUser.name || "",
      });
      res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions(req));
      res.redirect("/");
    } catch (error) {
      console.error("[Google Auth] callback error", error);
      res.status(500).json({ error: "Google sign-in failed" });
    }
  });
}
