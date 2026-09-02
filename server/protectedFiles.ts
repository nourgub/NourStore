// Two kinds of real, sensitive files were previously served through the
// generic `/local-storage/*` static route with NO authentication at all:
//   1. Payment receipt images (bank-transfer screenshots — real financial
//      and personal data).
//   2. Paid lesson video/attachment files.
// The tRPC layer correctly restricted who is *told* each URL (admins for
// receipts; enrolled/eligible learners for lesson assets), but the URL
// itself, once known by anyone — a leaked screenshot, browser history
// sync, a compromised device, a referrer header, a shared link — worked
// forever for absolutely anyone, no login required. These routes close
// that gap: they re-check real authorization on every single request,
// not just once when the URL was first handed out.
//
// Only applies when STORAGE_PROVIDER=local (the default, self-hosted-only
// option). Under STORAGE_PROVIDER=s3, files already go through
// storageGetSignedUrl's real, expiring, cryptographically signed AWS
// presigned URLs — genuinely protected already, nothing to add there.

import type { Express, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { UPLOAD_ROOT } from "./storageProviders/local";
import { getDb } from "./db/shared";
import { paymentReceipts, invoices, lessonAssets } from "../drizzle/schema";
import { authenticateRequest } from "./_core/session";
import { getLessonForLearner } from "./db/courses";
import type { User } from "../drizzle/schema";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Path-traversal guard, re-verified here independently rather than trusted from write time (same pattern as localStorageServer.ts). */
async function streamProtectedFile(
  res: Response,
  storageKey: string,
  mimeType: string | null
) {
  const fullPath = path.resolve(UPLOAD_ROOT, storageKey);
  if (
    !fullPath.startsWith(UPLOAD_ROOT + path.sep) &&
    fullPath !== UPLOAD_ROOT
  ) {
    res.status(400).json({ error: "Invalid file path." });
    return;
  }
  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    res.setHeader(
      "Content-Type",
      mimeType || CONTENT_TYPES[ext] || "application/octet-stream"
    );
    // Never cached by shared/proxy caches — every file behind this route
    // is scoped to specific people, never a public asset.
    res.setHeader("Cache-Control", "private, no-store");
    res.send(data);
  } catch {
    res.status(404).json({ error: "File not found on disk." });
  }
}

async function requireUser(req: Request, res: Response): Promise<User | null> {
  try {
    return await authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Sign in required." });
    return null;
  }
}

export function registerProtectedFileRoutes(app: Express) {
  app.get(
    "/api/protected-files/receipt/:receiptId",
    async (req: Request, res: Response) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const receiptId = Number(req.params.receiptId);
      if (!Number.isInteger(receiptId) || receiptId <= 0) {
        res.status(400).json({ error: "Invalid receipt id." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable." });
        return;
      }
      const rows = await db
        .select({
          storageKey: paymentReceipts.storageKey,
          mimeType: paymentReceipts.mimeType,
          ownerUserId: invoices.userId,
        })
        .from(paymentReceipts)
        .leftJoin(invoices, eq(invoices.id, paymentReceipts.invoiceId))
        .where(eq(paymentReceipts.id, receiptId))
        .limit(1);
      const receipt = rows[0];
      if (!receipt) {
        res.status(404).json({ error: "Receipt not found." });
        return;
      }
      // Only an admin (who reviews receipts) or the learner who submitted
      // this exact receipt may ever view it.
      const isOwner = receipt.ownerUserId === user.id;
      const isAdmin = user.role === "admin";
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Not authorized to view this receipt." });
        return;
      }
      if (!receipt.storageKey) {
        res.status(404).json({ error: "Receipt file not found." });
        return;
      }
      await streamProtectedFile(res, receipt.storageKey, receipt.mimeType);
    }
  );

  app.get(
    "/api/protected-files/lesson-asset/:assetId",
    async (req: Request, res: Response) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const assetId = Number(req.params.assetId);
      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({ error: "Invalid asset id." });
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable." });
        return;
      }
      const rows = await db
        .select({
          lessonId: lessonAssets.lessonId,
          storageKey: lessonAssets.storageKey,
          mimeType: lessonAssets.mimeType,
        })
        .from(lessonAssets)
        .where(eq(lessonAssets.id, assetId))
        .limit(1);
      const asset = rows[0];
      if (!asset) {
        res.status(404).json({ error: "Asset not found." });
        return;
      }
      // Reuses the exact same access rule the lesson page itself enforces
      // (enrolled, eligible for a paid course, not locked by lesson
      // ordering) — a learner who can't open the lesson can't stream its
      // video by hitting this URL directly either. Admins bypass, same as
      // the lesson-preview rule elsewhere.
      if (user.role !== "admin") {
        const access = await getLessonForLearner(asset.lessonId, user.id);
        const ok =
          access &&
          "access" in access &&
          access.access === "ok" &&
          !("locked" in access && access.locked);
        if (!ok) {
          res
            .status(403)
            .json({ error: "Not authorized to view this lesson file." });
          return;
        }
      }
      await streamProtectedFile(res, asset.storageKey, asset.mimeType);
    }
  );
}
