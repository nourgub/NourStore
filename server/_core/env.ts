export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Bootstrap mechanism for the very first admin account: whichever user's
  // openId matches this exactly gets granted "admin" on their next sign-in
  // (see server/db/usersAuth.ts). Deliberately provider-agnostic — works
  // the same whether that openId came from Google OAuth or email/password.
  // Every other admin promotion after that must go through a manual role
  // update by an existing admin — nobody can grant themselves "admin".
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Payment provider abstraction — unset by default. No provider is wired up
  // in this codebase; these exist so a real integration can be dropped in
  // without touching the invoice/subscription model. See DEPLOYMENT.md.
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  // BaridiMob / Algérie Poste (BaridiWEB) merchant credentials. Algérie
  // Poste does not publish a public self-serve API — these values only
  // exist once a real merchant agreement has been signed via
  // https://baridiweb.poste.dz and Algérie Poste has issued integration
  // details directly. Until all three are set, the BaridiMob provider
  // reports itself as unconfigured rather than attempting a fake charge.
  baridimobMerchantId: process.env.BARIDIMOB_MERCHANT_ID ?? "",
  baridimobApiKey: process.env.BARIDIMOB_API_KEY ?? "",
  baridimobApiBaseUrl: process.env.BARIDIMOB_API_BASE_URL ?? "",
  // WhatsApp Cloud API (Meta) — unlike BaridiMob, this is a real public API
  // (developers.facebook.com/docs/whatsapp/cloud-api). Still requires a
  // real Meta Business/WhatsApp Business Platform setup: a verified phone
  // number, a permanent access token, and a webhook verify token you choose.
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  // Meta's App Secret — used to verify the X-Hub-Signature-256 header on
  // every inbound webhook POST, exactly like Stripe/PAYMENT_WEBHOOK_SECRET
  // below. Without it, anyone who discovers the webhook URL could send
  // forged "payment receipt" messages; this is not optional for a real,
  // live WhatsApp Business integration (Meta requires an App Secret to
  // exist regardless — this just also uses it for verification).
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  // Auth provider — "google" (default) is a real, standard Google OAuth 2.0
  // flow (server/_core/googleAuth.ts). "email" restricts the main sign-in
  // button to the built-in email+password forms only (server/_core/
  // emailAuth.ts, which work either way regardless of this setting).
  // There is no third-party identity service involved in either path.
  authProvider: process.env.AUTH_PROVIDER ?? "google",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Storage provider abstraction — "local" (default) writes to this
  // server's own disk, zero external service. "s3" switches to any
  // S3-compatible object storage. See server/storageProviders/.
  storageProvider: process.env.STORAGE_PROVIDER ?? "local",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3Endpoint: process.env.S3_ENDPOINT ?? "", // leave empty for real AWS S3; set for R2/B2/MinIO
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "", // public CDN/bucket URL prefix used to build download links
  // Rate limiting: unset (default) uses the original in-memory limiter,
  // correct for a single server instance. Set REDIS_URL to make rate
  // limits correct across multiple instances behind a load balancer —
  // Redis can be self-hosted with zero external account, see the `redis`
  // service in docker-compose.yml.
  redisUrl: process.env.REDIS_URL ?? "",
  // Scheduled jobs (cron): unset by default. The app exposes real HTTP
  // endpoints under /api/scheduled/* (server/scheduledJobs.ts) that any
  // external scheduler can call — a self-hosted cron container (see the
  // `cron` service in docker-compose.yml), a plain crontab line, or a
  // GitHub Actions scheduled workflow. Until CRON_SECRET is set, those
  // endpoints refuse to run anything (501) rather than silently accepting
  // unauthenticated requests that trigger real notifications.
  cronSecret: process.env.CRON_SECRET ?? "",
};

// ---------------------------------------------------------------------------
// Startup validation — called once, at process start, from server/_core/
// index.ts's startServer(). Two severities only:
//
//   FATAL   — the process cannot run safely or correctly with this value
//             missing/invalid. Logged clearly and the process exits(1)
//             instead of serving traffic in a broken or insecure state.
//   WARNING — a real feature will be degraded (already handled gracefully
//             at the call site — see the comments above on each ENV field)
//             but the server can still run. Logged once at startup instead
//             of only being discoverable later via /api/health or a
//             confusing runtime error.
//
// This deliberately does NOT require every optional integration (payment
// providers, S3, Redis, WhatsApp, cron) — the app's whole design is to
// degrade those honestly rather than pretend they're configured. What it
// DOES enforce is that nothing here silently produces an insecure or
// nonsensical deployment.
// ---------------------------------------------------------------------------
export type EnvCheckResult = {
  fatal: string[];
  warnings: string[];
};

export function checkEnv(): EnvCheckResult {
  const fatal: string[] = [];
  const warnings: string[] = [];

  if (!ENV.cookieSecret || ENV.cookieSecret.length < 16) {
    // Sessions are signed JWTs (see server/_core/session.ts). An empty or
    // trivially short secret means every session cookie is forgeable —
    // this is a security-critical, not cosmetic, misconfiguration.
    fatal.push(
      "JWT_SECRET is missing or shorter than 16 characters. Session cookies " +
        "would be signed with a weak/empty secret, making them forgeable. " +
        "Set a long, random JWT_SECRET before starting the server."
    );
  }

  if (!ENV.databaseUrl) {
    if (ENV.isProduction) {
      fatal.push(
        "DATABASE_URL is not set. In production this means every database " +
          "read/write is silently skipped (see server/db/shared.ts's getDb()) " +
          "— the app would appear to run while doing nothing real. Set " +
          "DATABASE_URL to a real MySQL connection string."
      );
    } else {
      warnings.push(
        "DATABASE_URL is not set. Running in a degraded, DB-less mode — " +
          "fine for some local checks, not for anything that touches real " +
          "data. Set DATABASE_URL to develop or test against real MySQL."
      );
    }
  }

  if (ENV.authProvider === "google" && (!ENV.googleClientId || !ENV.googleClientSecret)) {
    warnings.push(
      "AUTH_PROVIDER is \"google\" but GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET " +
        "are not both set — Google sign-in will not work. Email/password " +
        "sign-in is unaffected. Set both, or set AUTH_PROVIDER=email."
    );
  }

  if (ENV.storageProvider === "s3") {
    const missing = [
      ["S3_BUCKET", ENV.s3Bucket],
      ["S3_ACCESS_KEY_ID", ENV.s3AccessKeyId],
      ["S3_SECRET_ACCESS_KEY", ENV.s3SecretAccessKey],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
    if (missing.length) {
      fatal.push(
        `STORAGE_PROVIDER is "s3" but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not set. ` +
          "File uploads would fail outright. Set the missing S3 variables, or set STORAGE_PROVIDER=local."
      );
    }
  }

  if (ENV.isProduction && !ENV.cronSecret) {
    warnings.push(
      "CRON_SECRET is not set. Scheduled jobs (/api/scheduled/*) will refuse " +
        "to run (501) — certificate reminders, subscription expiry, etc. " +
        "will not fire automatically until it is set."
    );
  }

  if (ENV.isProduction && !ENV.ownerOpenId) {
    warnings.push(
      "OWNER_OPEN_ID is not set. No account can be auto-promoted to admin " +
        "on first sign-in — the first admin must be granted directly in the " +
        "database. This is safe, just worth knowing before launch."
    );
  }

  return { fatal, warnings };
}

/**
 * Runs checkEnv() and exits the process on any fatal finding. Called once
 * at the very top of startServer(). Never silent: every finding, fatal or
 * not, is printed before the process continues or exits.
 */
export function assertEnvOrExit(): void {
  const { fatal, warnings } = checkEnv();
  for (const message of warnings) {
    // eslint-disable-next-line no-console
    console.warn(`[env] WARNING: ${message}`);
  }
  if (fatal.length) {
    // eslint-disable-next-line no-console
    console.error(
      "[env] Server startup aborted — fix the following before starting:\n" +
        fatal.map(message => `  - ${message}`).join("\n")
    );
    process.exit(1);
  }
}
