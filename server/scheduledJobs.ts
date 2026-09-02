// Turns the previously admin-mutation-only sweeps into real, schedulable
// HTTP jobs. Any external scheduler that can make an HTTP POST works — a
// plain crontab line with `curl`, a GitHub Actions scheduled workflow,
// cron-job.org, or the `cron` sidecar container in docker-compose.yml (a
// genuinely self-hosted, zero-account option).
//
// Until CRON_SECRET is set, these endpoints refuse to run anything (501)
// rather than silently accepting unauthenticated requests that would let
// anyone spam real notifications by hitting a guessable URL.

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { notifyExpiringSubscriptions } from "./db/notifications";
import { notifyAdminsOfStaleReceipts } from "./db/whatsappPayments";
import { expireStalePendingInvoices } from "./db/subscriptions";
import { remindStaleCheckoutSessions } from "./whatsappBot";

export function isScheduledJobsConfigured(): boolean {
  return Boolean(ENV.cronSecret);
}

function secretMatches(provided: unknown): boolean {
  return (
    isScheduledJobsConfigured() &&
    typeof provided === "string" &&
    provided === ENV.cronSecret
  );
}

export type ScheduledJobResult =
  | { ok: true; [key: string]: unknown }
  | { ok: false; reason: "unauthorized" };

/** Pure, directly testable — Express wiring below is just a thin pass-through. */
export async function runExpiringSubscriptionsJob(
  secret: unknown
): Promise<ScheduledJobResult> {
  if (!secretMatches(secret)) return { ok: false, reason: "unauthorized" };
  const notified = await notifyExpiringSubscriptions(3);
  return { ok: true, notified };
}

/** Pure, directly testable — Express wiring below is just a thin pass-through. */
export async function runStaleReceiptsJob(
  secret: unknown,
  hoursThreshold?: number
): Promise<ScheduledJobResult> {
  if (!secretMatches(secret)) return { ok: false, reason: "unauthorized" };
  const result = await notifyAdminsOfStaleReceipts(hoursThreshold ?? 24);
  return { ok: true, ...result };
}

/** Pure, directly testable — Express wiring below is just a thin pass-through. */
export async function runPaymentRemindersJob(
  secret: unknown,
  hoursThreshold?: number
): Promise<ScheduledJobResult> {
  if (!secretMatches(secret)) return { ok: false, reason: "unauthorized" };
  const result = await remindStaleCheckoutSessions(hoursThreshold ?? 24);
  return { ok: true, ...result };
}

/** Pure, directly testable — Express wiring below is just a thin pass-through. */
export async function runExpireInvoicesJob(
  secret: unknown,
  daysThreshold?: number
): Promise<ScheduledJobResult> {
  if (!secretMatches(secret)) return { ok: false, reason: "unauthorized" };
  const result = await expireStalePendingInvoices(daysThreshold ?? 7);
  return { ok: true, ...result };
}

function extractSecret(req: Request): unknown {
  // Support the secret in the JSON body or an x-cron-secret header — some
  // schedulers only let you configure a request body, others only a
  // header, so accept either.
  return req.body?.secret ?? req.headers["x-cron-secret"];
}

export function registerScheduledJobRoutes(app: Express) {
  app.post(
    "/api/scheduled/expiring-subscriptions",
    async (req: Request, res: Response) => {
      if (!isScheduledJobsConfigured()) {
        res.status(501).json({
          error:
            "Scheduled jobs are not configured on this deployment. Set CRON_SECRET.",
        });
        return;
      }
      try {
        const result = await runExpiringSubscriptionsJob(extractSecret(req));
        if (!result.ok) {
          res.status(403).json({ error: "Invalid or missing cron secret." });
          return;
        }
        res.status(200).json(result);
      } catch (error) {
        // A scheduled job must never crash the whole server process just
        // because a downstream dependency (e.g. the database) is briefly
        // unavailable — that would take down every other request, not just
        // this one. Log it and return a clean 500 instead.
        console.error(
          "[scheduledJobs] expiring-subscriptions job failed:",
          error
        );
        res.status(500).json({ error: "Job failed. See server logs." });
      }
    }
  );

  app.post(
    "/api/scheduled/stale-receipts",
    async (req: Request, res: Response) => {
      if (!isScheduledJobsConfigured()) {
        res.status(501).json({
          error:
            "Scheduled jobs are not configured on this deployment. Set CRON_SECRET.",
        });
        return;
      }
      try {
        const hoursThreshold =
          typeof req.body?.hoursThreshold === "number"
            ? req.body.hoursThreshold
            : undefined;
        const result = await runStaleReceiptsJob(
          extractSecret(req),
          hoursThreshold
        );
        if (!result.ok) {
          res.status(403).json({ error: "Invalid or missing cron secret." });
          return;
        }
        res.status(200).json(result);
      } catch (error) {
        console.error("[scheduledJobs] stale-receipts job failed:", error);
        res.status(500).json({ error: "Job failed. See server logs." });
      }
    }
  );

  app.post(
    "/api/scheduled/payment-reminders",
    async (req: Request, res: Response) => {
      if (!isScheduledJobsConfigured()) {
        res.status(501).json({
          error:
            "Scheduled jobs are not configured on this deployment. Set CRON_SECRET.",
        });
        return;
      }
      try {
        const hoursThreshold =
          typeof req.body?.hoursThreshold === "number"
            ? req.body.hoursThreshold
            : undefined;
        const result = await runPaymentRemindersJob(
          extractSecret(req),
          hoursThreshold
        );
        if (!result.ok) {
          res.status(403).json({ error: "Invalid or missing cron secret." });
          return;
        }
        res.status(200).json(result);
      } catch (error) {
        console.error("[scheduledJobs] payment-reminders job failed:", error);
        res.status(500).json({ error: "Job failed. See server logs." });
      }
    }
  );

  app.post(
    "/api/scheduled/expire-invoices",
    async (req: Request, res: Response) => {
      if (!isScheduledJobsConfigured()) {
        res.status(501).json({
          error:
            "Scheduled jobs are not configured on this deployment. Set CRON_SECRET.",
        });
        return;
      }
      try {
        const daysThreshold =
          typeof req.body?.daysThreshold === "number"
            ? req.body.daysThreshold
            : undefined;
        const result = await runExpireInvoicesJob(
          extractSecret(req),
          daysThreshold
        );
        if (!result.ok) {
          res.status(403).json({ error: "Invalid or missing cron secret." });
          return;
        }
        res.status(200).json(result);
      } catch (error) {
        console.error("[scheduledJobs] expire-invoices job failed:", error);
        res.status(500).json({ error: "Job failed. See server logs." });
      }
    }
  );
}
