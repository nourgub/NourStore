import { Document, Packer, Paragraph, Table, TableRow, WidthType } from "docx";
import type { LessonPrepRequest } from "../types";
import {
  bodyParagraph,
  boxedSection,
  headingParagraph,
  labelValueParagraph,
  metaParagraph,
  tableCell,
  titleParagraph,
} from "./common";

function buildTemplatedDocx(req: LessonPrepRequest, institutionLabel?: string): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [titleParagraph(`${institutionLabel ? `${institutionLabel} — ` : ""}${req.lessonTitle}`)];

  if (req.headerValues.length > 0) {
    children.push(boxedSection(req.headerValues.map((f) => labelValueParagraph(f.label, f.value))));
  }

  if (req.noteValues.length > 0) {
    children.push(boxedSection(req.noteValues.map((f) => labelValueParagraph(f.label, f.value))));
  }

  if (req.sourceFileNames.length > 0) {
    children.push(metaParagraph(`بالاستناد إلى: ${req.sourceFileNames.join("، ")}`));
  }

  const widthPct = Math.round(100 / req.tableColumns.length);
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: req.tableColumns.map((col) => tableCell(col, { header: true, widthPct })),
        }),
        ...req.tableRows.map(
          (row) =>
            new TableRow({
              children: row.cells.map((cellText) => tableCell(cellText, { widthPct })),
            }),
        ),
      ],
    }),
  );

  return children;
}

function buildGenericDocx(req: LessonPrepRequest): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    titleParagraph(`تحضير الدرس — ${req.lessonTitle}`),
    metaParagraph(
      `المستوى: ${req.gradeLevel}` +
        (req.sourceFileNames.length > 0 ? ` — بالاستناد إلى: ${req.sourceFileNames.join("، ")}` : ""),
    ),
  ];

  req.sections.forEach((s) => {
    children.push(headingParagraph(s.heading));
    children.push(bodyParagraph(s.body));
  });

  return children;
}

export async function buildLessonPrepDocx(req: LessonPrepRequest, institutionLabel?: string): Promise<Buffer> {
  const children = req.tableColumns.length > 0 ? buildTemplatedDocx(req, institutionLabel) : buildGenericDocx(req);

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
