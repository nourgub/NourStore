import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WeekTable } from "./Timetable";
import { resolveGrid, type ScheduledSession } from "@shared/secondaryTimetable";

// The week table is the printed artefact a school posts on the wall, so
// what matters is that the hours read correctly: the official start times
// down the side, a two-hour session covering two rows exactly once, and an
// untouched half-day left blank.
const grid = resolveGrid({ morningSlots: 4, afternoonSlots: 3 });

const sessions: ScheduledSession[] = [
  {
    sectionId: "A",
    subjectId: "mathematics",
    teacherId: "t1",
    day: "sunday",
    halfDay: "morning",
    startSlot: 0,
    hours: 2,
    kind: "lecture",
  },
  {
    sectionId: "A",
    subjectId: "physics",
    teacherId: "t2",
    day: "sunday",
    halfDay: "morning",
    startSlot: 2,
    hours: 1,
    kind: "practical",
  },
  {
    sectionId: "A",
    subjectId: "physical-education",
    teacherId: "t3",
    day: "monday",
    halfDay: "afternoon",
    startSlot: 0,
    hours: 2,
    kind: "pe",
  },
];

const renderTable = () =>
  render(
    <WeekTable
      title="3 ع ت 1 — 2025/2026"
      grid={grid}
      sessions={sessions}
      filter={{ sectionId: "A" }}
      renderCell={session => <strong>{session.subjectId}</strong>}
    />
  );

// This project's vitest run has no globals, so cleanup is explicit — the
// same way the other component tests in this repo do it.
afterEach(() => cleanup());

describe("timetable week table", () => {
  it("labels the rows with the official start times of both periods", () => {
    renderTable();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("13:30")).toBeInTheDocument();
    expect(screen.getByText("الأحد")).toBeInTheDocument();
    expect(screen.getByText("الخميس")).toBeInTheDocument();
  });

  it("draws a two-hour session once, spanning two rows", () => {
    renderTable();
    const cells = screen.getAllByText("mathematics");
    expect(cells).toHaveLength(1);
    expect(cells[0].closest("td")?.getAttribute("rowspan")).toBe("2");
  });

  it("marks practical work and physical education distinctly", () => {
    renderTable();
    expect(screen.getByText("physics").closest("td")?.className).toContain(
      "tt-kind-practical"
    );
    expect(
      screen.getByText("physical-education").closest("td")?.className
    ).toContain("tt-kind-pe");
  });

  it("leaves the untouched half-days blank", () => {
    const { container } = renderTable();
    // 5 days × 7 hours = 35 slots; 5 hours are taken, and the two rows
    // covered by multi-hour sessions carry no cell of their own.
    expect(container.querySelectorAll("td.tt-empty").length).toBe(30);
    expect(container.querySelectorAll("td.tt-busy").length).toBe(3);
  });
});
