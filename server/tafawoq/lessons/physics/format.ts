// Helpers for the physics lessons: numbers rounded to significant figures
// and written the way the BAC writes them, nuclide symbols, and a guard
// that keeps multiple-choice options different.
import { sup } from "../../generators/core";

/** A value to `digits` significant figures, as a plain decimal ("0.0866", "1250", "−2.5"). */
export function sig(value: number, digits = 3): string {
  if (!Number.isFinite(value)) throw new Error(`not a number: ${value}`);
  if (value === 0) return "0";
  const rounded = Number(value.toPrecision(digits));
  const text = Math.abs(rounded) >= 1e-4 ? String(rounded) : rounded.toFixed(12).replace(/0+$/, "");
  return text.replace("-", "−");
}

/** The value rounded like sig(), as a number. */
export const round = (value: number, digits = 3) => Number(value.toPrecision(digits));

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const sub = (value: number) => String(value).replace(/\d/g, digit => SUBSCRIPTS[Number(digit)]);

/** ¹⁴₆C */
export const nuclide = (a: number, z: number, symbol: string) => `${sup(a)}${sub(z)}${symbol}`;

/** Element symbols by atomic number (only those the lessons use). */
export const ELEMENTS: Record<number, string> = {
  1: "H", 2: "He", 6: "C", 7: "N", 8: "O", 9: "F", 10: "Ne", 11: "Na", 12: "Mg", 15: "P", 16: "S",
  26: "Fe", 27: "Co", 28: "Ni", 38: "Sr", 39: "Y", 53: "I", 54: "Xe", 55: "Cs", 56: "Ba",
  82: "Pb", 83: "Bi", 84: "Po", 86: "Rn", 88: "Ra", 90: "Th", 91: "Pa", 92: "U", 93: "Np", 95: "Am",
};

/** True when no two options read the same. */
export function distinct(...options: string[]) {
  return new Set(options.map(option => option.replace(/\s+/g, " ").trim())).size === options.length;
}
