// Tafawoq — turning a spoken (or casually typed) answer into something the
// grader understands. Speech recognition returns what the student *said*:
// "ناقص ثلاثة", "ستة إكس تربيع ناقص أربعة", "الجواب ب", "moins deux".
// spokenToAnswer() rewrites that into "-3" / "6x^2-4"; pickOption() maps
// a spoken choice ("ب", "الخيار الثاني", or the option's own text) to one
// of an MCQ's options.

const UNITS: Record<string, number> = {
  صفر: 0, واحد: 1, واحدة: 1, اثنان: 2, اثنين: 2, إثنين: 2, اثنتان: 2, ثلاثة: 3, ثلاث: 3, أربعة: 4, اربعة: 4, أربع: 4,
  خمسة: 5, خمس: 5, ستة: 6, ست: 6, سبعة: 7, سبع: 7, ثمانية: 8, ثمان: 8, تسعة: 9, تسع: 9, عشرة: 10, عشر: 10,
  // Darja
  زوج: 2, جوج: 2, ربعة: 4, ثمنية: 8, تمنية: 8,
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10,
};
const TEENS: Record<string, number> = {
  "أحد عشر": 11, "احدى عشر": 11, "اثنا عشر": 12, "اثني عشر": 12, "ثلاثة عشر": 13, "أربعة عشر": 14, "اربعة عشر": 14,
  "خمسة عشر": 15, "ستة عشر": 16, "سبعة عشر": 17, "ثمانية عشر": 18, "تسعة عشر": 19,
  // Darja: حداش، طناش، تلطاش…
  حداش: 11, حضاش: 11, طناش: 12, تناش: 12, تلطاش: 13, ربعطاش: 14, خمسطاش: 15, سطاش: 16, سبعطاش: 17, ثمنطاش: 18, تسعطاش: 19,
};
const TENS: Record<string, number> = {
  عشرون: 20, عشرين: 20, ثلاثون: 30, ثلاثين: 30, أربعون: 40, أربعين: 40, اربعين: 40, خمسون: 50, خمسين: 50,
  ستون: 60, ستين: 60, سبعون: 70, سبعين: 70, ثمانون: 80, ثمانين: 80, تسعون: 90, تسعين: 90,
  مئة: 100, مائة: 100, مية: 100, مئتان: 200, مئتين: 200,
};

const OPERATORS: Array<[RegExp, string]> = [
  [/ناقص|سالب|minus|moins/g, " - "],
  [/زائد|plus/g, " + "],
  [/ضرب|مضروب في|في\s(?=\d)|fois|times/g, " * "],
  [/على|مقسوم على|sur|over|divided by/g, " / "],
  [/تربيع|مربع|au carré|squared/g, "^2"],
  [/تكعيب|مكعب|au cube|cubed/g, "^3"],
  [/أس|اس|puissance|to the power/g, "^"],
  [/جذر|racine de|root of/g, " sqrt "],
  [/فاصلة|virgule|point/g, "."],
  [/يساوي|égale|equals/g, " = "],
  [/إكس|اكس|ixe/g, " x "],
  [/إن(?=\s|$)/g, " n "],
  [/آي(?=\s|$)/g, " i "],
];

function wordsToNumbers(text: string): string {
  let out = text;
  for (const [phrase, value] of Object.entries(TEENS)) out = out.replace(new RegExp(phrase, "g"), ` ${value} `);
  // "خمسة وعشرون" → 25
  out = out.replace(
    new RegExp(`(${Object.keys(UNITS).join("|")})\\s+و\\s*(${Object.keys(TENS).join("|")})`, "g"),
    (_, unit: string, ten: string) => ` ${UNITS[unit] + TENS[ten]} `
  );
  out = out.replace(new RegExp(`(?<![\\p{L}])(${Object.keys(TENS).join("|")})(?![\\p{L}])`, "gu"), (_, ten: string) => ` ${TENS[ten]} `);
  out = out.replace(new RegExp(`(?<![\\p{L}])(${Object.keys(UNITS).join("|")})(?![\\p{L}])`, "gu"), (_, unit: string) => ` ${UNITS[unit]} `);
  return out;
}

/**
 * Best-effort rewrite of a spoken answer into math. Leaves already-typed
 * math ("6x^2-4", "−3") untouched apart from whitespace.
 */
export function spokenToAnswer(raw: string): string {
  let text = raw
    .toLowerCase()
    .replace(/^(الجواب|الإجابة|الاجابة|جوابي|النتيجة|هو|هي|راهو|راهي|راه|نقول|la réponse est|c'est|ça fait|the answer is|it's)\s+/g, "")
    .replace(/^(هو|هي|يساوي|تساوي)\s+/g, "")
    .replace(/[؟?!.،,]$/g, "");
  text = wordsToNumbers(text);
  for (const [pattern, replacement] of OPERATORS) text = text.replace(pattern, replacement);
  return text
    .replace(/\s*\^\s*/g, "^")
    .replace(/(\d)\s+(?=[a-z(])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const LETTERS = ["أ", "ب", "ج", "د"];
const ORDINALS: Array<[RegExp, number]> = [
  [/الأول|الاول|أول|premier|first|\bA\b/i, 0],
  [/الثاني|ثاني|deuxième|second|\bB\b/i, 1],
  [/الثالث|ثالث|troisième|third|\bC\b/i, 2],
  [/الرابع|رابع|quatrième|fourth|\bD\b/i, 3],
];

/** Which MCQ option the student meant, or null if unclear. */
export function pickOption(raw: string, options: string[]): string | null {
  const text = raw.trim();
  const letter = text.match(/(?:^|\s|الخيار|الجواب|خيار|حرف)\s*([أابجد])(?:\s|$|[.؟?!])/);
  if (letter) {
    const index = LETTERS.indexOf(letter[1] === "ا" ? "أ" : letter[1]);
    if (index >= 0 && options[index] !== undefined) return options[index];
  }
  if (/^[أابجد]$/.test(text)) {
    const index = LETTERS.indexOf(text === "ا" ? "أ" : text);
    if (options[index] !== undefined) return options[index];
  }
  for (const [pattern, index] of ORDINALS) {
    if (pattern.test(text) && options[index] !== undefined) return options[index];
  }
  return null;
}

export const OPTION_LETTERS = LETTERS;
