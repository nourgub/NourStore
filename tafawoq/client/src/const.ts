export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start login. Call this from an event handler or effect at the moment you
// want to navigate, e.g. `onClick={() => startLogin()}`.
//
// Google OAuth (server/_core/googleAuth.ts) is the only third-party login
// path — email+password (server/_core/emailAuth.ts, at /login and
// /register) works regardless of this and needs no external provider at
// all. There is no other identity service involved.
export const startLogin = () => {
  window.location.href = "/api/auth/google/login";
};
