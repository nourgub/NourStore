// Secondary-school timetable engine (جدول التوقيت في الثانوي).
//
// Pure logic, deliberately free of any database or network access so it can
// be unit-tested directly (secondaryTimetable.test.ts) and also run in the
// browser to re-validate a timetable an administrator edited by hand.
//
// It encodes the ten rules a secondary-school timetable has to respect:
//
//  1. Weekly teaching quota by rank — أستاذ مميز 14h/week, every other rank
//     16h/week.
//  2. Every class starts its morning at 08:00 and its afternoon at 13:30 —
//     no class is ever brought in late into a half-day.
//  3. No hole in a pupil's day: the sessions of a half-day are contiguous.
//  4. No half-day worth a single hour, neither for a class nor a teacher —
//     a half-day is either free or carries at least two hours.
//  5. Practical work (أعمال تطبيقية) of the core subjects is preferably in
//     the morning — a preference, not a hard rule.
//  6. The stream's core subjects (المواد الأساسية للشعبة) must be in the
//     morning.
//  7. Physical education sits at the END of its half-day, morning or
//     afternoon.
//  8. Sessions are spread over the whole week: every working day is used,
//     and one subject never takes two sessions in the same day for the same
//     class.
//  9. Each subject keeps a pedagogical half-day: one morning per week with
//     no session of that subject anywhere, freeing all of its teachers —
//     and that morning is the one the ministry fixed for the subject
//     (OFFICIAL_PEDAGOGICAL_DAYS below), not an arbitrary day.
// 10. The ministerial weekly load per subject and per level is respected
//     exactly — no subject is short or over its hours.
//
// Rules 2 and 3 together mean a class's occupied slots in a half-day are
// always a contiguous block starting at the first slot. That is the single
// modelling decision the whole engine is built on: a half-day is stored as
// the ORDER of the sessions it holds, the first one starting at 08:00 (or
// 13:30) and each next one following immediately, so a late start or a
// hole in a pupil's day cannot even be represented.

// ---------------------------------------------------------------------------
// Grid: working days and the two daily periods
// ---------------------------------------------------------------------------

export const WORKING_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
] as const;

export type WorkingDay = (typeof WORKING_DAYS)[number];

export const DAY_LABELS_AR: Record<WorkingDay, string> = {
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
};

export type HalfDay = "morning" | "afternoon";

export const HALF_DAY_LABELS_AR: Record<HalfDay, string> = {
  morning: "الفترة الصباحية",
  afternoon: "الفترة المسائية",
};

export type GridConfig = {
  days: WorkingDay[];
  /** Rule 2: every class's morning starts here. */
  morningStart: string;
  /** Rule 2: every class's afternoon starts here. */
  afternoonStart: string;
  morningSlots: number;
  afternoonSlots: number;
  slotMinutes: number;
};

// Four morning hours from 08:00 (08:00–12:00) and four afternoon hours from
// 13:30 (13:30–17:30) — 40 schedulable hours a week. The fourth afternoon
// hour is the school's reserve: the heavier levels genuinely need it (the
// 1AS common core alone asks for 36 hours), and the engine scores it as a
// last resort so lighter streams still end their day at 16:30. A school
// that closes earlier sets afternoonSlots: 3.
export const DEFAULT_GRID: GridConfig = {
  days: [...WORKING_DAYS],
  morningStart: "08:00",
  afternoonStart: "13:30",
  morningSlots: 4,
  afternoonSlots: 4,
  slotMinutes: 60,
};

export function resolveGrid(partial?: Partial<GridConfig>): GridConfig {
  const grid = { ...DEFAULT_GRID, ...(partial ?? {}) };
  return {
    ...grid,
    days: partial?.days?.length ? partial.days : DEFAULT_GRID.days,
  };
}

export function halfDaySlots(grid: GridConfig, halfDay: HalfDay): number {
  return halfDay === "morning" ? grid.morningSlots : grid.afternoonSlots;
}

function parseClock(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Wall-clock window of `hours` slots starting at slot `startSlot`. */
export function slotWindow(
  grid: GridConfig,
  halfDay: HalfDay,
  startSlot: number,
  hours: number
): { startTime: string; endTime: string } {
  const base = parseClock(
    halfDay === "morning" ? grid.morningStart : grid.afternoonStart
  );
  const start = base + startSlot * grid.slotMinutes;
  return {
    startTime: formatClock(start),
    endTime: formatClock(start + hours * grid.slotMinutes),
  };
}

// ---------------------------------------------------------------------------
// Rule 9: the pedagogical day (اليوم البيداغوجي) is fixed per subject
// ---------------------------------------------------------------------------

/**
 * The morning each subject keeps free so its teachers can attend in-service
 * training, as fixed by the official organisation of pedagogical time:
 *
 *   الأحد     — التاريخ والجغرافيا
 *   الاثنين   — اللغة العربية، التربية الإسلامية
 *   الثلاثاء  — اللغات الأجنبية، الفلسفة
 *   الأربعاء  — الفيزياء، الكيمياء، العلوم الطبيعية
 *   الخميس    — الرياضيات، الاقتصاد والتسيير
 *
 * Subjects the note does not name (التكنولوجيا/الهندسة، الإعلام الآلي،
 * التربية البدنية) have no imposed day: the engine then picks whichever
 * morning it can keep free for them, which still satisfies rule 9.
 *
 * The note also allows the fixed day to be missed when it cannot be held
 * ("في حالة تعذر ذلك"), so the engine treats these days as strongly
 * preferred: it only moves a subject off its official day once no timetable
 * exists with it, and reports that move as a preference violation instead
 * of silently dropping it.
 */
export const OFFICIAL_PEDAGOGICAL_DAYS: Record<string, WorkingDay> = {
  "history-geography": "sunday",
  arabic: "monday",
  "islamic-sciences": "monday",
  civics: "monday",
  french: "tuesday",
  english: "tuesday",
  "third-language": "tuesday",
  philosophy: "tuesday",
  physics: "wednesday",
  chemistry: "wednesday",
  "natural-sciences": "wednesday",
  mathematics: "thursday",
  economics: "thursday",
  "accounting-management": "thursday",
  // القانون is not named in the note; it is grouped with التسيير here since
  // it is taught by the same teachers of شعبة تسيير واقتصاد.
  law: "thursday",
};

export const PEDAGOGICAL_DAY_SOURCE_AR =
  "تنظيم الزمن البيداغوجي والتكويني — مراسلة مدير التكوين بوزارة التربية " +
  "الوطنية رقم 195/1.2.5/2010 بتاريخ 2010/12/21، وإرسال مديرية التربية رقم " +
  "111/م.ب/2011 بتاريخ 2011/01/09.";

// ---------------------------------------------------------------------------
// Teachers: rank drives the weekly quota (rule 1)
// ---------------------------------------------------------------------------

export const TEACHER_RANKS = [
  "distinguished",
  "formateur",
  "principal",
  "standard",
] as const;

export type TeacherRank = (typeof TEACHER_RANKS)[number];

export const RANK_LABELS_AR: Record<TeacherRank, string> = {
  distinguished: "أستاذ مميز",
  formateur: "أستاذ مكوّن",
  principal: "أستاذ رئيسي",
  standard: "أستاذ التعليم الثانوي",
};

/** Rule 1: 14 hours a week for أستاذ مميز, 16 for every other rank. */
export const DISTINGUISHED_WEEKLY_HOURS = 14;
export const OTHER_RANKS_WEEKLY_HOURS = 16;

export function rankWeeklyQuota(rank: TeacherRank): number {
  return rank === "distinguished"
    ? DISTINGUISHED_WEEKLY_HOURS
    : OTHER_RANKS_WEEKLY_HOURS;
}

export type Teacher = {
  id: string;
  name: string;
  rank: TeacherRank;
  /** Subject keys this teacher can be assigned to. */
  subjectIds: string[];
  /**
   * Optional override, e.g. a part-time service. It may only LOWER the rank
   * quota — the ceiling of rule 1 is never raised from here.
   */
  maxWeeklyHours?: number;
  /**
   * Overtime hours (ساعات إضافية) explicitly granted on top of the rank
   * quota, as real assignment sheets do when a subject is short of
   * teachers. Zero by default: the engine never grants overtime by itself,
   * and any hour used here is reported so it stays a visible decision.
   */
  extraHours?: number;
};

/** Rule 1: the statutory weekly load of this teacher (14h or 16h). */
export function teacherQuota(teacher: Teacher): number {
  const rankQuota = rankWeeklyQuota(teacher.rank);
  return teacher.maxWeeklyHours != null
    ? Math.min(teacher.maxWeeklyHours, rankQuota)
    : rankQuota;
}

/** Statutory quota plus whatever overtime was explicitly granted. */
export function teacherCeiling(teacher: Teacher): number {
  return teacherQuota(teacher) + Math.max(0, teacher.extraHours ?? 0);
}

// ---------------------------------------------------------------------------
// Sections (أقسام/أفواج) and their ministerial subject loads
// ---------------------------------------------------------------------------

export type SubjectRequirement = {
  subjectId: string;
  nameAr: string;
  /** Rule 10: the ministerial weekly load, practicalHours included. */
  weeklyHours: number;
  /** Rule 5: the share of weeklyHours run as أعمال تطبيقية. */
  practicalHours?: number;
  /** Rule 6: a defining subject of the stream — morning only. */
  core?: boolean;
  /** Rule 7: التربية البدنية — always last in its half-day. */
  pe?: boolean;
  /** Rule 8: hours of this subject a class may take in one day (default 2). */
  maxHoursPerDay?: number;
};

export type Section = {
  id: string;
  label: string;
  level: string;
  /** Stream key, e.g. "3AS-experimental-sciences". */
  stream: string;
  requirements: SubjectRequirement[];
};

export type SessionKind = "lecture" | "practical" | "pe";

export type ScheduledSession = {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  day: WorkingDay;
  halfDay: HalfDay;
  /** 0 = the first slot of the half-day (08:00 or 13:30). */
  startSlot: number;
  hours: number;
  kind: SessionKind;
};

export type TimetableInput = {
  grid?: Partial<GridConfig>;
  sections: Section[];
  teachers: Teacher[];
  /** Pin a subject of a section to a specific teacher. */
  assignments?: Array<{
    sectionId: string;
    subjectId: string;
    teacherId: string;
  }>;
  /**
   * Rule 9 overrides, subjectId → morning kept free. Defaults to
   * OFFICIAL_PEDAGOGICAL_DAYS; a school whose direction fixed another day
   * passes it here.
   */
  pedagogicalDays?: Record<string, WorkingDay>;
  options?: {
    /** Deterministic restarts; same seed ⇒ same timetable. */
    seed?: number;
    /** Placement attempts per restart before giving up. */
    maxSteps?: number;
    /** Independent restarts, each with another pedagogical-day rotation. */
    maxRestarts?: number;
  };
};

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

export type ViolationCode =
  | "teacher_weekly_quota"
  | "teacher_overtime_hours"
  | "pedagogical_day_off_official"
  | "late_half_day_start"
  | "student_gap"
  | "section_single_hour_half_day"
  | "teacher_single_hour_half_day"
  | "practical_not_morning"
  | "core_subject_not_morning"
  | "pe_not_last"
  | "unused_day"
  | "subject_repeated_same_day"
  | "missing_pedagogical_morning"
  | "hours_mismatch"
  | "unknown_subject"
  | "unknown_teacher"
  | "teacher_subject_mismatch"
  | "section_double_booked"
  | "teacher_double_booked"
  | "over_capacity";

export type Violation = {
  code: ViolationCode;
  /** Which of the ten rules this belongs to (0 = structural sanity). */
  rule: number;
  severity: "hard" | "preference";
  messageAr: string;
  sectionId?: string;
  teacherId?: string;
  subjectId?: string;
  day?: WorkingDay;
  halfDay?: HalfDay;
};

// ---------------------------------------------------------------------------
// Splitting a weekly load into schedulable blocks
// ---------------------------------------------------------------------------

export type SessionBlock = {
  sectionId: string;
  subjectId: string;
  hours: number;
  kind: SessionKind;
};

/**
 * Cuts `hours` into 2h blocks with a trailing 1h when the load is odd —
 * the shape Algerian secondary timetables actually use, and the shape that
 * keeps rule 4 satisfiable (a 2h block can never be a lone hour). A
 * subject capped at one hour a day (rule 8, maxHoursPerDay) is cut into
 * single hours instead, so the cap holds by construction rather than being
 * reported as a violation afterwards.
 */
function splitHours(hours: number, longest: number): number[] {
  const blocks: number[] = [];
  const size = Math.max(1, Math.min(2, Math.floor(longest)));
  let left = Math.max(0, Math.floor(hours));
  while (left >= size) {
    blocks.push(size);
    left -= size;
  }
  if (left > 0) blocks.push(left);
  return blocks;
}

/** The blocks one section's requirement contributes to the week. */
export function requirementBlocks(
  sectionId: string,
  requirement: SubjectRequirement
): SessionBlock[] {
  const practical = Math.min(
    Math.max(0, requirement.practicalHours ?? 0),
    requirement.weeklyHours
  );
  const lecture = requirement.weeklyHours - practical;
  const kind: SessionKind = requirement.pe ? "pe" : "lecture";
  const longest = requirement.maxHoursPerDay ?? 2;
  return [
    ...splitHours(lecture, longest).map(hours => ({
      sectionId,
      subjectId: requirement.subjectId,
      hours,
      kind,
    })),
    ...splitHours(practical, longest).map(hours => ({
      sectionId,
      subjectId: requirement.subjectId,
      hours,
      kind: "practical" as SessionKind,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Teacher assignment (rule 1)
// ---------------------------------------------------------------------------

export type AssignmentProblem = {
  sectionId: string;
  subjectId: string;
  requiredHours: number;
  availableHours: number;
  messageAr: string;
};

type Assignment = { sectionId: string; subjectId: string; teacherId: string };

/**
 * Gives every (section, subject) pair one teacher of that subject who still
 * has room inside their rank quota (rule 1). Heaviest requirements go
 * first, and among the eligible teachers the one with the LEAST room still
 * sufficient takes it (best fit). Filling a service before opening the
 * next one is both what a school does when it hands out أفواج and what
 * rule 4 needs: hours grouped on fewer teachers leave fewer teachers
 * holding an isolated hour.
 */
export function assignTeachers(input: TimetableInput): {
  assignments: Assignment[];
  problems: AssignmentProblem[];
} {
  const assignments: Assignment[] = [];
  const problems: AssignmentProblem[] = [];
  const used = new Map<string, number>();
  const remaining = (teacher: Teacher) =>
    teacherCeiling(teacher) - (used.get(teacher.id) ?? 0);

  // Rule 6 keeps the core subjects in the morning, so a teacher of a core
  // subject can only ever use morning slots — and not the one their
  // subject's pedagogical morning takes (rule 9). Loading such a teacher
  // to the brim leaves the timetable no room to align their classes, so
  // core hours are spread over more teachers first and only pile up on one
  // when nobody else can take them.
  const grid = resolveGrid(input.grid);
  const coreMorningCapacity = (grid.days.length - 1) * grid.morningSlots;
  const coreSoftCap = Math.max(2, Math.floor(coreMorningCapacity * 0.75));
  const coreUsed = new Map<string, number>();

  const pinned = new Map<string, string>();
  for (const pin of input.assignments ?? []) {
    pinned.set(`${pin.sectionId}::${pin.subjectId}`, pin.teacherId);
  }

  type Demand = { section: Section; requirement: SubjectRequirement };
  const demands: Demand[] = [];
  for (const section of input.sections) {
    for (const requirement of section.requirements) {
      if (requirement.weeklyHours > 0) demands.push({ section, requirement });
    }
  }
  demands.sort((a, b) => b.requirement.weeklyHours - a.requirement.weeklyHours);

  for (const { section, requirement } of demands) {
    const key = `${section.id}::${requirement.subjectId}`;
    const pinnedId = pinned.get(key);
    const eligible = input.teachers.filter(
      teacher =>
        teacher.subjectIds.includes(requirement.subjectId) &&
        (pinnedId ? teacher.id === pinnedId : true)
    );
    const candidates = eligible
      .filter(teacher => remaining(teacher) >= requirement.weeklyHours)
      .sort((a, b) => remaining(a) - remaining(b));
    const chosen = requirement.core
      ? (candidates.find(
          teacher =>
            (coreUsed.get(teacher.id) ?? 0) + requirement.weeklyHours <=
            coreSoftCap
        ) ?? candidates[0])
      : candidates[0];
    if (!chosen) {
      const availableHours = eligible.reduce(
        (sum, teacher) => sum + Math.max(0, remaining(teacher)),
        0
      );
      problems.push({
        sectionId: section.id,
        subjectId: requirement.subjectId,
        requiredHours: requirement.weeklyHours,
        availableHours,
        messageAr: eligible.length
          ? `لا يوجد أستاذ متاح لمادة ${requirement.nameAr} في ${section.label}: ` +
            `مطلوب ${requirement.weeklyHours}سا والمتبقي من الحصص القانونية ${availableHours}سا.`
          : `لا يوجد أستاذ مكلّف بمادة ${requirement.nameAr} (${section.label}).`,
      });
      continue;
    }
    used.set(chosen.id, (used.get(chosen.id) ?? 0) + requirement.weeklyHours);
    if (requirement.core) {
      coreUsed.set(
        chosen.id,
        (coreUsed.get(chosen.id) ?? 0) + requirement.weeklyHours
      );
    }
    assignments.push({
      sectionId: section.id,
      subjectId: requirement.subjectId,
      teacherId: chosen.id,
    });
  }
  return { assignments, problems };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export type GenerateResult = {
  ok: boolean;
  sessions: ScheduledSession[];
  assignments: Assignment[];
  /** Blocks the solver could not place (empty when ok). */
  unplaced: SessionBlock[];
  assignmentProblems: AssignmentProblem[];
  violations: Violation[];
  /**
   * Morning kept free per subject (rule 9). `official` is false when the
   * ministerial day could not be held and another morning was freed
   * instead — the fallback the note itself allows.
   */
  pedagogicalMornings: Array<{
    subjectId: string;
    day: WorkingDay;
    official: boolean;
  }>;
  stats: {
    restarts: number;
    steps: number;
    placedHours: number;
    requiredHours: number;
  };
};

/** Small deterministic PRNG so restarts are reproducible from a seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SolverBlock = SessionBlock & {
  teacherId: string;
  core: boolean;
  isPe: boolean;
};

export function generateTimetable(input: TimetableInput): GenerateResult {
  const grid = resolveGrid(input.grid);
  const seed = input.options?.seed ?? 20260909;
  const maxRestarts = input.options?.maxRestarts ?? 6;

  const { assignments, problems } = assignTeachers({ ...input, grid });
  const assignmentByKey = new Map(
    assignments.map(a => [`${a.sectionId}::${a.subjectId}`, a.teacherId])
  );

  const requiredHours = input.sections.reduce(
    (sum, section) =>
      sum + section.requirements.reduce((s, r) => s + r.weeklyHours, 0),
    0
  );

  // Blocks to place, only for requirements that actually got a teacher.
  const blocks: SolverBlock[] = [];
  for (const section of input.sections) {
    for (const requirement of section.requirements) {
      const teacherId = assignmentByKey.get(
        `${section.id}::${requirement.subjectId}`
      );
      if (!teacherId) continue;
      for (const block of requirementBlocks(section.id, requirement)) {
        blocks.push({
          ...block,
          teacherId,
          core: Boolean(requirement.core),
          isPe: Boolean(requirement.pe),
        });
      }
    }
  }

  // Repair effort scales with the school: a couple of classes settle in a
  // few thousand moves, sixteen classes need a few hundred thousand. Each
  // restart stops as soon as nothing is broken, so a well-staffed school
  // never spends the whole budget.
  const maxSteps =
    input.options?.maxSteps ??
    Math.min(400_000, Math.max(40_000, blocks.length * 1500));

  const sectionIndex = new Map(input.sections.map((s, i) => [s.id, i]));
  const teacherIndex = new Map(input.teachers.map((t, i) => [t.id, i]));
  const subjectIds = Array.from(new Set(blocks.map(b => b.subjectId)));
  const subjectIndex = new Map(subjectIds.map((id, i) => [id, i]));
  const nSections = input.sections.length;
  const nTeachers = input.teachers.length;
  const nDays = grid.days.length;
  const nSubjects = subjectIds.length;
  const maxSlots = Math.max(grid.morningSlots, grid.afternoonSlots);
  const nCells = nSections * nDays * 2;

  // A "cell" is one class's half-day. Because rules 2 and 3 force the
  // sessions of a half-day to run without a hole from its official start,
  // a cell is fully described by the ORDER of the blocks it holds: the
  // first starts at 08:00 (or 13:30), each next one follows immediately.
  // Every operation below therefore works on cells, and contiguity can
  // never be broken by construction.
  const cellSection = new Int32Array(nCells);
  const cellDay = new Int32Array(nCells);
  const cellHalf = new Int32Array(nCells);
  for (let se = 0; se < nSections; se++) {
    for (let d = 0; d < nDays; d++) {
      for (let h = 0; h < 2; h++) {
        const ci = (se * nDays + d) * 2 + h;
        cellSection[ci] = se;
        cellDay[ci] = d;
        cellHalf[ci] = h;
      }
    }
  }
  const capacityOf = (h: number) =>
    halfDaySlots(grid, h === 0 ? "morning" : "afternoon");
  /** The last afternoon hour is the reserve — hours beyond it are counted. */
  const reserveSlot = 3;

  // Placement order: one class at a time, morning-bound core subjects
  // first, long blocks before short ones, physical education last of all
  // (rule 7 puts it at the end of its half-day, and appending it there is
  // exactly what the cell order does).
  const sectionOrder = new Map(input.sections.map((s, i) => [s.id, i]));
  const ordered = [...blocks].sort((a, b) => {
    const sa = sectionOrder.get(a.sectionId) ?? 0;
    const sb = sectionOrder.get(b.sectionId) ?? 0;
    if (sa !== sb) return sa - sb;
    if (a.isPe !== b.isPe) return a.isPe ? 1 : -1;
    if (a.core !== b.core) return a.core ? -1 : 1;
    if (a.hours !== b.hours) return b.hours - a.hours;
    return a.subjectId.localeCompare(b.subjectId);
  });

  const officialDays = {
    ...OFFICIAL_PEDAGOGICAL_DAYS,
    ...(input.pedagogicalDays ?? {}),
  };
  const officialDayIndex = subjectIds.map(subjectId => {
    const day = officialDays[subjectId];
    return day ? grid.days.indexOf(day) : -1;
  });

  let steps = 0;
  let restarts = 0;
  let best: {
    sessions: ScheduledSession[];
    violations: Violation[];
    hard: number;
    soft: number;
    unplaced: SessionBlock[];
    pedagogicalMornings: GenerateResult["pedagogicalMornings"];
  } | null = null;

  for (let attempt = 0; attempt < maxRestarts; attempt++) {
    restarts = attempt + 1;
    const random = mulberry32(seed + attempt * 7919);

    // Rule 9: the ministerial day of each subject. A subject with an
    // official day keeps it; the note allows missing it only when the
    // timetable cannot be built otherwise, so official days are rotated
    // only once half the restarts are spent. Subjects with no official day
    // (technology, computer science, PE) rotate from the first restart.
    const relaxOfficial = attempt >= Math.ceil(maxRestarts / 2);
    const pedagogicalDay = new Int32Array(nSubjects);
    for (let s = 0; s < nSubjects; s++) {
      const official = officialDayIndex[s];
      pedagogicalDay[s] =
        official >= 0 && !relaxOfficial
          ? official
          : (s + attempt + (official >= 0 ? official : 0)) % nDays;
    }
    const pedagogicalMornings: GenerateResult["pedagogicalMornings"] =
      subjectIds.map((subjectId, s) => ({
        subjectId,
        day: grid.days[pedagogicalDay[s]],
        official:
          officialDayIndex[s] < 0 || officialDayIndex[s] === pedagogicalDay[s],
      }));

    // --- state ----------------------------------------------------------
    const cells: SolverBlock[][] = Array.from({ length: nCells }, () => []);
    const occupancy = new Uint8Array(nTeachers * nDays * 2 * maxSlots);
    const teacherHalf = new Int32Array(nTeachers * nDays * 2);
    /** Hours of a class's half-day; indexed exactly like a cell. */
    const sectionHalf = new Int32Array(nCells);
    const sectionDay = new Int32Array(nSections * nDays);
    // Rule 8 counts lessons and practical work of the same subject
    // separately: a class never takes two LESSONS of a subject in one day,
    // but its practical hour is normally run right after the lesson, on
    // the same day, which is exactly how a school does it.
    const subjectDay = new Int32Array(nSections * nSubjects * nDays);
    const practicalDay = new Int32Array(nSections * nSubjects * nDays);

    // Some lone hours are impossible to remove, and counting them would
    // only send the search chasing a move that does not exist. A teacher's
    // isolated 1h block can only be grouped with an hour they teach
    // ELSEWHERE — another class, or another subject of the same class —
    // because rule 8 forbids the same subject twice in a class's day. So a
    // teacher holding a single group (one subject in one class) with an
    // odd load, or a whole week of one hour, is left out here and reported
    // by the validator as an assignment matter (in practice that hour goes
    // to a teacher of a neighbouring subject — التربية المدنية to the
    // history teacher, say).
    const teacherTotal = new Int32Array(nTeachers);
    const teacherGroups = input.teachers.map(() => new Set<string>());
    for (const block of ordered) {
      const t = teacherIndex.get(block.teacherId) as number;
      teacherTotal[t] += block.hours;
      teacherGroups[t].add(`${block.sectionId}::${block.subjectId}`);
    }
    const loneCounts = new Uint8Array(nTeachers);
    for (let t = 0; t < nTeachers; t++) {
      loneCounts[t] =
        teacherTotal[t] <= 1 || teacherGroups[t].size <= 1 ? 0 : 1;
    }

    // Every rule the search has to work for, counted as it happens.
    let clashes = 0; // two classes on one teacher at the same hour
    let teacherLone = 0; // rule 4, teacher side
    /** Lone half-days per teacher, so the search can find their other hours. */
    const teacherLoneCount = new Int32Array(nTeachers);
    let sectionLone = 0; // rule 4, class side
    let emptyDays = nSections * nDays; // rule 8
    let coreAfternoon = 0; // rule 6
    let pedagogicalMiss = 0; // rule 9
    let subjectRepeat = 0; // rule 8, same subject twice in a day
    let practicalAfternoon = 0; // rule 5 (a preference)
    let reserveHours = 0; // hours pushed into the late afternoon

    const hardPenalty = () =>
      clashes * 100 +
      coreAfternoon * 80 +
      pedagogicalMiss * 70 +
      emptyDays * 60 +
      subjectRepeat * 50 +
      sectionLone * 40 +
      teacherLone * 25;
    const totalPenalty = () =>
      hardPenalty() + practicalAfternoon * 3 + reserveHours;

    const addBlock = (
      block: SolverBlock,
      se: number,
      d: number,
      h: number,
      startSlot: number
    ) => {
      const t = teacherIndex.get(block.teacherId) as number;
      const su = subjectIndex.get(block.subjectId) as number;
      const base = ((t * nDays + d) * 2 + h) * maxSlots;
      for (let s = 0; s < block.hours; s++) {
        if (occupancy[base + startSlot + s] >= 1) clashes++;
        occupancy[base + startSlot + s]++;
      }
      const th = (t * nDays + d) * 2 + h;
      if (teacherHalf[th] === 1 && loneCounts[t]) {
        teacherLone--;
        teacherLoneCount[t]--;
      }
      teacherHalf[th] += block.hours;
      if (teacherHalf[th] === 1 && loneCounts[t]) {
        teacherLone++;
        teacherLoneCount[t]++;
      }
      const ci = (se * nDays + d) * 2 + h;
      if (sectionHalf[ci] === 1) sectionLone--;
      sectionHalf[ci] += block.hours;
      if (sectionHalf[ci] === 1) sectionLone++;
      const sd = se * nDays + d;
      if (sectionDay[sd] === 0) emptyDays--;
      sectionDay[sd] += block.hours;
      const sj = (se * nSubjects + su) * nDays + d;
      const lane = block.kind === "practical" ? practicalDay : subjectDay;
      if (lane[sj] >= 1) subjectRepeat++;
      lane[sj]++;
      if (block.core && h === 1) coreAfternoon += block.hours;
      if (h === 0 && pedagogicalDay[su] === d) pedagogicalMiss += block.hours;
      if (block.kind === "practical" && block.core && h === 1) {
        practicalAfternoon += block.hours;
      }
      if (h === 1) {
        reserveHours += Math.max(
          0,
          startSlot + block.hours - Math.min(reserveSlot, capacityOf(1))
        );
      }
    };

    const removeBlock = (
      block: SolverBlock,
      se: number,
      d: number,
      h: number,
      startSlot: number
    ) => {
      const t = teacherIndex.get(block.teacherId) as number;
      const su = subjectIndex.get(block.subjectId) as number;
      const base = ((t * nDays + d) * 2 + h) * maxSlots;
      for (let s = 0; s < block.hours; s++) {
        occupancy[base + startSlot + s]--;
        if (occupancy[base + startSlot + s] >= 1) clashes--;
      }
      const th = (t * nDays + d) * 2 + h;
      if (teacherHalf[th] === 1 && loneCounts[t]) {
        teacherLone--;
        teacherLoneCount[t]--;
      }
      teacherHalf[th] -= block.hours;
      if (teacherHalf[th] === 1 && loneCounts[t]) {
        teacherLone++;
        teacherLoneCount[t]++;
      }
      const ci = (se * nDays + d) * 2 + h;
      if (sectionHalf[ci] === 1) sectionLone--;
      sectionHalf[ci] -= block.hours;
      if (sectionHalf[ci] === 1) sectionLone++;
      const sd = se * nDays + d;
      sectionDay[sd] -= block.hours;
      if (sectionDay[sd] === 0) emptyDays++;
      const sj = (se * nSubjects + su) * nDays + d;
      const lane = block.kind === "practical" ? practicalDay : subjectDay;
      lane[sj]--;
      if (lane[sj] >= 1) subjectRepeat--;
      if (block.core && h === 1) coreAfternoon -= block.hours;
      if (h === 0 && pedagogicalDay[su] === d) pedagogicalMiss -= block.hours;
      if (block.kind === "practical" && block.core && h === 1) {
        practicalAfternoon -= block.hours;
      }
      if (h === 1) {
        reserveHours -= Math.max(
          0,
          startSlot + block.hours - Math.min(reserveSlot, capacityOf(1))
        );
      }
    };

    // Inserting or removing a block only shifts the blocks that FOLLOW it
    // in the cell, so only that suffix is re-counted. Appending to a cell
    // without physical education — by far the most common move — therefore
    // costs one block's worth of bookkeeping instead of the whole
    // half-day's, which is what makes the repair loop fast enough to run
    // tens of thousands of times.
    const startSlotAt = (ci: number, at: number) => {
      const list = cells[ci];
      let slot = 0;
      for (let i = 0; i < at; i++) slot += list[i].hours;
      return slot;
    };
    const unindexFrom = (ci: number, at: number) => {
      const list = cells[ci];
      let slot = startSlotAt(ci, at);
      for (let i = at; i < list.length; i++) {
        removeBlock(list[i], cellSection[ci], cellDay[ci], cellHalf[ci], slot);
        slot += list[i].hours;
      }
    };
    const indexFrom = (ci: number, at: number) => {
      const list = cells[ci];
      let slot = startSlotAt(ci, at);
      for (let i = at; i < list.length; i++) {
        addBlock(list[i], cellSection[ci], cellDay[ci], cellHalf[ci], slot);
        slot += list[i].hours;
      }
    };

    /** Physical education stays at the end of the half-day (rule 7). */
    const attach = (ci: number, block: SolverBlock): number => {
      const list = cells[ci];
      const last = list.length - 1;
      const at =
        !block.isPe && last >= 0 && list[last].isPe ? last : list.length;
      unindexFrom(ci, at);
      list.splice(at, 0, block);
      indexFrom(ci, at);
      return at;
    };
    const detach = (ci: number, at: number): SolverBlock => {
      unindexFrom(ci, at);
      const [block] = cells[ci].splice(at, 1);
      indexFrom(ci, at);
      return block;
    };
    const fits = (ci: number, block: SolverBlock) =>
      sectionHalf[ci] + block.hours <= capacityOf(cellHalf[ci]);

    /**
     * Every half-day of a class this block could legally occupy, written
     * into a scratch buffer — the repair loop calls this on every
     * iteration and must not allocate.
     */
    const candidateCells = new Int32Array(nDays * 2);
    const collectCells = (se: number, block: SolverBlock): number => {
      let count = 0;
      for (let d = 0; d < nDays; d++) {
        for (let h = 0; h < 2; h++) {
          const ci = (se * nDays + d) * 2 + h;
          if (fits(ci, block)) candidateCells[count++] = ci;
        }
      }
      return count;
    };

    // --- construction: each block into the cell that costs the least ----
    const unplaced: SessionBlock[] = [];
    for (const block of ordered) {
      const se = sectionIndex.get(block.sectionId) as number;
      let bestCell = -1;
      let bestCost = Infinity;
      const count = collectCells(se, block);
      for (let i = 0; i < count; i++) {
        const ci = candidateCells[i];
        const at = attach(ci, block);
        const cost = totalPenalty() + random() * 4;
        detach(ci, at);
        if (cost < bestCost) {
          bestCost = cost;
          bestCell = ci;
        }
      }
      if (bestCell < 0) {
        unplaced.push({
          sectionId: block.sectionId,
          subjectId: block.subjectId,
          hours: block.hours,
          kind: block.kind,
        });
        continue;
      }
      attach(bestCell, block);
    }

    // --- repair: move one block at a time, least conflicts first --------
    // Construction alone cannot satisfy rules that couple classes together
    // (one teacher in two classes at the same hour, a teacher left with a
    // lone hour). Repair moves a block involved in a broken rule to
    // wherever it costs least, which is what actually resolves them.
    const cellBreaksARule = (ci: number): boolean => {
      const list = cells[ci];
      if (!list.length) return false;
      const se = cellSection[ci];
      const d = cellDay[ci];
      const h = cellHalf[ci];
      if (sectionHalf[ci] === 1) return true;
      for (let dd = 0; dd < nDays; dd++) {
        if (sectionDay[se * nDays + dd] === 0) return true;
      }
      let slot = 0;
      for (const block of list) {
        const t = teacherIndex.get(block.teacherId) as number;
        const su = subjectIndex.get(block.subjectId) as number;
        const base = ((t * nDays + d) * 2 + h) * maxSlots;
        for (let s = 0; s < block.hours; s++) {
          if (occupancy[base + slot + s] > 1) return true;
        }
        if (teacherLoneCount[t] > 0) return true;
        if (block.core && h === 1) return true;
        if (h === 0 && pedagogicalDay[su] === d) return true;
        const lane = block.kind === "practical" ? practicalDay : subjectDay;
        if (lane[(se * nSubjects + su) * nDays + d] > 1) return true;
        slot += block.hours;
      }
      return false;
    };

    // The cells that currently break a rule, refreshed every so often
    // rather than rescanned on every iteration — the list only drifts
    // slowly, and rescanning it each time cost more than the moves did.
    const hotCells: number[] = [];
    let hotAge = 0;
    const refreshHotCells = () => {
      hotCells.length = 0;
      for (let ci = 0; ci < nCells; ci++) {
        if (cells[ci].length && cellBreaksARule(ci)) hotCells.push(ci);
      }
      hotAge = 0;
    };

    const pickBlock = (): { ci: number; at: number } | null => {
      if (hotAge >= 32 || !hotCells.length) refreshHotCells();
      hotAge++;
      const pool = hotCells.length ? hotCells : null;
      if (pool) {
        for (let tries = 0; tries < 8; tries++) {
          const ci = pool[Math.floor(random() * pool.length)];
          if (cells[ci].length) {
            return { ci, at: Math.floor(random() * cells[ci].length) };
          }
        }
      }
      for (let tries = 0; tries < 40; tries++) {
        const ci = Math.floor(random() * nCells);
        if (cells[ci].length) {
          return { ci, at: Math.floor(random() * cells[ci].length) };
        }
      }
      return null;
    };

    /**
     * Exchange two blocks of the same length between two half-days of one
     * class. When both half-days are full — the usual case once a class is
     * loaded — no single move is possible any more and only a swap can
     * still improve the timetable.
     */
    /** Replace the whole content of a half-day and recount it. */
    const setCell = (ci: number, list: SolverBlock[]) => {
      unindexFrom(ci, 0);
      cells[ci] = list;
      indexFrom(ci, 0);
    };
    const withSwapped = (
      list: SolverBlock[],
      out: SolverBlock,
      into: SolverBlock
    ) => list.map(block => (block === out ? into : block));

    const trySwap = (pick: { ci: number; at: number }): boolean => {
      const first = cells[pick.ci][pick.at];
      if (!first || first.isPe) return false;
      const se = cellSection[pick.ci];
      const savedHere = cells[pick.ci];
      const beforeHard = hardPenalty();
      const beforeTotal = totalPenalty();
      let bestPartner: SolverBlock | null = null;
      let bestCell = -1;
      let bestHard = beforeHard;
      let bestTotal = beforeTotal;
      // Every same-length partner in the class's other half-days is
      // tried, not just one at random: when a core subject is stuck in the
      // afternoon, the only cure is to trade it against a morning block,
      // and that partner has to be found rather than stumbled upon.
      // Swapping two blocks of equal length keeps each half-day's total
      // untouched, so capacity and the place of physical education can
      // never be disturbed by it.
      for (let d = 0; d < nDays; d++) {
        for (let h = 0; h < 2; h++) {
          const other = (se * nDays + d) * 2 + h;
          if (other === pick.ci) continue;
          const savedThere = cells[other];
          for (const partner of savedThere) {
            if (partner.isPe || partner.hours !== first.hours) continue;
            setCell(pick.ci, withSwapped(savedHere, first, partner));
            setCell(other, withSwapped(savedThere, partner, first));
            const hard = hardPenalty();
            const total = totalPenalty();
            setCell(pick.ci, savedHere);
            setCell(other, savedThere);
            if (hard < bestHard || (hard === bestHard && total < bestTotal)) {
              bestHard = hard;
              bestTotal = total;
              bestPartner = partner;
              bestCell = other;
            }
          }
        }
      }
      if (!bestPartner || bestCell < 0) return false;
      const savedThere = cells[bestCell];
      setCell(pick.ci, withSwapped(savedHere, first, bestPartner));
      setCell(bestCell, withSwapped(savedThere, bestPartner, first));
      return true;
    };

    let snapshot = cells.map(list => [...list]);
    let snapshotHard = hardPenalty();
    let snapshotTotal = totalPenalty();
    let iterations = 0;

    /** Put the whole week back to a saved state and recount from zero. */
    const restore = (saved: SolverBlock[][]) => {
      occupancy.fill(0);
      teacherHalf.fill(0);
      sectionHalf.fill(0);
      sectionDay.fill(0);
      subjectDay.fill(0);
      practicalDay.fill(0);
      teacherLoneCount.fill(0);
      clashes = 0;
      teacherLone = 0;
      sectionLone = 0;
      emptyDays = nSections * nDays;
      coreAfternoon = 0;
      pedagogicalMiss = 0;
      subjectRepeat = 0;
      practicalAfternoon = 0;
      reserveHours = 0;
      for (let ci = 0; ci < nCells; ci++) {
        cells[ci] = [...saved[ci]];
        indexFrom(ci, 0);
      }
      hotCells.length = 0;
    };

    let sinceImprovement = 0;
    // Cooling runs in cycles rather than one long ramp: each cycle heats
    // up enough to leave the corner it settled into and cools back down to
    // settle somewhere better. A bigger school needs longer cycles and
    // more patience before falling back to its best week.
    const cycleLength = Math.max(4000, Math.ceil(maxSteps / 6));
    const stagnationLimit = Math.max(3000, ordered.length * 25);

    while (iterations < maxSteps && hardPenalty() > 0) {
      iterations++;
      steps++;
      // Early in a cycle a worsening move is often accepted to get out of
      // a corner, late in it almost never, so the week settles.
      const phase = (iterations % cycleLength) / cycleLength;
      const temperature = 16 * (1 - phase) + 0.4;
      const pick = pickBlock();
      if (!pick) break;
      // One iteration in four tries a swap first; it is the only move that
      // helps once the half-days involved are full.
      if (random() < 0.25 && trySwap(pick)) {
        const hardNow = hardPenalty();
        const totalNow = totalPenalty();
        if (
          hardNow < snapshotHard ||
          (hardNow === snapshotHard && totalNow < snapshotTotal)
        ) {
          snapshot = cells.map(list => [...list]);
          snapshotHard = hardNow;
          snapshotTotal = totalNow;
        }
        continue;
      }
      const costBefore = totalPenalty();
      const block = detach(pick.ci, pick.at);
      const se = sectionIndex.get(block.sectionId) as number;
      const count = collectCells(se, block);
      if (!count) {
        attach(pick.ci, block);
        continue;
      }
      // One move in twelve is taken at random: without it the search sits
      // in a local minimum where every single move looks worse.
      let target = candidateCells[Math.floor(random() * count)];
      if (random() >= 1 / 12) {
        let bestCost = Infinity;
        for (let i = 0; i < count; i++) {
          const ci = candidateCells[i];
          const at = attach(ci, block);
          const cost = totalPenalty() + random();
          detach(ci, at);
          if (cost < bestCost) {
            bestCost = cost;
            target = ci;
          }
        }
      }
      const landed = attach(target, block);
      const costAfter = totalPenalty();
      // A move that makes things worse is kept only while the search is
      // still hot; otherwise it is undone. Without this the week drifts
      // instead of settling — the best state found gets left behind.
      if (
        costAfter > costBefore &&
        random() >= Math.exp(-(costAfter - costBefore) / temperature)
      ) {
        detach(target, landed);
        attach(pick.ci, block);
        continue;
      }
      const hard = hardPenalty();
      const total = totalPenalty();
      if (
        hard < snapshotHard ||
        (hard === snapshotHard && total < snapshotTotal)
      ) {
        snapshot = cells.map(list => [...list]);
        snapshotHard = hard;
        snapshotTotal = total;
        sinceImprovement = 0;
      } else if (++sinceImprovement >= stagnationLimit) {
        // Stuck: go back to the best week found and try again from there.
        restore(snapshot);
        sinceImprovement = 0;
      }
    }

    // --- polish: keep the rules, improve the preferences ----------------
    // Rule 5 (practical work in the morning) and the late-afternoon
    // reserve are preferences: they are only worth improving once nothing
    // is broken, and never at the cost of breaking something.
    if (hardPenalty() === 0) {
      const polishBudget = Math.min(4000, maxSteps);
      for (let i = 0; i < polishBudget && totalPenalty() > 0; i++) {
        iterations++;
        steps++;
        const pick = pickBlock();
        if (!pick) break;
        const before = totalPenalty();
        const block = detach(pick.ci, pick.at);
        const se = sectionIndex.get(block.sectionId) as number;
        let target = pick.ci;
        let bestCost = Infinity;
        const count = collectCells(se, block);
        for (let i = 0; i < count; i++) {
          const ci = candidateCells[i];
          const at = attach(ci, block);
          const cost = hardPenalty() > 0 ? Infinity : totalPenalty();
          detach(ci, at);
          if (cost < bestCost) {
            bestCost = cost;
            target = ci;
          }
        }
        attach(target, block);
        if (totalPenalty() > before) break;
      }
      if (hardPenalty() === 0 && totalPenalty() <= snapshotTotal) {
        snapshot = cells.map(list => [...list]);
        snapshotHard = 0;
        snapshotTotal = totalPenalty();
      }
    }

    // --- score this attempt against the independent validator -----------
    const sessions: ScheduledSession[] = [];
    for (let ci = 0; ci < nCells; ci++) {
      let slot = 0;
      for (const block of snapshot[ci]) {
        sessions.push({
          sectionId: block.sectionId,
          subjectId: block.subjectId,
          teacherId: block.teacherId,
          day: grid.days[cellDay[ci]],
          halfDay: cellHalf[ci] === 0 ? "morning" : "afternoon",
          startSlot: slot,
          hours: block.hours,
          kind: block.kind,
        });
        slot += block.hours;
      }
    }
    const violations = validateTimetable(
      { ...input, grid },
      sessions,
      pedagogicalMornings
    );
    const hard = violations.filter(v => v.severity === "hard").length;
    const soft = violations.length - hard;
    if (!best || hard < best.hard || (hard === best.hard && soft < best.soft)) {
      best = {
        sessions,
        violations,
        hard,
        soft,
        unplaced,
        pedagogicalMornings,
      };
    }
    if (best.hard === 0 && !best.unplaced.length) break;
  }

  const outcome = best ?? {
    sessions: [],
    violations: [] as Violation[],
    hard: 0,
    soft: 0,
    unplaced: [] as SessionBlock[],
    pedagogicalMornings: [] as GenerateResult["pedagogicalMornings"],
  };
  const placedHours = outcome.sessions.reduce((sum, s) => sum + s.hours, 0);

  return {
    ok:
      outcome.hard === 0 &&
      outcome.unplaced.length === 0 &&
      problems.length === 0,
    sessions: outcome.sessions,
    assignments,
    unplaced: outcome.unplaced,
    assignmentProblems: problems,
    violations: outcome.violations,
    pedagogicalMornings: outcome.pedagogicalMornings,
    stats: { restarts, steps, placedHours, requiredHours },
  };
}

// ---------------------------------------------------------------------------
// Validation — recomputed from the sessions alone
// ---------------------------------------------------------------------------

/**
 * Checks a timetable against all ten rules from the session list only, with
 * no help from the solver's internal state, so it is equally valid for a
 * generated timetable and for one an administrator edited by hand.
 */
export function validateTimetable(
  input: TimetableInput,
  sessions: ScheduledSession[],
  pedagogicalMornings?: Array<{
    subjectId: string;
    day: WorkingDay;
    official?: boolean;
  }>
): Violation[] {
  const grid = resolveGrid(input.grid);
  const violations: Violation[] = [];
  const sectionById = new Map(input.sections.map(s => [s.id, s]));
  const teacherById = new Map(input.teachers.map(t => [t.id, t]));
  const requirementOf = (sectionId: string, subjectId: string) =>
    sectionById
      .get(sectionId)
      ?.requirements.find(r => r.subjectId === subjectId);
  const subjectName = (sectionId: string, subjectId: string) =>
    requirementOf(sectionId, subjectId)?.nameAr ?? subjectId;
  const sectionLabel = (sectionId: string) =>
    sectionById.get(sectionId)?.label ?? sectionId;
  const teacherName = (teacherId: string) =>
    teacherById.get(teacherId)?.name ?? teacherId;

  // --- structural sanity: unknown references and capacity ----------------
  for (const session of sessions) {
    const section = sectionById.get(session.sectionId);
    if (!section) {
      violations.push({
        code: "unknown_subject",
        rule: 0,
        severity: "hard",
        sectionId: session.sectionId,
        messageAr: `حصة تشير إلى قسم غير معروف (${session.sectionId}).`,
      });
      continue;
    }
    if (!requirementOf(session.sectionId, session.subjectId)) {
      violations.push({
        code: "unknown_subject",
        rule: 10,
        severity: "hard",
        sectionId: session.sectionId,
        subjectId: session.subjectId,
        messageAr: `مادة ${session.subjectId} غير مقررة في ${section.label}.`,
      });
    }
    const teacher = teacherById.get(session.teacherId);
    if (!teacher) {
      violations.push({
        code: "unknown_teacher",
        rule: 0,
        severity: "hard",
        teacherId: session.teacherId,
        messageAr: `حصة تشير إلى أستاذ غير معروف (${session.teacherId}).`,
      });
    } else if (!teacher.subjectIds.includes(session.subjectId)) {
      violations.push({
        code: "teacher_subject_mismatch",
        rule: 0,
        severity: "hard",
        teacherId: session.teacherId,
        subjectId: session.subjectId,
        messageAr: `${teacher.name} غير مكلّف بمادة ${subjectName(
          session.sectionId,
          session.subjectId
        )}.`,
      });
    }
    const capacity = halfDaySlots(grid, session.halfDay);
    if (session.startSlot < 0 || session.startSlot + session.hours > capacity) {
      violations.push({
        code: "over_capacity",
        rule: 0,
        severity: "hard",
        sectionId: session.sectionId,
        subjectId: session.subjectId,
        day: session.day,
        halfDay: session.halfDay,
        messageAr:
          `حصة ${subjectName(session.sectionId, session.subjectId)} في ` +
          `${sectionLabel(session.sectionId)} تخرج عن حدود ` +
          `${HALF_DAY_LABELS_AR[session.halfDay]} يوم ${DAY_LABELS_AR[session.day]}.`,
      });
    }
  }

  // --- occupancy maps ----------------------------------------------------
  type Occupancy = Map<string, ScheduledSession[]>;
  const bySectionHalf: Occupancy = new Map();
  const byTeacherHalf: Occupancy = new Map();
  const halfKey = (id: string, day: WorkingDay, halfDay: HalfDay) =>
    `${id}::${day}::${halfDay}`;
  for (const session of sessions) {
    const sKey = halfKey(session.sectionId, session.day, session.halfDay);
    const tKey = halfKey(session.teacherId, session.day, session.halfDay);
    (bySectionHalf.get(sKey) ?? bySectionHalf.set(sKey, []).get(sKey)!).push(
      session
    );
    (byTeacherHalf.get(tKey) ?? byTeacherHalf.set(tKey, []).get(tKey)!).push(
      session
    );
  }

  const occupiedSlots = (list: ScheduledSession[]) => {
    const slots = new Map<number, ScheduledSession[]>();
    for (const session of list) {
      for (let s = 0; s < session.hours; s++) {
        const slot = session.startSlot + s;
        (slots.get(slot) ?? slots.set(slot, []).get(slot)!).push(session);
      }
    }
    return slots;
  };

  // --- rules 2, 3, 4, 7 per class half-day -------------------------------
  for (const section of input.sections) {
    for (const day of grid.days) {
      for (const halfDay of ["morning", "afternoon"] as HalfDay[]) {
        const list = bySectionHalf.get(halfKey(section.id, day, halfDay)) ?? [];
        if (!list.length) continue;
        const slots = occupiedSlots(list);

        for (const [slot, overlapping] of Array.from(slots.entries())) {
          if (overlapping.length > 1) {
            violations.push({
              code: "section_double_booked",
              rule: 0,
              severity: "hard",
              sectionId: section.id,
              day,
              halfDay,
              messageAr:
                `${section.label}: حصتان في نفس التوقيت ` +
                `(${slotWindow(grid, halfDay, slot, 1).startTime}) يوم ` +
                `${DAY_LABELS_AR[day]}.`,
            });
            break;
          }
        }

        const indexes = Array.from(slots.keys()).sort((a, b) => a - b);
        const first = indexes[0];
        const last = indexes[indexes.length - 1];
        // Rule 2: the half-day starts at its official time, never later.
        if (first !== 0) {
          violations.push({
            code: "late_half_day_start",
            rule: 2,
            severity: "hard",
            sectionId: section.id,
            day,
            halfDay,
            messageAr:
              `${section.label}: ${HALF_DAY_LABELS_AR[halfDay]} يوم ` +
              `${DAY_LABELS_AR[day]} لا تبدأ في ` +
              `${halfDay === "morning" ? grid.morningStart : grid.afternoonStart}.`,
          });
        }
        // Rule 3: no hole between two sessions of the same half-day.
        if (indexes.length !== last - first + 1) {
          violations.push({
            code: "student_gap",
            rule: 3,
            severity: "hard",
            sectionId: section.id,
            day,
            halfDay,
            messageAr:
              `${section.label}: فراغ في توقيت التلميذ ` +
              `${HALF_DAY_LABELS_AR[halfDay]} يوم ${DAY_LABELS_AR[day]}.`,
          });
        }
        // Rule 4: never a single hour for a class in a half-day.
        if (indexes.length === 1) {
          violations.push({
            code: "section_single_hour_half_day",
            rule: 4,
            severity: "hard",
            sectionId: section.id,
            day,
            halfDay,
            messageAr:
              `${section.label}: ساعة واحدة فقط ` +
              `${HALF_DAY_LABELS_AR[halfDay]} يوم ${DAY_LABELS_AR[day]} — ` +
              `يُتجنّب إحضار التلاميذ من أجل حصة واحدة.`,
          });
        }
        // Rule 7: physical education closes the half-day.
        for (const session of list) {
          const isPe =
            requirementOf(section.id, session.subjectId)?.pe ||
            session.kind === "pe";
          if (isPe && session.startSlot + session.hours - 1 !== last) {
            violations.push({
              code: "pe_not_last",
              rule: 7,
              severity: "hard",
              sectionId: section.id,
              subjectId: session.subjectId,
              day,
              halfDay,
              messageAr:
                `${section.label}: حصة التربية البدنية ليست في نهاية ` +
                `${HALF_DAY_LABELS_AR[halfDay]} يوم ${DAY_LABELS_AR[day]}.`,
            });
          }
        }
      }
    }

    // Rule 8: every working day carries sessions for the class.
    for (const day of grid.days) {
      const morning = bySectionHalf.get(halfKey(section.id, day, "morning"));
      const afternoon = bySectionHalf.get(
        halfKey(section.id, day, "afternoon")
      );
      if (!morning?.length && !afternoon?.length) {
        violations.push({
          code: "unused_day",
          rule: 8,
          severity: "hard",
          sectionId: section.id,
          day,
          messageAr: `${section.label}: يوم ${DAY_LABELS_AR[day]} فارغ تمامًا — الحصص يجب أن توزّع على كامل أيام الأسبوع.`,
        });
      }
    }

    // Rules 5, 6, 8 and 10 per subject of the class.
    for (const requirement of section.requirements) {
      const subjectSessions = sessions.filter(
        s => s.sectionId === section.id && s.subjectId === requirement.subjectId
      );
      const placedHours = subjectSessions.reduce((sum, s) => sum + s.hours, 0);
      // Rule 10: exactly the ministerial load, no more and no less.
      if (placedHours !== requirement.weeklyHours) {
        violations.push({
          code: "hours_mismatch",
          rule: 10,
          severity: "hard",
          sectionId: section.id,
          subjectId: requirement.subjectId,
          messageAr:
            `${section.label} – ${requirement.nameAr}: ` +
            `${placedHours}سا مبرمجة مقابل ${requirement.weeklyHours}سا مقررة.`,
        });
      }
      const practicalRequired = requirement.practicalHours ?? 0;
      if (practicalRequired > 0) {
        const practicalPlaced = subjectSessions
          .filter(s => s.kind === "practical")
          .reduce((sum, s) => sum + s.hours, 0);
        if (practicalPlaced !== practicalRequired) {
          violations.push({
            code: "hours_mismatch",
            rule: 10,
            severity: "hard",
            sectionId: section.id,
            subjectId: requirement.subjectId,
            messageAr:
              `${section.label} – ${requirement.nameAr}: ` +
              `${practicalPlaced}سا أعمال تطبيقية مقابل ${practicalRequired}سا مقررة.`,
          });
        }
      }
      for (const session of subjectSessions) {
        // Rule 6: core subjects of the stream stay in the morning.
        if (requirement.core && session.halfDay === "afternoon") {
          violations.push({
            code: "core_subject_not_morning",
            rule: 6,
            severity: "hard",
            sectionId: section.id,
            subjectId: requirement.subjectId,
            day: session.day,
            halfDay: "afternoon",
            messageAr:
              `${section.label} – ${requirement.nameAr}: مادة أساسية للشعبة ` +
              `مبرمجة مساءً يوم ${DAY_LABELS_AR[session.day]}.`,
          });
        }
        // Rule 5: practical work is better placed in the morning.
        if (
          session.kind === "practical" &&
          session.halfDay === "afternoon" &&
          requirement.core
        ) {
          violations.push({
            code: "practical_not_morning",
            rule: 5,
            severity: "preference",
            sectionId: section.id,
            subjectId: requirement.subjectId,
            day: session.day,
            halfDay: "afternoon",
            messageAr:
              `${section.label} – ${requirement.nameAr}: أعمال تطبيقية ` +
              `مبرمجة مساءً يوم ${DAY_LABELS_AR[session.day]} (الأفضل صباحًا).`,
          });
        }
      }
      // Rule 8: the weekly load is spread, not doubled up in one day. The
      // lesson and the practical hour of one subject are counted apart —
      // running the practical right after the lesson on the same day is
      // normal school practice, two LESSONS of a subject in one day is
      // not.
      const dailyCeiling = requirement.maxHoursPerDay ?? 2;
      for (const day of grid.days) {
        const sameDay = subjectSessions.filter(s => s.day === day);
        if (!sameDay.length) continue;
        const lessons = sameDay.filter(s => s.kind !== "practical");
        const practicals = sameDay.filter(s => s.kind === "practical");
        const lessonHours = lessons.reduce((sum, s) => sum + s.hours, 0);
        if (lessons.length > 1 || lessonHours > dailyCeiling) {
          violations.push({
            code: "subject_repeated_same_day",
            rule: 8,
            severity: "hard",
            sectionId: section.id,
            subjectId: requirement.subjectId,
            day,
            messageAr:
              `${section.label} – ${requirement.nameAr}: ${lessonHours}سا درس في ` +
              `يوم ${DAY_LABELS_AR[day]} — الحد ${dailyCeiling}سا وحصة واحدة في اليوم.`,
          });
        }
        if (practicals.length > 1) {
          violations.push({
            code: "subject_repeated_same_day",
            rule: 8,
            severity: "hard",
            sectionId: section.id,
            subjectId: requirement.subjectId,
            day,
            messageAr:
              `${section.label} – ${requirement.nameAr}: حصتا أعمال تطبيقية في ` +
              `يوم ${DAY_LABELS_AR[day]}.`,
          });
        }
      }
    }
  }

  // --- rules 1 and 4 per teacher -----------------------------------------
  const teacherHours = new Map<string, number>();
  for (const session of sessions) {
    teacherHours.set(
      session.teacherId,
      (teacherHours.get(session.teacherId) ?? 0) + session.hours
    );
  }
  for (const teacher of input.teachers) {
    const hours = teacherHours.get(teacher.id) ?? 0;
    const quota = teacherQuota(teacher);
    const ceiling = teacherCeiling(teacher);
    if (hours > ceiling) {
      violations.push({
        code: "teacher_weekly_quota",
        rule: 1,
        severity: "hard",
        teacherId: teacher.id,
        messageAr:
          `${teacher.name} (${RANK_LABELS_AR[teacher.rank]}): ` +
          `${hours}سا أسبوعيًا مقابل ${quota}سا مستحقة` +
          (ceiling > quota ? ` و${ceiling - quota}سا إضافية مرخّصة` : "") +
          ".",
      });
    } else if (hours > quota) {
      // Inside the granted overtime, but still worth showing: rule 1 fixes
      // the statutory load at 14h/16h and every extra hour is a decision.
      violations.push({
        code: "teacher_overtime_hours",
        rule: 1,
        severity: "preference",
        teacherId: teacher.id,
        messageAr:
          `${teacher.name} (${RANK_LABELS_AR[teacher.rank]}): ` +
          `${hours - quota}سا إضافية فوق ${quota}سا المستحقة.`,
      });
    }
    for (const day of grid.days) {
      for (const halfDay of ["morning", "afternoon"] as HalfDay[]) {
        const list = byTeacherHalf.get(halfKey(teacher.id, day, halfDay)) ?? [];
        if (!list.length) continue;
        const slots = occupiedSlots(list);
        for (const [slot, overlapping] of Array.from(slots.entries())) {
          if (overlapping.length > 1) {
            violations.push({
              code: "teacher_double_booked",
              rule: 0,
              severity: "hard",
              teacherId: teacher.id,
              day,
              halfDay,
              messageAr:
                `${teacher.name}: قسمان في نفس التوقيت ` +
                `(${slotWindow(grid, halfDay, slot, 1).startTime}) يوم ` +
                `${DAY_LABELS_AR[day]}.`,
            });
            break;
          }
        }
        // Rule 4 applies to the teacher too: no coming in for one hour.
        // A teacher whose whole week IS one hour is the exception — no
        // timetable can group a single hour with anything, so it is
        // reported as something to fix in the assignment (that hour
        // belongs to a teacher of a neighbouring subject), not as a
        // timetable defect.
        if (slots.size === 1) {
          // Only an hour the teacher teaches elsewhere can be grouped with
          // this one, so a teacher with a single class-and-subject group
          // and an odd load has no way out of rule 4.
          const groups = new Set(
            sessions
              .filter(s => s.teacherId === teacher.id)
              .map(s => `${s.sectionId}::${s.subjectId}`)
          );
          const unavoidable = hours <= 1 || groups.size <= 1;
          violations.push({
            code: "teacher_single_hour_half_day",
            rule: 4,
            severity: unavoidable ? "preference" : "hard",
            teacherId: teacher.id,
            day,
            halfDay,
            messageAr: unavoidable
              ? `${teacher.name}: ${hours}سا أسبوعيًا في فوج واحد ومادة واحدة، فتبقى ساعة ` +
                `منفردة (${DAY_LABELS_AR[day]} ${HALF_DAY_LABELS_AR[halfDay]}) ` +
                `لا يمكن ضمّها — المعالجة في الإسناد لا في الجدول: إضافة فوج ` +
                `آخر لهذا الأستاذ أو إسناد الساعة إلى أستاذ مادة قريبة.`
              : `${teacher.name}: ساعة واحدة فقط ` +
                `${HALF_DAY_LABELS_AR[halfDay]} يوم ${DAY_LABELS_AR[day]}.`,
          });
        }
      }
    }
  }

  // --- rule 9: a free morning per subject, the official one when it has one
  const officialDays = {
    ...OFFICIAL_PEDAGOGICAL_DAYS,
    ...(input.pedagogicalDays ?? {}),
  };
  const subjectsInPlay = new Set<string>(sessions.map(s => s.subjectId));
  for (const subjectId of Array.from(subjectsInPlay)) {
    const morningDays = new Set(
      sessions
        .filter(s => s.subjectId === subjectId && s.halfDay === "morning")
        .map(s => s.day)
    );
    const declared = pedagogicalMornings?.find(p => p.subjectId === subjectId);
    const anySection = sessions.find(s => s.subjectId === subjectId);
    const label = anySection
      ? subjectName(anySection.sectionId, subjectId)
      : subjectId;
    const freeMorning = grid.days.find(day => !morningDays.has(day));
    if (!freeMorning || (declared && morningDays.has(declared.day))) {
      violations.push({
        code: "missing_pedagogical_morning",
        rule: 9,
        severity: "hard",
        subjectId,
        messageAr: `مادة ${label}: لا يوجد نصف يوم صباحي مُعفى (اليوم البيداغوجي).`,
      });
      continue;
    }
    // The ministerial day itself: missing it is allowed when unavoidable
    // ("في حالة تعذر ذلك"), so it is reported as a preference.
    const official = officialDays[subjectId];
    if (official && morningDays.has(official)) {
      violations.push({
        code: "pedagogical_day_off_official",
        rule: 9,
        severity: "preference",
        subjectId,
        day: official,
        messageAr:
          `مادة ${label}: اليوم البيداغوجي الرسمي (${DAY_LABELS_AR[official]}) ` +
          `مبرمَج صباحًا؛ الإعفاء تم في ${
            declared ? DAY_LABELS_AR[declared.day] : DAY_LABELS_AR[freeMorning]
          } بدلًا منه.`,
      });
    }
  }

  return violations;
}

export function hardViolations(violations: Violation[]): Violation[] {
  return violations.filter(v => v.severity === "hard");
}

// ---------------------------------------------------------------------------
// Presentation helpers (shared by the API and the timetable screen)
// ---------------------------------------------------------------------------

export type GridCell = {
  day: WorkingDay;
  halfDay: HalfDay;
  slot: number;
  startTime: string;
  endTime: string;
  session: ScheduledSession | null;
  /** Set on the slot where a multi-hour session starts. */
  spanHours: number;
};

/** One class's (or teacher's) week as day × slot cells, ready to render. */
export function buildWeekGrid(
  grid: GridConfig,
  sessions: ScheduledSession[],
  filter: { sectionId?: string; teacherId?: string }
): GridCell[] {
  const mine = sessions.filter(
    s =>
      (filter.sectionId ? s.sectionId === filter.sectionId : true) &&
      (filter.teacherId ? s.teacherId === filter.teacherId : true)
  );
  const cells: GridCell[] = [];
  for (const day of grid.days) {
    for (const halfDay of ["morning", "afternoon"] as HalfDay[]) {
      const total = halfDaySlots(grid, halfDay);
      for (let slot = 0; slot < total; slot++) {
        const starting = mine.find(
          s => s.day === day && s.halfDay === halfDay && s.startSlot === slot
        );
        const covering = mine.find(
          s =>
            s.day === day &&
            s.halfDay === halfDay &&
            slot > s.startSlot &&
            slot < s.startSlot + s.hours
        );
        const { startTime, endTime } = slotWindow(grid, halfDay, slot, 1);
        cells.push({
          day,
          halfDay,
          slot,
          startTime,
          endTime,
          session: starting ?? covering ?? null,
          spanHours: starting ? starting.hours : 0,
        });
      }
    }
  }
  return cells;
}

export type TeacherLoad = {
  teacherId: string;
  name: string;
  rank: TeacherRank;
  /** Statutory weekly load, rule 1. */
  quota: number;
  /** Statutory load plus granted overtime. */
  ceiling: number;
  hours: number;
  /** Hours beyond the statutory quota (ساعات إضافية). */
  overtimeHours: number;
  /** Half-days with no session at all — includes the pedagogical one. */
  freeHalfDays: number;
};

export function summarizeTeacherLoads(
  input: TimetableInput,
  sessions: ScheduledSession[]
): TeacherLoad[] {
  const grid = resolveGrid(input.grid);
  return input.teachers.map(teacher => {
    const mine = sessions.filter(s => s.teacherId === teacher.id);
    const busy = new Set(mine.map(s => `${s.day}::${s.halfDay}`));
    const hours = mine.reduce((sum, s) => sum + s.hours, 0);
    const quota = teacherQuota(teacher);
    return {
      teacherId: teacher.id,
      name: teacher.name,
      rank: teacher.rank,
      quota,
      ceiling: teacherCeiling(teacher),
      hours,
      overtimeHours: Math.max(0, hours - quota),
      freeHalfDays: grid.days.length * 2 - busy.size,
    };
  });
}

export type AssignmentSheetRow = {
  subjectId: string;
  subjectNameAr: string;
  teacherId: string;
  teacherName: string;
  rank: TeacherRank;
  /** The class groups this teacher takes, with the hours of each. */
  sections: Array<{ sectionId: string; label: string; hours: number }>;
  /** الحجم الساعي — total weekly hours of this teacher. */
  weeklyHours: number;
};

/**
 * The teacher/class assignment sheet (إسناد الأفواج التربوية للأساتذة)
 * that goes with a timetable: one row per (subject, teacher) with the class
 * groups they take and their total weekly load.
 */
export function buildAssignmentSheet(
  input: TimetableInput,
  sessions: ScheduledSession[]
): AssignmentSheetRow[] {
  const sectionById = new Map(input.sections.map(s => [s.id, s]));
  const rows = new Map<string, AssignmentSheetRow>();
  for (const session of sessions) {
    const key = `${session.subjectId}::${session.teacherId}`;
    let row = rows.get(key);
    if (!row) {
      const teacher = input.teachers.find(t => t.id === session.teacherId);
      row = {
        subjectId: session.subjectId,
        subjectNameAr:
          sectionById
            .get(session.sectionId)
            ?.requirements.find(r => r.subjectId === session.subjectId)
            ?.nameAr ?? session.subjectId,
        teacherId: session.teacherId,
        teacherName: teacher?.name ?? session.teacherId,
        rank: teacher?.rank ?? "standard",
        sections: [],
        weeklyHours: 0,
      };
      rows.set(key, row);
    }
    const section = row.sections.find(s => s.sectionId === session.sectionId);
    if (section) {
      section.hours += session.hours;
    } else {
      row.sections.push({
        sectionId: session.sectionId,
        label: sectionById.get(session.sectionId)?.label ?? session.sectionId,
        hours: session.hours,
      });
    }
    row.weeklyHours += session.hours;
  }
  return Array.from(rows.values()).sort(
    (a, b) =>
      a.subjectNameAr.localeCompare(b.subjectNameAr, "ar") ||
      a.teacherName.localeCompare(b.teacherName, "ar")
  );
}
