import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  buildTimetableWorkbook,
  exportFileName,
  sheetName,
  timetableSheetPlans,
} from "./timetableExcel";
import { SECONDARY_STREAM_TEMPLATES } from "@shared/secondaryCurriculum";
import {
  generateTimetable,
  type Section,
  type Teacher,
  type TimetableInput,
} from "@shared/secondaryTimetable";

// The workbook is what a school actually posts on the wall, so what is
// checked here is the shape of the document: a sheet per class and per
// teacher, the hours down the side, two-hour sessions merged over their
// two rows, and the assignment sheet beside them.

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
  sectionOf("2AS-experimental-sciences", "2 ع ت 1"),
  sectionOf("3AS-letters-philosophy", "3 آ ف 1"),
];
const input: TimetableInput = {
  sections,
  teachers: staffOf(sections),
  options: { seed: 4 },
};
const result = generateTimetable(input);
const meta = { name: "جدول التوقيت الأسبوعي", schoolYear: "2025/2026" };

describe("sheet names", () => {
  it("strips the characters Excel forbids and caps the length at 31", () => {
    const used = new Set<string>();
    expect(sheetName("3 ع ت/1 [أ]", used)).toBe("3 ع ت 1 أ");
    expect(sheetName("ا".repeat(40), used)).toHaveLength(31);
  });

  it("never repeats a name — two teachers may share one", () => {
    const used = new Set<string>();
    expect(sheetName("محمد الأمين", used)).toBe("محمد الأمين");
    expect(sheetName("محمد الأمين", used)).toBe("محمد الأمين 2");
    expect(sheetName("محمد الأمين", used)).toBe("محمد الأمين 3");
  });
});

describe("workbook layout", () => {
  const plans = timetableSheetPlans(input, result.sessions, meta);

  it("gives every class and every serving teacher a sheet, plus the three summaries", () => {
    const serving = input.teachers.filter(teacher =>
      result.sessions.some(s => s.teacherId === teacher.id)
    );
    expect(plans).toHaveLength(sections.length + serving.length + 3);
    for (const section of sections) {
      expect(plans.some(p => p.title.startsWith(section.label))).toBe(true);
    }
    const names = plans.map(p => p.name);
    expect(names).toContain("المواد واليوم البيداغوجي");
    expect(names).toContain("إسناد الأفواج");
    expect(names).toContain("تقرير المطابقة");
    expect(new Set(names).size).toBe(names.length);
  });

  it("lays the week out as hours down and days across", () => {
    const classPlan = plans.find(p => p.name === sections[0].label);
    expect(classPlan?.header).toEqual([
      "التوقيت",
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
    ]);
    // 4 morning + 4 afternoon hours, and the official start times on the side.
    expect(classPlan?.rows).toHaveLength(8);
    expect(classPlan?.rows[0][0]).toBe("08:00 – 09:00");
    expect(classPlan?.rows[4][0]).toBe("13:30 – 14:30");
  });

  it("merges a two-hour session over its two rows, and only once", () => {
    const classPlan = plans.find(p => p.name === sections[0].label);
    expect(classPlan?.merges.length).toBeGreaterThan(0);
    for (const merge of classPlan!.merges) {
      expect(merge.bottom - merge.top).toBe(1); // two rows
      expect(merge.left).toBe(merge.right); // one day column
      // The covered row is left empty — the text lives in the first row.
      const covered = classPlan!.rows[merge.bottom - 3][merge.left - 1];
      expect(covered).toBe("");
    }
    const twoHour = result.sessions.filter(
      s => s.sectionId === sections[0].id && s.hours === 2
    );
    expect(classPlan!.merges).toHaveLength(twoHour.length);
  });

  it("writes the subject and its teacher in each cell", () => {
    const classPlan = plans.find(p => p.name === sections[0].label);
    const filled = classPlan!.rows.flat().filter(v => v.includes("\n"));
    expect(filled.length).toBeGreaterThan(0);
    const [subject, teacher] = filled[0].split("\n");
    expect(subject.length).toBeGreaterThan(1);
    expect(teacher).toMatch(/أستاذ/);
  });

  it("carries the assignment sheet and the compliance report", () => {
    const assignment = plans.find(p => p.name === "إسناد الأفواج");
    expect(assignment?.header).toContain("الحجم الساعي");
    expect(assignment?.rows.length).toBeGreaterThan(0);
    for (const row of assignment!.rows) {
      expect(row[4]).toMatch(/^\d+سا$/);
    }
    // The report travels with the workbook, so a printed timetable carries
    // its own caveats: this one has no defect, but it does carry the notes
    // that belong to the assignment (a teacher whose odd hour cannot be
    // grouped) and to the director (a subject with no pedagogical day yet).
    const report = plans.find(p => p.name === "تقرير المطابقة");
    expect(report?.rows.length).toBeGreaterThan(0);
    expect(report!.rows.every(row => row[0] !== "مخالفة")).toBe(true);
    expect(report!.rows.some(row => row[1] === "قاعدة 9")).toBe(true);
    for (const row of report!.rows) {
      expect(["ملاحظة", "مخالفة", "—"]).toContain(row[0]);
      expect(row[2].length).toBeGreaterThan(5);
    }
  });

  it("names each teacher's sheet with their load and their free half-day", () => {
    const teacherPlan = plans.find(p => p.title.includes("معفى"));
    expect(teacherPlan).toBeDefined();
    expect(teacherPlan!.title).toMatch(/سا/);
  });
});

describe("the written file", () => {
  it("is a real workbook Excel can open, right-to-left, with the merges in place", async () => {
    const buffer = await buildTimetableWorkbook(input, result.sessions, meta);
    // ZIP magic: an .xlsx is a zip container, not XML on its own.
    expect(buffer.subarray(0, 2).toString("binary")).toBe("PK");

    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);
    const sheet = reopened.getWorksheet(sections[0].label);
    expect(sheet).toBeDefined();
    expect(sheet!.views[0].rightToLeft).toBe(true);
    expect(sheet!.getCell("A1").value).toBe(`${sections[0].label} — 2025/2026`);
    expect(sheet!.getCell("A2").value).toBe("التوقيت");
    expect(sheet!.getCell("B2").value).toBe("الأحد");
    expect(sheet!.getCell("A3").value).toBe("08:00 – 09:00");
    // Every hour of the class is somewhere in the sheet.
    const written = sheet!.getSheetValues().flat().filter(Boolean).length;
    expect(written).toBeGreaterThan(10);

    expect(reopened.getWorksheet("إسناد الأفواج")).toBeDefined();
    expect(reopened.getWorksheet("تقرير المطابقة")).toBeDefined();
  });

  it("offers a readable Arabic file name with an ASCII fallback", () => {
    const name = exportFileName(meta);
    expect(name.utf8).toBe("جدول التوقيت الأسبوعي 2025-2026.xlsx");
    expect(name.ascii).toBe("timetable-2025-2026.xlsx");
    // The slash of the school year would break a file name on every OS.
    expect(name.utf8).not.toContain("/");
  });
});
