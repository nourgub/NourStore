// Excel download of a saved timetable: GET /api/timetables/:id/xlsx
//
// Not public, unlike the certificate PDF: a timetable names every teacher
// of a school and their whole week. Authorization is re-checked on every
// request — the session cookie, the staff role, and the ownership rule of
// server/db/timetables.ts (a school's timetable is invisible to any other
// account, an admin excepted) — so a leaked URL is worth nothing on its
// own.

import type { Express, Request, Response } from "express";
import { authenticateRequest } from "./_core/session";
import { getTimetable } from "./db/timetables";
import { checkRateLimit } from "./rateLimit";
import { buildTimetableWorkbook, exportFileName } from "./timetableExcel";
import type {
  ScheduledSession,
  TimetableInput,
} from "@shared/secondaryTimetable";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function registerTimetableDownload(app: Express) {
  app.get("/api/timetables/:id/xlsx", async (req: Request, res: Response) => {
    let userId: number;
    let role: string;
    try {
      const user = await authenticateRequest(req);
      userId = user.id;
      role = user.role;
    } catch {
      res.status(401).json({ error: "Please sign in." });
      return;
    }
    if (role !== "institution" && role !== "admin") {
      res.status(403).json({ error: "Institution access required" });
      return;
    }
    // Building a workbook is real work per request (every class and every
    // teacher of a school), so it is bounded like the other generating
    // endpoints rather than left open.
    if (
      !(await checkRateLimit(`timetable-xlsx:${userId}`, 60, 60 * 60 * 1000))
    ) {
      res
        .status(429)
        .json({ error: "Too many requests, please try again later" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid timetable id" });
      return;
    }
    const row = await getTimetable(
      id,
      userId,
      role === "admin" ? "admin" : "institution"
    );
    if (!row) {
      res.status(404).json({ error: "Timetable not found." });
      return;
    }

    let config: TimetableInput;
    let sessions: ScheduledSession[];
    try {
      config = JSON.parse(row.config) as TimetableInput;
      sessions = JSON.parse(row.sessions) as ScheduledSession[];
    } catch {
      res.status(500).json({ error: "Stored timetable could not be read." });
      return;
    }

    const meta = { name: row.name, schoolYear: row.schoolYear };
    const workbook = await buildTimetableWorkbook(config, sessions, meta);
    const fileName = exportFileName(meta);
    res.setHeader("Content-Type", XLSX_MIME);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName.ascii}"; ` +
        `filename*=UTF-8''${encodeURIComponent(fileName.utf8)}`
    );
    // A timetable changes; never let a proxy or the browser serve an old
    // workbook for a URL whose content was just regenerated.
    res.setHeader("Cache-Control", "private, no-store");
    res.send(workbook);
  });
}
