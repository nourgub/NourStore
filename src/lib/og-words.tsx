import type { CSSProperties } from "react";

/**
 * Satori (used by next/og's ImageResponse) doesn't reliably lay out
 * multi-word `direction: rtl` text — words can render with no space between
 * them, or in the wrong order, and the bug resurfaces even in plain LTR text
 * once Satori's line-measurement pass kicks in (observed on some strings but
 * not others at different font sizes, with no clean single rule). Two
 * changes sidestep it reliably:
 *   1. Reverse the word order ourselves and lay out LTR: the last word ends
 *      up leftmost, the first word rightmost — the correct RTL reading
 *      order — while each word's internal Arabic shaping (letter joining)
 *      is script-based, not direction-based, so it's unaffected.
 *   2. Render each word as its own flex child with an explicit `gap`
 *      instead of a literal space character in one text run, so there's no
 *      shared text-measurement pass across words that can drop the space.
 * Callers must still keep this to a single line (truncate long text, size
 * the font to fit) — the same bug affects multi-line wrapped RTL-ish text.
 */
export function ogWords(text: string, style?: CSSProperties) {
  const words = text.split(" ").reverse();
  return (
    <div style={{ display: "flex", flexWrap: "nowrap", gap: 14, ...style }}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>{word}</span>
      ))}
    </div>
  );
}

export function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
