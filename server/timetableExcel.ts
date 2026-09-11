// Excel export of a secondary-school timetable.
//
// A school lives in Excel: the timetable is printed, posted, mailed to the
// education directorate and tweaked by hand there. So a saved timetable is
// offered as a real .xlsx workbook — one sheet per class, one per teacher,
// the subjects with their pedagogical day, the assignment sheet, and the
// remaining notes.
//
// The layout is decided by the pure `*Plan` functions below and rendered
// by `buildTimetableWorkbook`. That split is what makes the layout
// testable without opening a workbook, and it keeps every rule out of
// here: nothing in this file interprets the ten rules, it only lays out
// what shared/secondaryTimetable.ts produced.

import ExcelJS from "exceljs";
import {
  DAY_LABELS_AR,
  HALF_DAY_LABELS_AR,
  RANK_LABELS_AR,
  buildAssignmentSheet,
  buildWeekGrid,
  halfDaySlots,
  hoursByTeacherSubject,
  mainSubjectPerTeacher,
  resolveExemptions,
  resolveGrid,
  slotWindow,
  summarizeTeacherLoads,
  validateTimetable,
  type GridConfig,
  type PedagogicalExemption,
  type ScheduledSession,
  type TimetableInput,
} from "@shared/secondaryTimetable";

export type CellMerge = {
  /** 1-based row and column inside the sheet, title row included. */
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type SheetPlan = {
  /** Sheet tab name, already trimmed to Excel's rules. */
  name: string;
  /** Merged title line above the table. */
  title: string;
  header: string[];
  /** Body rows; an empty string leaves the cell blank. */
  rows: string[][];
  merges: CellMerge[];
  /** Column widths, in Excel's character units. */
  widths: number[];
  /** Rows (1-based, title included) to render as a week grid: bordered. */
  grid: boolean;
};

/**
 * Excel forbids : \\ / ? * [ ] in a sheet name, caps it at 31 characters,
 * and refuses duplicates — a school's class labels ("3 ع ت 1") are fine,
 * but a teacher's full name plus their subject is not, so names are cut
 * and de-duplicated here rather than failing at write time.
 */
export function sheetName(base: string, used: Set<string>): string {
  const cleaned =
    base
      .replace(/[:\\/?*[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || "ورقة";
  let candidate = cleaned;
  let suffix = 2;
  while (used.has(candidate)) {
    const tail = ` ${suffix++}`;
    candidate = `${cleaned.slice(0, 31 - tail.length)}${tail}`;
  }
  used.add(candidate);
  return candidate;
}

/** The time label of one row: "08:00 – 09:00". */
function slotLabel(
  grid: GridConfig,
  halfDay: "morning" | "afternoon",
  slot: number
) {
  const { startTime, endTime } = slotWindow(grid, halfDay, slot, 1);
  return `${startTime} – ${endTime}`;
}

/**
 * One week as days across and hours down, the shape a school timetable is
 * always written in. A two-hour session becomes one merged cell over its
 * two rows, exactly as it is drawn by hand.
 */
function weekGridPlan(
  input: TimetableInput,
  sessions: ScheduledSession[],
  filter: { sectionId?: string; teacherId?: string },
  describe: (session: ScheduledSession) => string,
  meta: { name: string; title: string; used: Set<string> }
): SheetPlan {
  const grid = resolveGrid(input.grid);
  const cells = buildWeekGrid(grid, sessions, filter);
  const rowKeys: Array<{ halfDay: "morning" | "afternoon"; slot: number }> = [];
  for (const halfDay of ["morning", "afternoon"] as const) {
    for (let slot = 0; slot < halfDaySlots(grid, halfDay); slot++) {
      rowKeys.push({ halfDay, slot });
    }
  }

  const rows: string[][] = [];
  const merges: CellMerge[] = [];
  // Row 1 is the title and row 2 the header, so body row `i` sits on
  // sheet row i + 3.
  const sheetRowOf = (index: number) => index + 3;

  rowKeys.forEach(({ halfDay, slot }, index) => {
    const row: string[] = [slotLabel(grid, halfDay, slot)];
    grid.days.forEach((day, dayIndex) => {
      const cell = cells.find(
        c => c.day === day && c.halfDay === halfDay && c.slot === slot
      );
      if (!cell?.session) {
        row.push("");
        return;
      }
      if (cell.spanHours === 0) {
        // Covered by the session that started above: left empty, the merge
        // recorded when that session was written.
        row.push("");
        return;
      }
      row.push(describe(cell.session));
      if (cell.spanHours > 1) {
        merges.push({
          top: sheetRowOf(index),
          left: dayIndex + 2,
          bottom: sheetRowOf(index + cell.spanHours - 1),
          right: dayIndex + 2,
        });
      }
    });
    rows.push(row);
  });

  return {
    name: sheetName(meta.name, meta.used),
    title: meta.title,
    header: ["التوقيت", ...grid.days.map(day => DAY_LABELS_AR[day])],
    rows,
    merges,
    widths: [16, ...grid.days.map(() => 22)],
    grid: true,
  };
}

/** إسناد الأفواج التربوية للأساتذة — the sheet posted beside the timetable. */
function assignmentPlan(
  input: TimetableInput,
  sessions: ScheduledSession[],
  used: Set<string>
): SheetPlan {
  const loads = summarizeTeacherLoads(input, sessions);
  const rows = buildAssignmentSheet(input, sessions).map(row => {
    const load = loads.find(l => l.teacherId === row.teacherId);
    return [
      row.subjectNameAr,
      row.teacherName,
      RANK_LABELS_AR[row.rank],
      row.sections.map(s => `${s.label} (${s.hours}سا)`).join(" — "),
      `${row.weeklyHours}سا`,
      load ? `${load.quota}سا` : "",
      load && load.overtimeHours > 0 ? `${load.overtimeHours}سا` : "—",
    ];
  });
  return {
    name: sheetName("إسناد الأفواج", used),
    title: "إسناد الأفواج التربوية للأساتذة",
    header: [
      "المادة",
      "الاسم واللقب",
      "الرتبة",
      "الأقسام المسندة",
      "الحجم الساعي",
      "الحجم المستحق",
      "ساعات إضافية",
    ],
    rows,
    merges: [],
    widths: [22, 24, 22, 46, 14, 14, 14],
    grid: false,
  };
}

/** المواد: the pedagogical day of each subject and who is exempt when. */
function subjectsPlan(
  input: TimetableInput,
  sessions: ScheduledSession[],
  exemptions: PedagogicalExemption[],
  used: Set<string>
): SheetPlan {
  const nameOf = (subjectId: string) => {
    for (const section of input.sections) {
      const row = section.requirements.find(r => r.subjectId === subjectId);
      if (row) return row.nameAr;
    }
    return subjectId;
  };
  const loads = summarizeTeacherLoads(input, sessions);
  const rows = exemptions
    .map(exemption => {
      const teacher = input.teachers.find(t => t.id === exemption.teacherId);
      const load = loads.find(l => l.teacherId === exemption.teacherId);
      return [
        nameOf(exemption.subjectId),
        DAY_LABELS_AR[exemption.day],
        teacher?.name ?? exemption.teacherId,
        HALF_DAY_LABELS_AR[exemption.halfDay],
        exemption.chosen ? "اختيار الأستاذ" : "اختاره النظام",
        load ? `${load.hours}سا` : "",
      ];
    })
    .sort(
      (a, b) => a[0].localeCompare(b[0], "ar") || a[2].localeCompare(b[2], "ar")
    );
  return {
    name: sheetName("المواد واليوم البيداغوجي", used),
    title: "اليوم البيداغوجي لكل مادة والفترة المُعفاة لكل أستاذ",
    header: [
      "المادة",
      "اليوم البيداغوجي",
      "الأستاذ",
      "الفترة المُعفاة",
      "مصدر الاختيار",
      "الحجم الساعي",
    ],
    rows,
    merges: [],
    widths: [24, 18, 24, 20, 18, 14],
    grid: false,
  };
}

/** The compliance report, so a printed workbook carries its own caveats. */
function reportPlan(
  input: TimetableInput,
  sessions: ScheduledSession[],
  exemptions: PedagogicalExemption[],
  used: Set<string>
): SheetPlan {
  const violations = validateTimetable(input, sessions, exemptions);
  const rows = violations.map(violation => [
    violation.severity === "hard" ? "مخالفة" : "ملاحظة",
    `قاعدة ${violation.rule}`,
    violation.messageAr,
  ]);
  if (!rows.length) rows.push(["—", "—", "كل القواعد محترمة."]);
  return {
    name: sheetName("تقرير المطابقة", used),
    title: "تقرير المطابقة مع القواعد",
    header: ["النوع", "القاعدة", "التفصيل"],
    rows,
    merges: [],
    widths: [12, 12, 110],
    grid: false,
  };
}

/**
 * Every sheet of the workbook, in the order a school reads them: the
 * classes first (what pupils see), then the teachers, then the subjects,
 * the assignment sheet and the report.
 */
export function timetableSheetPlans(
  input: TimetableInput,
  sessions: ScheduledSession[],
  meta: { schoolYear: string }
): SheetPlan[] {
  const used = new Set<string>();
  const exemptions = resolveExemptions(
    input,
    mainSubjectPerTeacher(hoursByTeacherSubject(sessions)),
    { day: () => resolveGrid(input.grid).days[0], halfDay: () => "morning" }
  );

  const plans: SheetPlan[] = [];
  for (const section of input.sections) {
    plans.push(
      weekGridPlan(
        input,
        sessions,
        { sectionId: section.id },
        session => {
          const requirement = section.requirements.find(
            r => r.subjectId === session.subjectId
          );
          const teacher = input.teachers.find(t => t.id === session.teacherId);
          const subject = requirement?.nameAr ?? session.subjectId;
          const practical = session.kind === "practical" ? " (أ.ت)" : "";
          return `${subject}${practical}\n${teacher?.name ?? session.teacherId}`;
        },
        {
          name: section.label,
          title: `${section.label} — ${meta.schoolYear}`,
          used,
        }
      )
    );
  }

  const sectionLabel = (sectionId: string) =>
    input.sections.find(s => s.id === sectionId)?.label ?? sectionId;
  const subjectName = (sectionId: string, subjectId: string) =>
    input.sections
      .find(s => s.id === sectionId)
      ?.requirements.find(r => r.subjectId === subjectId)?.nameAr ?? subjectId;

  for (const teacher of input.teachers) {
    const mine = sessions.filter(s => s.teacherId === teacher.id);
    if (!mine.length) continue; // no service, no sheet
    const exemption = exemptions.find(e => e.teacherId === teacher.id);
    plans.push(
      weekGridPlan(
        input,
        sessions,
        { teacherId: teacher.id },
        session =>
          `${sectionLabel(session.sectionId)}\n${subjectName(
            session.sectionId,
            session.subjectId
          )}${session.kind === "practical" ? " (أ.ت)" : ""}`,
        {
          name: teacher.name,
          title:
            `${teacher.name} — ${RANK_LABELS_AR[teacher.rank]} — ` +
            `${mine.reduce((sum, s) => sum + s.hours, 0)}سا` +
            (exemption
              ? ` — معفى ${DAY_LABELS_AR[exemption.day]} ${
                  HALF_DAY_LABELS_AR[exemption.halfDay]
                }`
              : ""),
          used,
        }
      )
    );
  }

  plans.push(subjectsPlan(input, sessions, exemptions, used));
  plans.push(assignmentPlan(input, sessions, used));
  plans.push(reportPlan(input, sessions, exemptions, used));
  return plans;
}

const THIN_BORDER = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

/** Renders the plans into a real workbook, right-to-left and print-ready. */
export async function buildTimetableWorkbook(
  input: TimetableInput,
  sessions: ScheduledSession[],
  meta: { name: string; schoolYear: string }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nourix Academy";
  workbook.created = new Date();

  for (const plan of timetableSheetPlans(input, sessions, meta)) {
    const sheet = workbook.addWorksheet(plan.name, {
      // The whole document is Arabic: Excel mirrors the columns itself, so
      // the logical order stays التوقيت first.
      views: [{ rightToLeft: true, state: "frozen", ySplit: 2 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
      },
    });

    sheet.columns = plan.widths.map(width => ({ width }));

    const titleRow = sheet.addRow([plan.title]);
    titleRow.font = { bold: true, size: 13 };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(1, 1, 1, plan.header.length);
    titleRow.height = 24;

    const headerRow = sheet.addRow(plan.header);
    headerRow.font = { bold: true };
    headerRow.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    headerRow.eachCell(cell => {
      cell.border = THIN_BORDER;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3E7C0" },
      };
    });

    for (const row of plan.rows) {
      const added = sheet.addRow(row);
      added.alignment = {
        horizontal: plan.grid ? "center" : "right",
        vertical: "middle",
        wrapText: true,
      };
      if (plan.grid) {
        added.height = 30;
        added.eachCell({ includeEmpty: true }, cell => {
          cell.border = THIN_BORDER;
        });
      } else {
        added.eachCell(cell => {
          cell.border = THIN_BORDER;
        });
      }
    }

    for (const merge of plan.merges) {
      sheet.mergeCells(merge.top, merge.left, merge.bottom, merge.right);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * A download name a school recognises, with the ASCII fallback browsers
 * that cannot read the encoded form need.
 */
export function exportFileName(meta: { name: string; schoolYear: string }): {
  ascii: string;
  utf8: string;
} {
  const year = meta.schoolYear.replace("/", "-");
  const utf8 = `${meta.name} ${year}.xlsx`.replace(/[\\/:*?"<>|]/g, " ");
  return { ascii: `timetable-${year}.xlsx`, utf8 };
}
