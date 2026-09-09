import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { SECONDARY_STREAM_TEMPLATES } from "@shared/secondaryCurriculum";
import type { Section, Teacher } from "@shared/secondaryTimetable";

// The timetable endpoints are role-gated and, for generation, pure: they
// compute from the payload and touch no database, so everything except
// storage is provable here without MySQL. The storage paths are covered
// against a real database in timetable.storage.e2e.test.ts.
const HAS_DB = !!process.env.DATABASE_URL;

function contextFor(
  role: "learner" | "parent" | "teacher" | "institution" | "admin"
): TrpcContext {
  return {
    user: {
      id: 42,
      openId: `timetable-${role}`,
      name: role,
      email: `${role}@example.com`,
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function sectionOf(streamId: string, label: string): Section {
  const stream = SECONDARY_STREAM_TEMPLATES.find(s => s.id === streamId);
  if (!stream) throw new Error(`unknown stream ${streamId}`);
  return {
    id: label,
    label,
    level: stream.level,
    stream: stream.id,
    requirements: stream.subjects.map(subject => ({ ...subject })),
  };
}

function staffOf(sections: Section[]): Teacher[] {
  const hours = new Map<string, number>();
  for (const section of sections) {
    for (const row of section.requirements) {
      hours.set(
        row.subjectId,
        (hours.get(row.subjectId) ?? 0) + row.weeklyHours
      );
    }
  }
  const teachers: Teacher[] = [];
  hours.forEach((total, subjectId) => {
    const count = Math.max(1, Math.ceil(total / 13));
    for (let i = 0; i < count; i++) {
      teachers.push({
        id: `${subjectId}-${i + 1}`,
        name: `أستاذ ${subjectId} ${i + 1}`,
        rank: "standard",
        subjectIds: [subjectId],
      });
    }
  });
  return teachers;
}

const sections = [
  sectionOf("3AS-experimental-sciences", "3 ع ت 1"),
  sectionOf("3AS-experimental-sciences", "3 ع ت 2"),
];
const config = { sections, teachers: staffOf(sections), options: { seed: 3 } };

describe("timetable endpoints: role gates", () => {
  it("keeps learners, parents and teachers out of every timetable endpoint", async () => {
    for (const role of ["learner", "parent", "teacher"] as const) {
      const caller = appRouter.createCaller(contextFor(role));
      await expect(caller.timetable.reference()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.timetable.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.timetable.generate(config)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.timetable.save({
          name: "جدول",
          schoolYear: "2025/2026",
          status: "draft",
          config,
          sessions: [],
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.timetable.remove({ id: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });

  it("lets institution and admin read the reference data", async () => {
    for (const role of ["institution", "admin"] as const) {
      const reference = await appRouter
        .createCaller(contextFor(role))
        .timetable.reference();
      expect(reference.streams.length).toBeGreaterThan(0);
      // Rule 2's start times and rule 9's ministerial days come from the
      // engine, so the screen can never drift from what is enforced.
      expect(reference.grid.morningStart).toBe("08:00");
      expect(reference.grid.afternoonStart).toBe("13:30");
      expect(reference.pedagogicalDays.mathematics).toBe("thursday");
      expect(reference.curriculumNoticeAr).toContain("قابلة للتعديل");
      expect(reference.ranks.map(r => r.rank)).toContain("distinguished");
    }
  });
});

describe("timetable generation over the API", () => {
  it("returns a timetable that respects every rule, with its assignment sheet", async () => {
    const caller = appRouter.createCaller(contextFor("institution"));
    const result = await caller.timetable.generate(config);
    expect(result.ok).toBe(true);
    expect(result.violations.filter(v => v.severity === "hard")).toEqual([]);
    expect(result.unplaced).toEqual([]);
    expect(result.stats.placedHours).toBe(result.stats.requiredHours);
    // The assignment sheet is what a school actually posts beside the
    // timetable: one row per (subject, teacher) with their weekly load.
    expect(result.assignmentSheet.length).toBeGreaterThan(0);
    for (const row of result.assignmentSheet) {
      expect(row.weeklyHours).toBeLessThanOrEqual(16);
    }
    for (const load of result.teacherLoads) {
      expect(load.hours).toBeLessThanOrEqual(load.quota);
    }
  });

  it("reports the subjects left without a teacher instead of a silent half-timetable", async () => {
    const caller = appRouter.createCaller(contextFor("institution"));
    const result = await caller.timetable.generate({
      sections: [sectionOf("3AS-mathematics", "3 ر 1")],
      teachers: [
        {
          id: "math-1",
          name: "أستاذ الرياضيات",
          rank: "distinguished",
          subjectIds: ["mathematics"],
        },
      ],
      options: { seed: 1, maxRestarts: 1, maxSteps: 2000 },
    });
    expect(result.ok).toBe(false);
    expect(result.assignmentProblems.map(p => p.subjectId)).toContain(
      "physics"
    );
  });

  it("re-validates a hand-edited week and names the rule that broke", async () => {
    const caller = appRouter.createCaller(contextFor("institution"));
    const generated = await caller.timetable.generate(config);
    // Move one session of the first class into the afternoon, one slot
    // late: that breaks rule 2 (the afternoon starts at 13:30) and rule 3
    // (no hole in a pupil's half-day) at once.
    const edited = generated.sessions.map((session, index) =>
      index === 0
        ? { ...session, halfDay: "afternoon" as const, startSlot: 2 }
        : session
    );
    const result = await caller.timetable.validate({
      config,
      sessions: edited,
      pedagogicalExemptions: generated.pedagogicalExemptions,
    });
    const codes = result.violations.map(v => v.code);
    expect(codes).toContain("late_half_day_start");
    expect(result.violations.some(v => v.severity === "hard")).toBe(true);
  });

  it("applies the director's pedagogical day and each teacher's own half-day (rule 9)", async () => {
    const caller = appRouter.createCaller(contextFor("institution"));
    // The director moves mathematics to monday; one teacher of the subject
    // keeps the morning free, the next one the afternoon.
    const teachers = config.teachers.map((teacher, index) => ({
      ...teacher,
      pedagogicalHalfDay: (index % 2 === 0 ? "morning" : "afternoon") as
        | "morning"
        | "afternoon",
    }));
    const result = await caller.timetable.generate({
      ...config,
      teachers,
      pedagogicalDays: { mathematics: "monday" },
    });
    expect(result.violations.filter(v => v.severity === "hard")).toEqual([]);

    const mathExemptions = result.pedagogicalExemptions.filter(
      e => e.subjectId === "mathematics"
    );
    expect(mathExemptions.length).toBeGreaterThan(0);
    // One day for the subject, taken from the director…
    for (const exemption of mathExemptions) {
      expect(exemption.day).toBe("monday");
      expect(exemption.chosen).toBe(true);
      // …and not a single hour scheduled in the half-day each one kept.
      expect(
        result.sessions.filter(
          s =>
            s.teacherId === exemption.teacherId &&
            s.day === exemption.day &&
            s.halfDay === exemption.halfDay
        )
      ).toEqual([]);
    }
    // Moving off the ministerial thursday is reported, not hidden.
    expect(
      result.violations.some(
        v =>
          v.code === "pedagogical_day_off_official" &&
          v.subjectId === "mathematics"
      )
    ).toBe(true);
  });

  it("rejects a payload that is not a timetable at all", async () => {
    const caller = appRouter.createCaller(contextFor("institution"));
    await expect(
      caller.timetable.generate({
        sections: [],
        teachers: [],
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.timetable.save({
        name: "جدول",
        schoolYear: "2025-2026", // not the 2025/2026 shape
        status: "draft",
        config,
        sessions: [],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("timetable storage without a database", () => {
  // With no database configured the storage layer returns nothing rather
  // than pretending to have saved: the endpoints must say so.
  it.skipIf(HAS_DB)(
    "lists nothing and reports a failed save honestly",
    async () => {
      const caller = appRouter.createCaller(contextFor("institution"));
      await expect(caller.timetable.list()).resolves.toEqual([]);
      await expect(caller.timetable.get({ id: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      await expect(caller.timetable.remove({ id: 1 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      await expect(
        caller.timetable.save({
          name: "جدول التوقيت",
          schoolYear: "2025/2026",
          status: "draft",
          config,
          sessions: [],
        })
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    }
  );
});
