// Numbers in Arabic words ("25" → "خمسة وعشرون"), for voices that read
// digits badly: an open model reads the words, the cache keeps the digits.
const UNITS = ["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

function belowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  if (rest >= 20) parts.push(rest % 10 ? `${UNITS[rest % 10]} و${TENS[Math.floor(rest / 10)]}` : TENS[Math.floor(rest / 10)]);
  else if (rest >= 10) parts.push(TEENS[rest - 10]);
  else if (rest || !hundreds) parts.push(UNITS[rest]);
  return parts.join(" و");
}

/** A whole number (0 ≤ n < 10⁹) in words. */
export function integerWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e9) return String(n);
  if (n < 1000) return belowThousand(n);
  const groups: Array<[number, [string, string, string]]> = [
    [1e6, ["مليون", "مليونان", "ملايين"]],
    [1e3, ["ألف", "ألفان", "آلاف"]],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, [one, two, few]] of groups) {
    const count = Math.floor(rest / size);
    rest %= size;
    if (!count) continue;
    if (count === 1) parts.push(one);
    else if (count === 2) parts.push(two);
    else if (count <= 10) parts.push(`${belowThousand(count)} ${few}`);
    else parts.push(`${belowThousand(count)} ${one}`);
  }
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" و");
}

/** Every number of a spoken sentence in words: "2.5" → "اثنان فاصل خمسة", "50%" → "خمسون بالمئة". */
export function numbersInWords(text: string): string {
  return text.replace(/(\d+)(?:[.,٫](\d+))?(%?)/g, (_, whole: string, decimals: string | undefined, percent: string) => {
    let words = integerWords(Number(whole));
    if (decimals) words += ` فاصل ${decimals.length <= 2 && !decimals.startsWith("0") ? integerWords(Number(decimals)) : decimals.split("").map(digit => UNITS[Number(digit)]).join(" ")}`;
    return percent ? `${words} بالمئة` : words;
  });
}
