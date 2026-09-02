export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// One-time nonce cookie that binds the Google OAuth login (server/_core/
// googleAuth.ts) to the browser that started it, as a CSRF guard on the
// callback. The `__Host-` prefix forces the cookie host-only (Secure,
// Path=/, no Domain) — a real, standard hardening measure, not specific to
// any particular OAuth provider.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";
