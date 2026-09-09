import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRID,
  OFFICIAL_PEDAGOGICAL_DAYS,
  buildAssignmentSheet,
  buildWeekGrid,
  generateTimetable,
  hardViolations,
  rankWeeklyQuota,
  requirementBlocks,
  resolveExemptions,
  slotWindow,
  summarizeTeacherLoads,
  teacherCeiling,
  teacherQuota,
  validateTimetable,
  type ScheduledSession,
  type Section,
  type SubjectRequirement,
  type Teacher,
  type TimetableInput,
} from "./secondaryTimetable";
import {
  SECONDARY_STREAM_TEMPLATES,
  findStreamTemplate,
  templateWeeklyTotal,
} from "./secondaryCurriculum";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sectionFromTemplate(streamId: string, label: string): Section {
  const template = findStreamTemplate(streamId);
  if (!template) throw new Error(`unknown stream ${streamId}`);
  return {
    id: label,
    label,
    level: template.level,
    stream: template.id,
    requirements: template.subjects.map(subject => ({ ...subject })),
  };
}

/** One teacher per subject of the given sections, all within quota. */
function staffFor(
  sections: Section[],
  rank: Teacher["rank"] = "standard"
): Teacher[] {
  const perSubject = new Map<string, number>();
  for (const section of sections) {
    for (const requirement of section.requirements) {
      perSubject.set(
        requirement.subjectId,
        (perSubject.get(requirement.subjectId) ?? 0) + requirement.weeklyHours
      );
    }
  }
  const teachers: Teacher[] = [];
  for (const [subjectId, hours] of perSubject) {
    // Split the subject over as many teachers as the quota needs.
    const count = Math.max(1, Math.ceil(hours / rankWeeklyQuota(rank)));
    for (let i = 0; i < count; i++) {
      teachers.push({
        id: `${subjectId}-${i + 1}`,
        name: `أستاذ ${subjectId} ${i + 1}`,
        rank,
        subjectIds: [subjectId],
      });
    }
  }
  return teachers;
}

const requirement = (
  over: Partial<SubjectRequirement> = {}
): SubjectRequirement => ({
  subjectId: "mathematics",
  nameAr: "الرياضيات",
  weeklyHours: 2,
  ...over,
});

/** A minimal input around one section, for targeted validator tests. */
function tinyInput(
  requirements: SubjectRequirement[],
  teachers?: Teacher[]
): TimetableInput {
  const subjectIds = requirements.map(r => r.subjectId);
  return {
    sections: [
      {
        id: "1AS-A",
        label: "1 ج م ع ت 1",
        level: "1AS",
        stream: "1AS-science-technology",
        requirements,
      },
    ],
    teachers:
      teachers ??
      subjectIds.map(subjectId => ({
        id: `t-${subjectId}`,
        name: `أستاذ ${subjectId}`,
        rank: "standard" as const,
        subjectIds: [subjectId],
      })),
  };
}

const session = (over: Partial<ScheduledSession> = {}): ScheduledSession => ({
  sectionId: "1AS-A",
  subjectId: "mathematics",
  teacherId: "t-mathematics",
  day: "sunday",
  halfDay: "morning",
  startSlot: 0,
  hours: 2,
  kind: "lecture",
  ...over,
});

const codes = (violations: { code: string }[]) => violations.map(v => v.code);

// ---------------------------------------------------------------------------
// Rule 1 — weekly quota by rank
// ---------------------------------------------------------------------------

describe("rule 1: weekly teaching quota by rank", () => {
  it("gives أستاذ مميز 14 hours and every other rank 16", () => {
    expect(rankWeeklyQuota("distinguished")).toBe(14);
    expect(rankWeeklyQuota("formateur")).toBe(16);
    expect(rankWeeklyQuota("principal")).toBe(16);
    expect(rankWeeklyQuota("standard")).toBe(16);
  });

  it("lets maxWeeklyHours lower the quota but never raise it", () => {
    const base: Teacher = {
      id: "t1",
      name: "أستاذ",
      rank: "distinguished",
      subjectIds: ["mathematics"],
    };
    expect(teacherQuota({ ...base, maxWeeklyHours: 10 })).toBe(10);
    expect(teacherQuota({ ...base, maxWeeklyHours: 20 })).toBe(14);
  });

  it("counts explicitly granted overtime in the ceiling only, not in the quota", () => {
    const teacher: Teacher = {
      id: "t1",
      name: "أستاذ",
      rank: "standard",
      subjectIds: ["mathematics"],
      extraHours: 2,
    };
    expect(teacherQuota(teacher)).toBe(16);
    expect(teacherCeiling(teacher)).toBe(18);
  });

  it("flags a teacher scheduled past the quota, and reports granted overtime separately", () => {
    const overQuota = validateTimetable(
      tinyInput(
        [requirement({ weeklyHours: 2 })],
        [
          {
            id: "t-mathematics",
            name: "أستاذ الرياضيات",
            rank: "distinguished",
            subjectIds: ["mathematics"],
            maxWeeklyHours: 2,
          },
        ]
      ),
      [session(), session({ day: "monday" })]
    );
    expect(codes(overQuota)).toContain("teacher_weekly_quota");

    const withOvertime = validateTimetable(
      tinyInput(
        [requirement({ weeklyHours: 2 })],
        [
          {
            id: "t-mathematics",
            name: "أستاذ الرياضيات",
            rank: "distinguished",
            subjectIds: ["mathematics"],
            maxWeeklyHours: 2,
            extraHours: 2,
          },
        ]
      ),
      [session(), session({ day: "monday" })]
    );
    const overtime = withOvertime.filter(
      v => v.code === "teacher_overtime_hours"
    );
    expect(overtime).toHaveLength(1);
    expect(overtime[0].severity).toBe("preference");
    expect(codes(withOvertime)).not.toContain("teacher_weekly_quota");
  });
});

// ---------------------------------------------------------------------------
// Rules 2 and 3 — fixed start times, no gap in a pupil's half-day
// ---------------------------------------------------------------------------

describe("rules 2 and 3: fixed start times and no gap for pupils", () => {
  it("starts the morning at 08:00 and the afternoon at 13:30 by default", () => {
    expect(DEFAULT_GRID.morningStart).toBe("08:00");
    expect(DEFAULT_GRID.afternoonStart).toBe("13:30");
    expect(slotWindow(DEFAULT_GRID, "morning", 0, 2)).toEqual({
      startTime: "08:00",
      endTime: "10:00",
    });
    expect(slotWindow(DEFAULT_GRID, "afternoon", 0, 1)).toEqual({
      startTime: "13:30",
      endTime: "14:30",
    });
  });

  it("flags a half-day that does not start at its official time", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 2 })]),
      [session({ startSlot: 1 })]
    );
    expect(codes(violations)).toContain("late_half_day_start");
  });

  it("flags a hole between two sessions of the same half-day", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({ weeklyHours: 2 }),
        requirement({ subjectId: "physics", nameAr: "فيزياء", weeklyHours: 1 }),
      ]),
      [
        session({ hours: 2, startSlot: 0 }),
        session({
          subjectId: "physics",
          teacherId: "t-physics",
          hours: 1,
          startSlot: 3,
        }),
      ]
    );
    expect(codes(violations)).toContain("student_gap");
  });
});

// ---------------------------------------------------------------------------
// Rule 4 — never a single hour in a half-day
// ---------------------------------------------------------------------------

describe("rule 4: no half-day worth a single hour", () => {
  it("flags a class brought in for one hour", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 1 })]),
      [session({ hours: 1 })]
    );
    expect(codes(violations)).toContain("section_single_hour_half_day");
  });

  it("flags a teacher coming in for one hour", () => {
    const input: TimetableInput = {
      sections: [
        {
          id: "A",
          label: "قسم أ",
          level: "1AS",
          stream: "s",
          requirements: [requirement({ weeklyHours: 2 })],
        },
        {
          id: "B",
          label: "قسم ب",
          level: "1AS",
          stream: "s",
          requirements: [
            requirement({
              subjectId: "physics",
              nameAr: "فيزياء",
              weeklyHours: 1,
            }),
          ],
        },
      ],
      teachers: [
        {
          id: "t-mathematics",
          name: "أستاذ الرياضيات",
          rank: "standard",
          subjectIds: ["mathematics"],
        },
        {
          id: "t-physics",
          name: "أستاذ الفيزياء",
          rank: "standard",
          subjectIds: ["physics"],
        },
      ],
    };
    const violations = validateTimetable(input, [
      session({ sectionId: "A" }),
      session({
        sectionId: "B",
        subjectId: "physics",
        teacherId: "t-physics",
        hours: 1,
        halfDay: "afternoon",
      }),
    ]);
    const teacherLone = violations.filter(
      v => v.code === "teacher_single_hour_half_day"
    );
    expect(teacherLone.map(v => v.teacherId)).toContain("t-physics");
  });
  it("reports a lone hour it is impossible to group as an assignment matter", () => {
    // The teacher holds one subject in one class: rule 8 forbids that
    // subject twice in a day, so its odd hour can never share a half-day
    // with anything. The fix is in the assignment, not in the timetable,
    // and the message has to say so instead of blaming the grid.
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 3 })]),
      [session({ hours: 2 }), session({ day: "monday", hours: 1 })]
    );
    const lone = violations.filter(
      v => v.code === "teacher_single_hour_half_day"
    );
    expect(lone).toHaveLength(1);
    expect(lone[0].severity).toBe("preference");
    expect(lone[0].messageAr).toContain("الإسناد");
  });

  it("keeps a groupable lone hour a hard violation", () => {
    // Same teacher, but two classes: the two odd hours could have shared
    // a half-day, so leaving them apart is a real defect.
    const input: TimetableInput = {
      sections: ["A", "B"].map(id => ({
        id,
        label: `قسم ${id}`,
        level: "1AS",
        stream: "s",
        requirements: [requirement({ weeklyHours: 1 })],
      })),
      teachers: [
        {
          id: "t-mathematics",
          name: "أستاذ الرياضيات",
          rank: "standard",
          subjectIds: ["mathematics"],
        },
      ],
    };
    const violations = validateTimetable(input, [
      session({ sectionId: "A", hours: 1 }),
      session({ sectionId: "B", hours: 1, day: "monday" }),
    ]);
    const lone = violations.filter(
      v => v.code === "teacher_single_hour_half_day"
    );
    expect(lone.length).toBeGreaterThan(0);
    expect(lone.every(v => v.severity === "hard")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rules 5 and 6 — practical work and core subjects in the morning
// ---------------------------------------------------------------------------

describe("rules 5 and 6: core subjects and practical work in the morning", () => {
  it("treats a core subject scheduled in the afternoon as a hard violation", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 2, core: true })]),
      [session({ halfDay: "afternoon" })]
    );
    const core = violations.filter(v => v.code === "core_subject_not_morning");
    expect(core).toHaveLength(1);
    expect(core[0].severity).toBe("hard");
  });

  it("treats afternoon practical work of a core subject as a preference only", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "physics",
          nameAr: "العلوم الفيزيائية",
          weeklyHours: 2,
          practicalHours: 2,
          core: true,
        }),
      ]),
      [
        session({
          subjectId: "physics",
          teacherId: "t-physics",
          halfDay: "afternoon",
          kind: "practical",
        }),
      ]
    );
    const practical = violations.filter(
      v => v.code === "practical_not_morning"
    );
    expect(practical).toHaveLength(1);
    expect(practical[0].severity).toBe("preference");
  });

  it("cuts a subject capped at one hour a day into single hours (rule 8)", () => {
    const blocks = requirementBlocks(
      "A",
      requirement({
        subjectId: "islamic-sciences",
        nameAr: "العلوم الإسلامية",
        weeklyHours: 3,
        maxHoursPerDay: 1,
      })
    );
    expect(blocks.map(b => b.hours)).toEqual([1, 1, 1]);
  });

  it("splits a weekly load into 2h blocks with practical work kept apart", () => {
    const blocks = requirementBlocks(
      "A",
      requirement({
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 5,
        practicalHours: 1,
      })
    );
    expect(blocks.map(b => `${b.kind}:${b.hours}`)).toEqual([
      "lecture:2",
      "lecture:2",
      "practical:1",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Rule 7 — physical education closes the half-day
// ---------------------------------------------------------------------------

describe("rule 7: physical education at the end of a half-day", () => {
  it("flags PE that is not the last session of its half-day", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "physical-education",
          nameAr: "التربية البدنية",
          weeklyHours: 2,
          pe: true,
        }),
        requirement({ weeklyHours: 2 }),
      ]),
      [
        session({
          subjectId: "physical-education",
          teacherId: "t-physical-education",
          kind: "pe",
          startSlot: 0,
        }),
        session({ startSlot: 2 }),
      ]
    );
    expect(codes(violations)).toContain("pe_not_last");
  });

  it("accepts PE placed last", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "physical-education",
          nameAr: "التربية البدنية",
          weeklyHours: 2,
          pe: true,
        }),
        requirement({ weeklyHours: 2 }),
      ]),
      [
        session({ startSlot: 0 }),
        session({
          subjectId: "physical-education",
          teacherId: "t-physical-education",
          kind: "pe",
          startSlot: 2,
        }),
      ]
    );
    expect(codes(violations)).not.toContain("pe_not_last");
  });
});

// ---------------------------------------------------------------------------
// Rule 8 — spread over the whole week
// ---------------------------------------------------------------------------

describe("rule 8: sessions spread over the whole week", () => {
  it("flags a day with nothing scheduled for a class", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 2 })]),
      [session()]
    );
    const unused = violations.filter(v => v.code === "unused_day");
    expect(unused.map(v => v.day)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
    ]);
  });

  it("allows the practical hour on the same day as its lesson", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "physics",
          nameAr: "العلوم الفيزيائية",
          weeklyHours: 3,
          practicalHours: 1,
        }),
      ]),
      [
        session({ subjectId: "physics", teacherId: "t-physics", hours: 2 }),
        session({
          subjectId: "physics",
          teacherId: "t-physics",
          hours: 1,
          startSlot: 2,
          kind: "practical",
        }),
      ]
    );
    expect(codes(violations)).not.toContain("subject_repeated_same_day");
  });

  it("flags two practical sessions of one subject in the same day", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "physics",
          nameAr: "العلوم الفيزيائية",
          weeklyHours: 2,
          practicalHours: 2,
        }),
      ]),
      [
        session({
          subjectId: "physics",
          teacherId: "t-physics",
          hours: 1,
          startSlot: 0,
          kind: "practical",
        }),
        session({
          subjectId: "physics",
          teacherId: "t-physics",
          hours: 1,
          startSlot: 1,
          kind: "practical",
        }),
      ]
    );
    expect(codes(violations)).toContain("subject_repeated_same_day");
  });

  it("flags the same subject twice in one day for the same class", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 4 })]),
      [session({ startSlot: 0 }), session({ startSlot: 2 })]
    );
    expect(codes(violations)).toContain("subject_repeated_same_day");
  });
});

// ---------------------------------------------------------------------------
// Rule 9 — the pedagogical day of each subject
// ---------------------------------------------------------------------------

describe("rule 9: the pedagogical half-day of each teacher", () => {
  it("keeps the ministerial day of every subject named in the note as the default", () => {
    expect(OFFICIAL_PEDAGOGICAL_DAYS["history-geography"]).toBe("sunday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.arabic).toBe("monday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS["islamic-sciences"]).toBe("monday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.french).toBe("tuesday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.english).toBe("tuesday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.philosophy).toBe("tuesday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.physics).toBe("wednesday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS["natural-sciences"]).toBe("wednesday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.mathematics).toBe("thursday");
    expect(OFFICIAL_PEDAGOGICAL_DAYS.economics).toBe("thursday");
  });

  it("gives the director's day to every teacher of the subject, each in their own half", () => {
    // Two mathematics teachers: the director put the subject on monday and
    // one teacher takes the morning off, the other the afternoon.
    const input: TimetableInput = {
      sections: [
        {
          id: "A",
          label: "قسم أ",
          level: "1AS",
          stream: "s",
          requirements: [requirement({ weeklyHours: 4 })],
        },
      ],
      teachers: [
        {
          id: "m1",
          name: "أستاذ 1",
          rank: "standard",
          subjectIds: ["mathematics"],
          pedagogicalHalfDay: "morning",
        },
        {
          id: "m2",
          name: "أستاذ 2",
          rank: "standard",
          subjectIds: ["mathematics"],
          pedagogicalHalfDay: "afternoon",
        },
      ],
      pedagogicalDays: { mathematics: "monday" },
    };
    const exemptions = resolveExemptions(
      input,
      new Map([
        ["m1", "mathematics"],
        ["m2", "mathematics"],
      ]),
      { day: () => "sunday", halfDay: () => "morning" }
    );
    expect(exemptions).toEqual([
      {
        teacherId: "m1",
        subjectId: "mathematics",
        day: "monday",
        halfDay: "morning",
        official: false,
        chosen: true,
      },
      {
        teacherId: "m2",
        subjectId: "mathematics",
        day: "monday",
        halfDay: "afternoon",
        official: false,
        chosen: true,
      },
    ]);
  });

  it("flags a teacher given a session inside their own free half-day", () => {
    const input: TimetableInput = {
      sections: [
        {
          id: "1AS-A",
          label: "قسم أ",
          level: "1AS",
          stream: "s",
          requirements: [requirement({ weeklyHours: 2 })],
        },
      ],
      teachers: [
        {
          id: "t-mathematics",
          name: "أستاذ الرياضيات",
          rank: "standard",
          subjectIds: ["mathematics"],
          pedagogicalHalfDay: "morning",
        },
      ],
      pedagogicalDays: { mathematics: "sunday" },
    };
    const violations = validateTimetable(input, [session({ day: "sunday" })]);
    const busy = violations.filter(
      v => v.code === "pedagogical_exemption_busy"
    );
    expect(busy).toHaveLength(1);
    expect(busy[0].severity).toBe("hard");
    expect(busy[0].teacherId).toBe("t-mathematics");
  });

  it("accepts the same session once the teacher's free half-day is the other one", () => {
    const input: TimetableInput = {
      sections: [
        {
          id: "1AS-A",
          label: "قسم أ",
          level: "1AS",
          stream: "s",
          requirements: [requirement({ weeklyHours: 2 })],
        },
      ],
      teachers: [
        {
          id: "t-mathematics",
          name: "أستاذ الرياضيات",
          rank: "standard",
          subjectIds: ["mathematics"],
          pedagogicalHalfDay: "afternoon",
        },
      ],
      pedagogicalDays: { mathematics: "sunday" },
    };
    const violations = validateTimetable(input, [session({ day: "sunday" })]);
    expect(codes(violations)).not.toContain("pedagogical_exemption_busy");
  });

  it("reports the director moving a subject off the ministerial day as a note", () => {
    const violations = validateTimetable(
      {
        ...tinyInput([requirement({ weeklyHours: 2 })]),
        pedagogicalDays: { mathematics: "monday" }, // ministry says thursday
      },
      [session()]
    );
    const off = violations.filter(
      v => v.code === "pedagogical_day_off_official"
    );
    expect(off).toHaveLength(1);
    expect(off[0].severity).toBe("preference");
    expect(off[0].messageAr).toContain("الاثنين");
  });

  it("asks the director for a day when neither they nor the ministry set one", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "technology",
          nameAr: "التكنولوجيا",
          weeklyHours: 2,
        }),
      ]),
      [session({ subjectId: "technology", teacherId: "t-technology" })]
    );
    const missing = violations.filter(
      v => v.code === "pedagogical_day_not_set"
    );
    expect(missing).toHaveLength(1);
    expect(missing[0].severity).toBe("preference");
  });
});

// ---------------------------------------------------------------------------
// Rule 10 — the ministerial weekly load
// ---------------------------------------------------------------------------

describe("rule 10: the ministerial weekly load per subject", () => {
  it("flags a subject short of its hours", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 5 })]),
      [session({ hours: 2 })]
    );
    const mismatch = violations.filter(v => v.code === "hours_mismatch");
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0].messageAr).toContain("5سا مقررة");
  });

  it("flags practical hours that were scheduled as ordinary lessons", () => {
    const violations = validateTimetable(
      tinyInput([
        requirement({
          subjectId: "physics",
          nameAr: "العلوم الفيزيائية",
          weeklyHours: 2,
          practicalHours: 2,
        }),
      ]),
      [
        session({
          subjectId: "physics",
          teacherId: "t-physics",
          kind: "lecture",
        }),
      ]
    );
    expect(
      violations.filter(v => v.code === "hours_mismatch").length
    ).toBeGreaterThan(0);
  });

  it("flags a subject that is not part of the stream's curriculum", () => {
    const violations = validateTimetable(
      tinyInput([requirement({ weeklyHours: 2 })]),
      [session({ subjectId: "law", teacherId: "t-mathematics" })]
    );
    expect(codes(violations)).toContain("unknown_subject");
  });

  it("keeps every stream template internally coherent", () => {
    for (const template of SECONDARY_STREAM_TEMPLATES) {
      const total = templateWeeklyTotal(template);
      // A week of 5 days × (4 morning + 4 afternoon) hours = 40 hours.
      const weekCapacity =
        DEFAULT_GRID.days.length *
        (DEFAULT_GRID.morningSlots + DEFAULT_GRID.afternoonSlots);
      expect(total).toBeLessThanOrEqual(weekCapacity);
      expect(total).toBeGreaterThan(20);
      expect(template.subjects.filter(s => s.pe)).toHaveLength(1);
      for (const subject of template.subjects) {
        expect(subject.practicalHours ?? 0).toBeLessThanOrEqual(
          subject.weeklyHours
        );
      }
      // No subject listed twice in the same stream.
      const ids = template.subjects.map(s => s.subjectId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

// ---------------------------------------------------------------------------
// End to end: a real stream, generated and re-validated
// ---------------------------------------------------------------------------

describe("generateTimetable on a real secondary stream", () => {
  const sections = [
    sectionFromTemplate("3AS-experimental-sciences", "3 ع ت 1"),
    sectionFromTemplate("3AS-experimental-sciences", "3 ع ت 2"),
  ];
  const input: TimetableInput = {
    sections,
    teachers: staffFor(sections),
    options: { seed: 7, maxRestarts: 12 },
  };
  const result = generateTimetable(input);

  it("produces a timetable with no hard violation", () => {
    expect(result.assignmentProblems).toEqual([]);
    expect(result.unplaced).toEqual([]);
    expect(hardViolations(result.violations)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("schedules exactly the ministerial hours of every subject (rule 10)", () => {
    expect(result.stats.placedHours).toBe(result.stats.requiredHours);
    for (const section of sections) {
      for (const requirementRow of section.requirements) {
        const hours = result.sessions
          .filter(
            s =>
              s.sectionId === section.id &&
              s.subjectId === requirementRow.subjectId
          )
          .reduce((sum, s) => sum + s.hours, 0);
        expect(hours).toBe(requirementRow.weeklyHours);
      }
    }
  });

  it("keeps every pupil's half-day contiguous from its official start (rules 2, 3)", () => {
    for (const section of sections) {
      for (const day of DEFAULT_GRID.days) {
        for (const halfDay of ["morning", "afternoon"] as const) {
          const slots = result.sessions
            .filter(
              s =>
                s.sectionId === section.id &&
                s.day === day &&
                s.halfDay === halfDay
            )
            .flatMap(s =>
              Array.from({ length: s.hours }, (_, i) => s.startSlot + i)
            )
            .sort((a, b) => a - b);
          if (!slots.length) continue;
          expect(slots[0]).toBe(0);
          expect(slots).toEqual(slots.map((_, i) => i));
          // Rule 4: never a single hour.
          expect(slots.length).not.toBe(1);
        }
      }
    }
  });

  it("keeps the stream's core subjects in the morning (rule 6)", () => {
    const coreIds = sections[0].requirements
      .filter(r => r.core)
      .map(r => r.subjectId);
    expect(coreIds.length).toBeGreaterThan(0);
    const afternoonCore = result.sessions.filter(
      s => coreIds.includes(s.subjectId) && s.halfDay === "afternoon"
    );
    expect(afternoonCore).toEqual([]);
  });

  it("closes the half-day with physical education (rule 7)", () => {
    const peSessions = result.sessions.filter(s => s.kind === "pe");
    expect(peSessions.length).toBeGreaterThan(0);
    for (const pe of peSessions) {
      const lastSlot = Math.max(
        ...result.sessions
          .filter(
            s =>
              s.sectionId === pe.sectionId &&
              s.day === pe.day &&
              s.halfDay === pe.halfDay
          )
          .map(s => s.startSlot + s.hours - 1)
      );
      expect(pe.startSlot + pe.hours - 1).toBe(lastSlot);
    }
  });

  it("uses every working day for every class (rule 8)", () => {
    for (const section of sections) {
      const days = new Set(
        result.sessions.filter(s => s.sectionId === section.id).map(s => s.day)
      );
      expect(days.size).toBe(DEFAULT_GRID.days.length);
    }
  });

  it("frees each teacher's pedagogical half-day on their subject's ministerial day (rule 9)", () => {
    expect(result.pedagogicalExemptions.length).toBeGreaterThan(0);
    for (const exemption of result.pedagogicalExemptions) {
      // Nothing at all is scheduled for that teacher in that half-day.
      const busy = result.sessions.filter(
        s =>
          s.teacherId === exemption.teacherId &&
          s.day === exemption.day &&
          s.halfDay === exemption.halfDay
      );
      expect(busy).toEqual([]);
      // And the day is the ministerial one for their main subject.
      const official = OFFICIAL_PEDAGOGICAL_DAYS[exemption.subjectId];
      if (official) expect(exemption.day).toBe(official);
    }
    const math = result.pedagogicalExemptions.filter(
      e => e.subjectId === "mathematics"
    );
    expect(math.length).toBeGreaterThan(0);
    // One day for the whole subject, whatever the teacher.
    expect(new Set(math.map(e => e.day))).toEqual(new Set(["thursday"]));
  });

  it("never exceeds a teacher's statutory weekly load (rule 1)", () => {
    for (const load of summarizeTeacherLoads(input, result.sessions)) {
      expect(load.hours).toBeLessThanOrEqual(load.quota);
      expect(load.overtimeHours).toBe(0);
    }
  });

  it("re-validates cleanly through the independent validator", () => {
    const violations = validateTimetable(
      input,
      result.sessions,
      result.pedagogicalExemptions
    );
    expect(hardViolations(violations)).toEqual([]);
  });

  it("builds a printable week grid and an assignment sheet", () => {
    const grid = buildWeekGrid(DEFAULT_GRID, result.sessions, {
      sectionId: sections[0].id,
    });
    expect(grid).toHaveLength(
      DEFAULT_GRID.days.length *
        (DEFAULT_GRID.morningSlots + DEFAULT_GRID.afternoonSlots)
    );
    const filled = grid.filter(cell => cell.session);
    expect(filled.length).toBe(
      sections[0].requirements.reduce((sum, r) => sum + r.weeklyHours, 0)
    );

    const sheet = buildAssignmentSheet(input, result.sessions);
    expect(sheet.length).toBeGreaterThan(0);
    for (const row of sheet) {
      expect(row.weeklyHours).toBe(
        row.sections.reduce((sum, s) => sum + s.hours, 0)
      );
      expect(row.weeklyHours).toBeLessThanOrEqual(16);
    }
  });

  it("is deterministic for a given seed", () => {
    const again = generateTimetable(input);
    expect(again.sessions).toEqual(result.sessions);
  });
});

// ---------------------------------------------------------------------------
// A whole school
// ---------------------------------------------------------------------------

describe("generateTimetable for a whole secondary school", () => {
  // Sixteen classes over six streams — the size of a real lycée — with the
  // staffing a school actually has: several teachers per subject, and the
  // one-hour subjects (التربية المدنية) carried by the teacher of a
  // neighbouring subject rather than by a teacher of their own.
  const sections = [
    sectionFromTemplate("1AS-science-technology", "1 ج م ع ت 1"),
    sectionFromTemplate("1AS-science-technology", "1 ج م ع ت 2"),
    sectionFromTemplate("1AS-science-technology", "1 ج م ع ت 3"),
    sectionFromTemplate("1AS-letters", "1 ج م آ 1"),
    sectionFromTemplate("1AS-letters", "1 ج م آ 2"),
    sectionFromTemplate("1AS-letters", "1 ج م آ 3"),
    sectionFromTemplate("3AS-experimental-sciences", "3 ع ت 1"),
    sectionFromTemplate("3AS-experimental-sciences", "3 ع ت 2"),
    sectionFromTemplate("3AS-experimental-sciences", "3 ع ت 3"),
    sectionFromTemplate("3AS-mathematics", "3 ر 1"),
    sectionFromTemplate("3AS-technical-mathematics", "3 ت ر 1"),
    sectionFromTemplate("3AS-management-economics", "3 تس 1"),
    sectionFromTemplate("3AS-management-economics", "3 تس 2"),
    sectionFromTemplate("3AS-letters-philosophy", "3 آ ف 1"),
    sectionFromTemplate("3AS-letters-philosophy", "3 آ ف 2"),
    sectionFromTemplate("3AS-foreign-languages", "3 لغ 1"),
  ];
  const hoursPerSubject = new Map<string, number>();
  for (const section of sections) {
    for (const row of section.requirements) {
      hoursPerSubject.set(
        row.subjectId,
        (hoursPerSubject.get(row.subjectId) ?? 0) + row.weeklyHours
      );
    }
  }
  const teachers: Teacher[] = [];
  for (const [subjectId, hours] of hoursPerSubject) {
    if (subjectId === "civics") continue; // carried by history-geography
    const subjectIds =
      subjectId === "history-geography"
        ? ["history-geography", "civics"]
        : [subjectId];
    const count = Math.max(1, Math.ceil(hours / 13));
    for (let i = 0; i < count; i++) {
      teachers.push({
        id: `${subjectId}-${i + 1}`,
        name: `أستاذ ${subjectId} ${i + 1}`,
        rank: i === 0 ? "distinguished" : "standard",
        subjectIds,
      });
    }
  }
  const input: TimetableInput = { sections, teachers, options: { seed: 11 } };
  const result = generateTimetable(input);

  it("builds the whole school's week with every rule respected", () => {
    expect(result.assignmentProblems).toEqual([]);
    expect(result.unplaced).toEqual([]);
    expect(hardViolations(result.violations)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.placedHours).toBe(result.stats.requiredHours);
    expect(result.stats.placedHours).toBeGreaterThan(450);
  });

  it("never puts one teacher in two classes at the same hour", () => {
    const seen = new Set<string>();
    for (const s of result.sessions) {
      for (let i = 0; i < s.hours; i++) {
        const key = `${s.teacherId}|${s.day}|${s.halfDay}|${s.startSlot + i}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it("respects the 14-hour quota of every أستاذ مميز (rule 1)", () => {
    const loads = summarizeTeacherLoads(input, result.sessions);
    const distinguished = loads.filter(l => l.rank === "distinguished");
    expect(distinguished.length).toBeGreaterThan(0);
    for (const load of distinguished) {
      expect(load.quota).toBe(14);
      expect(load.hours).toBeLessThanOrEqual(14);
    }
  });

  it("keeps the ministerial pedagogical morning of the named subjects (rule 9)", () => {
    for (const [subjectId, day] of Object.entries(OFFICIAL_PEDAGOGICAL_DAYS)) {
      const taught = result.sessions.some(s => s.subjectId === subjectId);
      if (!taught) continue;
      const onOfficialMorning = result.sessions.filter(
        s =>
          s.subjectId === subjectId && s.day === day && s.halfDay === "morning"
      );
      expect(onOfficialMorning).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// Diagnostics when the constraints cannot be met
// ---------------------------------------------------------------------------

describe("diagnostics", () => {
  it("reports the subjects left without a teacher instead of failing silently", () => {
    const sections = [sectionFromTemplate("3AS-mathematics", "3 ر 1")];
    const result = generateTimetable({
      sections,
      teachers: [
        {
          id: "t-math",
          name: "أستاذ الرياضيات",
          rank: "distinguished",
          subjectIds: ["mathematics"],
        },
      ],
      options: { maxRestarts: 2, maxSteps: 5000 },
    });
    expect(result.ok).toBe(false);
    const missing = result.assignmentProblems.map(p => p.subjectId);
    expect(missing).toContain("physics");
    expect(missing).toContain("arabic");
    expect(missing).not.toContain("mathematics");
  });

  it("reports a subject whose hours exceed what its teachers may take", () => {
    const sections = [
      sectionFromTemplate("3AS-mathematics", "3 ر 1"),
      sectionFromTemplate("3AS-mathematics", "3 ر 2"),
      sectionFromTemplate("3AS-mathematics", "3 ر 3"),
    ];
    const result = generateTimetable({
      sections,
      teachers: [
        {
          id: "t-math",
          name: "أستاذ الرياضيات",
          rank: "distinguished",
          subjectIds: ["mathematics"],
        },
      ],
      options: { maxRestarts: 1, maxSteps: 2000 },
    });
    // 3 × 6h of mathematics against a 14h quota — the third section cannot
    // be served, and that is said explicitly.
    const mathProblems = result.assignmentProblems.filter(
      p => p.subjectId === "mathematics"
    );
    expect(mathProblems).toHaveLength(1);
    expect(mathProblems[0].messageAr).toContain("الرياضيات");
  });
});
