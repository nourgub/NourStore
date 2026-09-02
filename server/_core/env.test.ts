import { describe, it, expect, vi } from "vitest";

// checkEnv() reads process.env at call time via the ENV object, which is
// itself built once at module load from process.env. vi.resetModules()
// forces a fresh module instance (and therefore a fresh ENV snapshot) for
// each combination under test.
async function loadCheckEnvWith(vars: Record<string, string | undefined>) {
  const keys = [
    "JWT_SECRET",
    "DATABASE_URL",
    "NODE_ENV",
    "AUTH_PROVIDER",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "STORAGE_PROVIDER",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "CRON_SECRET",
    "OWNER_OPEN_ID",
  ];
  const previous: Record<string, string | undefined> = {};
  for (const key of keys) previous[key] = process.env[key];
  for (const key of keys) delete process.env[key];
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) process.env[key] = value;
  }
  vi.resetModules();
  const mod = await import("./env");
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key]!;
  }
  return mod.checkEnv as () => { fatal: string[]; warnings: string[] };
}

describe("server startup env validation (checkEnv)", () => {
  it("reports no fatal findings for a minimally sane development config", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      NODE_ENV: "development",
    });
    expect(checkEnv().fatal).toEqual([]);
  });

  it("is fatal when JWT_SECRET is missing — session cookies would be forgeable", async () => {
    const checkEnv = await loadCheckEnvWith({
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      NODE_ENV: "development",
    });
    const { fatal } = checkEnv();
    expect(fatal.some(m => m.includes("JWT_SECRET"))).toBe(true);
  });

  it("is fatal when JWT_SECRET is present but too short", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "short",
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
    });
    expect(checkEnv().fatal.some(m => m.includes("JWT_SECRET"))).toBe(true);
  });

  it("is fatal when DATABASE_URL is missing in production, but only a warning in development", async () => {
    const prod = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      NODE_ENV: "production",
    });
    const prodResult = prod();
    expect(prodResult.fatal.some(m => m.includes("DATABASE_URL"))).toBe(true);

    const dev = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      NODE_ENV: "development",
    });
    const devResult = dev();
    expect(devResult.fatal.some(m => m.includes("DATABASE_URL"))).toBe(false);
    expect(devResult.warnings.some(m => m.includes("DATABASE_URL"))).toBe(true);
  });

  it("warns (does not fail) when Google auth is selected but credentials are missing", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      AUTH_PROVIDER: "google",
    });
    const { fatal, warnings } = checkEnv();
    expect(fatal).toEqual([]);
    expect(warnings.some(m => m.includes("GOOGLE_CLIENT_ID"))).toBe(true);
  });

  it("does not warn about Google credentials when AUTH_PROVIDER is email", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      AUTH_PROVIDER: "email",
    });
    expect(checkEnv().warnings.some(m => m.includes("GOOGLE_CLIENT_ID"))).toBe(false);
  });

  it("is fatal when STORAGE_PROVIDER=s3 but S3 credentials are incomplete", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      STORAGE_PROVIDER: "s3",
      S3_BUCKET: "my-bucket",
      // access key + secret intentionally missing
    });
    const { fatal } = checkEnv();
    expect(fatal.some(m => m.includes("S3_ACCESS_KEY_ID"))).toBe(true);
    expect(fatal.some(m => m.includes("S3_SECRET_ACCESS_KEY"))).toBe(true);
  });

  it("never flags storage as broken when STORAGE_PROVIDER is left as the local default", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
    });
    const { fatal, warnings } = checkEnv();
    expect(fatal.some(m => m.toLowerCase().includes("s3"))).toBe(false);
    expect(warnings.some(m => m.toLowerCase().includes("s3"))).toBe(false);
  });

  it("warns in production when CRON_SECRET or OWNER_OPEN_ID is unset, without failing startup", async () => {
    const checkEnv = await loadCheckEnvWith({
      JWT_SECRET: "a".repeat(32),
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      NODE_ENV: "production",
    });
    const { fatal, warnings } = checkEnv();
    expect(fatal).toEqual([]);
    expect(warnings.some(m => m.includes("CRON_SECRET"))).toBe(true);
    expect(warnings.some(m => m.includes("OWNER_OPEN_ID"))).toBe(true);
  });
});
