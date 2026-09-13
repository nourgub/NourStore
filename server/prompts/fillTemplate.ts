// Shared placeholder filling for the teacher-assistant prompt templates.
//
// Every template in this directory is kept VERBATIM as its pedagogical
// author wrote it, with `{...}` markers for the per-request context. Two
// rules make that safe:
//
//   1. A placeholder that was never filled must fail loudly. Reaching Claude
//      as the literal text "{المستوى}" produces a confident, plausible answer
//      for the wrong level — the worst possible failure for a teacher.
//   2. The check must look for the *known* placeholder names, not for any
//      `{...}` shape. Two of these templates contain literal JSON braces in
//      their output-format block (e.g. {"الخطوة": "...", "النقاط": ...}),
//      and a generic regex would reject a perfectly filled prompt.

export function fillTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let filled = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    filled = filled.replaceAll(placeholder, value);
  }
  const leftover = Object.keys(replacements).find(placeholder =>
    filled.includes(placeholder)
  );
  if (leftover) {
    throw new Error(`Prompt still contains an unfilled placeholder: ${leftover}`);
  }
  return filled;
}
