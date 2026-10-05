// Real fix for a real, visually-confirmed bug: "forward" and "back"
// buttons across the app used a hardcoded ArrowLeft/ArrowRight regardless
// of the actual reading direction. That happens to look correct in
// Arabic (RTL — "forward" visually flows right-to-left, so a forward
// arrow pointing left is correct) but was visually confirmed backwards
// for French/English (LTR) — e.g. "Explorer les parcours" pointed left
// instead of right. Confirmed via real screenshots (Playwright + a real
// Chrome binary) of the actual running app in both directions, not
// assumed from code alone.
//
// Use ForwardArrow for "continue / next / explore / start / go to X"
// actions, and BackArrow for "back / previous / return" actions — pass
// the same `dir` value ("ltr" | "rtl") every page already computes from
// `lang`.

import { ArrowLeft, ArrowRight } from "lucide-react";

type Dir = "ltr" | "rtl";

export function ForwardArrow({
  dir,
  size = 15,
}: {
  dir: Dir;
  size?: number;
}) {
  return dir === "rtl" ? (
    <ArrowLeft size={size} aria-hidden="true" />
  ) : (
    <ArrowRight size={size} aria-hidden="true" />
  );
}

export function BackArrow({ dir, size = 15 }: { dir: Dir; size?: number }) {
  return dir === "rtl" ? (
    <ArrowRight size={size} aria-hidden="true" />
  ) : (
    <ArrowLeft size={size} aria-hidden="true" />
  );
}
