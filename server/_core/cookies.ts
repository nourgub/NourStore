import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // `SameSite=None` is only valid together with `Secure` — per the
    // modern cookie spec (RFC 6265bis), browsers silently reject any
    // cookie that sets SameSite=None without Secure=true (Chrome has
    // enforced this since 2020). This app serves its frontend and API
    // from the same origin (no cross-site requests need SameSite=None at
    // all), so there was never a real reason to hardcode it. The
    // previous unconditional `sameSite: "none"` combined with
    // `secure: isSecureRequest(req)` meant that on any plain-HTTP
    // deployment (local development, or a reverse proxy that doesn't
    // forward X-Forwarded-Proto correctly), the login response would
    // return 200 with the session cookie in an HTTP header, but the
    // browser would discard it — email/password login appeared to
    // succeed while silently never actually signing the person in.
    // Confirmed via a real browser (Chrome + Playwright): the
    // loginWithEmail mutation returned {"ok":true}, yet the very next
    // page load still showed the signed-out state.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
