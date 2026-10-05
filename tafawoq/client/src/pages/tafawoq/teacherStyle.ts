// How the teacher speaks — Fusha or Algerian Darja (server/tafawoq/darja.ts).
// A per-device preference, so it lives in localStorage; the page works the
// same (Fusha) when storage is unavailable.
import { useState } from "react";

export type TeacherStyle = "fusha" | "darja";

const KEY = "tfq-teacher-style";

function read(): TeacherStyle {
  try {
    return localStorage.getItem(KEY) === "darja" ? "darja" : "fusha";
  } catch {
    return "fusha";
  }
}

export function useTeacherStyle(): [TeacherStyle, (style: TeacherStyle) => void] {
  const [style, setStyle] = useState<TeacherStyle>(read);
  const update = (next: TeacherStyle) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: keep it for this visit only.
    }
    setStyle(next);
  };
  return [style, update];
}

/** Chat suggestions in Darja (what an Algerian student would type). */
export function darjaSuggestions(focus?: string): string[] {
  return ["سقسيني", focus ? `فهمني ${focus} بالحوار` : "فهمني بالحوار", "عطيني مثال", "علاش نغلط؟"];
}
