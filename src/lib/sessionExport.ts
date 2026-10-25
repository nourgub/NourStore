import type { GeneratedQuestion, StudentPaper } from "./types";

// Pure CSV builder — no file I/O, so it's directly unit-testable. Excel
// needs a UTF-8 BOM to render Arabic correctly instead of mojibake; the
// caller (the download route) is responsible for prefixing it, since a BOM
// embedded in a string compared by tests would be easy to miss and awkward
// to assert on.
function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildSessionResultsCsv(papers: StudentPaper[], examQuestions: GeneratedQuestion[]): string {
  const header = [
    "اسم التلميذ",
    ...examQuestions.map((q, i) => `سؤال ${i + 1} (${q.points})`),
    "المجموع",
    "الحالة",
  ];

  const rows = papers.map((paper) => {
    const perQuestion = examQuestions.map((q) => {
      const result = paper.questionResults.find((r) => r.questionId === q.id);
      return result?.awardedPoints ?? "";
    });
    const total = paper.status === "approved" ? paper.approvedTotal : paper.draftTotal;
    const statusLabel =
      paper.status === "approved"
        ? "معتمدة"
        : paper.status === "graded"
          ? "مسودة (غير معتمدة)"
          : paper.status === "failed"
            ? "فشل التصحيح"
            : "قيد التصحيح";
    return [paper.studentName, ...perQuestion, total ?? "", statusLabel];
  });

  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}
