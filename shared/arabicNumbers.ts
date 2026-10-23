// Numbers written out in Arabic words, for voices that cannot read digits
// (TassiliTTS: "the model cannot process numerical digits"). Plain,
// unvocalized Modern Standard Arabic forms, which Algerian speakers read
// naturally for numbers ("ألفان وأربعة وعشرون"). Only the text sent to the
// voice is changed: the screen keeps the digits.

const UNITS = ["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function below1000(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  if (rest) {
    if (rest < 10) parts.push(UNITS[rest]);
    else if (rest < 20) parts.push(TEENS[rest - 10]);
    else {
      const unit = rest % 10;
      const tens = Math.floor(rest / 10);
      parts.push(unit ? `${UNITS[unit]} و${TENS[tens]}` : TENS[tens]);
    }
  }
  return parts.join(" و");
}

/** One scale (thousands, millions…) with its count: ألف, ألفان, ثلاثة آلاف, أحد عشر ألفا. */
function scaled(count: number, one: string, two: string, few: string): string {
  if (count === 1) return one;
  if (count === 2) return two;
  if (count >= 3 && count <= 10) return `${below1000(count)} ${few}`;
  return `${below1000(count)} ${one}`;
}

/** A non-negative integer in words (up to 999 999 999 999). */
export function integerToArabicWords(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`not a supported integer: ${value}`);
  if (value === 0) return UNITS[0];
  if (value >= 1e12) return String(value).split("").map(digit => UNITS[Number(digit)]).join(" ");
  const billions = Math.floor(value / 1e9);
  const millions = Math.floor((value % 1e9) / 1e6);
  const thousands = Math.floor((value % 1e6) / 1e3);
  const rest = value % 1e3;
  const parts: string[] = [];
  if (billions) parts.push(scaled(billions, "مليار", "ملياران", "مليارات"));
  if (millions) parts.push(scaled(millions, "مليون", "مليونان", "ملايين"));
  if (thousands) parts.push(scaled(thousands, "ألف", "ألفان", "آلاف"));
  if (rest) parts.push(below1000(rest));
  return parts.join(" و");
}

/** A number as written ("2024", "3.5", "0,25", "007") in words. */
export function numberToArabicWords(raw: string): string {
  const [whole, fraction] = raw.replace(",", ".").split(".");
  // Leading zeros (a code, "007") are read digit by digit.
  const wholeWords =
    whole.length > 1 && whole.startsWith("0")
      ? whole.split("").map(digit => UNITS[Number(digit)]).join(" ")
      : integerToArabicWords(Number(whole));
  if (fraction === undefined || fraction === "") return wholeWords;
  // After the decimal point: "فاصلة" then the digits as a number (3.25 → ثلاثة فاصلة خمسة وعشرون),
  // or one by one when it starts with zeros (0.05 → صفر فاصلة صفر خمسة).
  const fractionWords = fraction.startsWith("0")
    ? fraction.split("").map(digit => UNITS[Number(digit)]).join(" ")
    : integerToArabicWords(Number(fraction));
  return `${wholeWords} فاصلة ${fractionWords}`;
}

/** Every number in the text written out in words; the rest untouched. */
export function spellNumbers(text: string): string {
  return text.replace(/\d+(?:[.,]\d+)?/g, match => ` ${numberToArabicWords(match)} `).replace(/\s+/g, " ").trim();
}

/** The name the voice-pack export (scripts/voice-pack/export.ts) uses. */
export const numbersInWords = spellNumbers;
