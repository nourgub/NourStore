// Request guards that apply to the whole app.
//
// Cross-site request forgery: the session cookie is SameSite=None on HTTPS
// (the app must work inside an embedded preview), so a browser sends it with
// requests started by other sites. Browsers always send an Origin header on
// cross-site POST/PUT/PATCH/DELETE: such a request is accepted only when its
// Origin is this site (the request's own host, or APP_BASE_URL /
// TAFAWOQ_ALLOWED_ORIGINS). Requests without an Origin (same-origin GETs,
// server-to-server calls, curl) are unaffected.
//
// Security headers: conservative ones that do not break the app (no
// script-src CSP: the page has inline bootstrap code).
import type { NextFunction, Request, Response } from "express";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigins(req: Request): Set<string> {
  const allowed = new Set<string>();
  // The host the browser used: Host, or X-Forwarded-Host behind a proxy (Replit, a PaaS).
  for (const host of [req.get("host"), ...(req.get("x-forwarded-host") || "").split(",")]) {
    const name = (host || "").trim();
    if (!name) continue;
    allowed.add(`https://${name}`);
    allowed.add(`http://${name}`);
  }
  for (const value of [process.env.APP_BASE_URL, ...(process.env.TAFAWOQ_ALLOWED_ORIGINS || "").split(",")]) {
    const trimmed = (value || "").trim().replace(/\/+$/, "");
    if (!trimmed) continue;
    try {
      allowed.add(new URL(trimmed).origin);
    } catch {
      // ignore a malformed entry
    }
  }
  return allowed;
}

export function isCrossSiteWrite(req: Request): boolean {
  if (!UNSAFE.has(req.method)) return false;
  const origin = req.get("origin");
  if (!origin || origin === "null") return Boolean(origin); // "null": sandboxed/opaque origin → refused
  return !allowedOrigins(req).has(origin.replace(/\/+$/, ""));
}

export function requestGuard(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=(), microphone=(self)");
  res.setHeader("Content-Security-Policy", "object-src 'none'; base-uri 'self'; form-action 'self'");
  if (req.path.startsWith("/api/") && isCrossSiteWrite(req)) {
    res.status(403).json({ error: "CROSS_SITE_REQUEST" });
    return;
  }
  next();
}
