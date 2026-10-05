import { afterEach, describe, expect, it, vi } from "vitest";

describe("scheduled jobs (no CRON_SECRET set in this environment)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reports itself as unconfigured with no CRON_SECRET", async () => {
    const { isScheduledJobsConfigured } = await import("./scheduledJobs");
    expect(isScheduledJobsConfigured()).toBe(false);
  });

  it("refuses to run a job even with a correct-looking secret when unconfigured", async () => {
    const { runExpiringSubscriptionsJob } = await import("./scheduledJobs");
    const result = await runExpiringSubscriptionsJob("anything");
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("rejects an incorrect secret once CRON_SECRET is configured", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "real-secret-123");
    const { runExpiringSubscriptionsJob, isScheduledJobsConfigured } =
      await import("./scheduledJobs");
    expect(isScheduledJobsConfigured()).toBe(true);
    const result = await runExpiringSubscriptionsJob("wrong-secret");
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("accepts the correct secret and runs the real sweep once CRON_SECRET is configured", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "real-secret-123");
    const {
      runExpiringSubscriptionsJob,
      runStaleReceiptsJob,
      runPaymentRemindersJob,
      runExpireInvoicesJob,
    } = await import("./scheduledJobs");
    const subsResult = await runExpiringSubscriptionsJob("real-secret-123");
    expect(subsResult.ok).toBe(true);
    // No DB configured in this test environment, so the real underlying
    // sweep function safely no-ops (0 notified) rather than throwing —
    // this test proves the auth gate + delegation wiring, not the sweep
    // logic itself (that's covered by notifications.ts and
    // scripts/verify-stale-receipt-sweep.ts against real MySQL).
    expect(subsResult).toMatchObject({ ok: true, notified: 0 });

    const staleResult = await runStaleReceiptsJob("real-secret-123", 24);
    expect(staleResult).toMatchObject({
      ok: true,
      staleCount: 0,
      notificationsSent: 0,
    });

    const reminderResult = await runPaymentRemindersJob("real-secret-123", 24);
    expect(reminderResult).toMatchObject({ ok: true, remindedCount: 0 });

    const expireResult = await runExpireInvoicesJob("real-secret-123", 7);
    expect(expireResult).toMatchObject({ ok: true, expiredCount: 0 });
  });

  it("rejects a non-string secret (e.g. an object from a malformed request body)", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "real-secret-123");
    const { runStaleReceiptsJob } = await import("./scheduledJobs");
    const result = await runStaleReceiptsJob({ not: "a string" });
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
  });
});
