// Teaching text as it is said aloud — shared by the browser (which speaks
// it) and the server (which synthesises the teacher's voice and caches it).
//
// Teaching content is written with unicode math (x², f′(x), −3, √, ≤…),
// which text-to-speech reads badly or skips. toSpokenArabic() rewrites it
// the way an Algerian teacher would say it aloud ("إكس تربيع", "ناقص 3",
// "إف مشتقة إكس") before it is spoken. The screen still shows the symbols.
//
// spokenChunks() cuts it into sentences: each sentence is synthesised once
// and cached, so the shorter and more regular they are, the more students
// share them. spokenSegments() tells the server which words of a sentence
// are maths (numbers, "إكس", "تربيع"…): the part that changes from one
// exercise to the next.

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "ⁿ": "n", "⁺": "+",
};
const SUBSCRIPT_DIGITS: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "ₙ": "n", "₊": "+",
};
const LETTERS: Record<string, string> = {
  x: "إكس", y: "واي", z: "زد", n: "إن", m: "إم", k: "كا", t: "تي", p: "بي", q: "كيو", r: "آر",
  a: "أ", b: "بي", c: "سي", d: "دي", f: "إف", g: "جي", h: "إتش", u: "يو", v: "في", w: "دبليو",
  i: "آي", e: "إي", A: "أ", B: "بي", C: "سي", D: "دي", M: "إم", P: "بي", I: "آي",
};
const WORDS: Array<[RegExp, string]> = [
  [/\blim\b/g, " نهاية "],
  [/\bln\b/g, " لوغاريتم "],
  [/\bexp\b/g, " أسية "],
  [/\bsin\b/g, " جيب "],
  [/\bcos\b/g, " جيب التمام "],
  [/\btan\b/g, " ظل "],
  [/\bRe\b/g, " الجزء الحقيقي "],
  [/\bIm\b/g, " الجزء التخيلي "],
];

function spokenExponent(raw: string): string {
  const exponent = raw.replace(/[()]/g, "");
  if (exponent === "2") return " تربيع";
  if (exponent === "3") return " تكعيب";
  return ` أس ${exponent.replace(/-/g, " ناقص ").replace(/\+/g, " زائد ")}`;
}

/** Rewrites unicode math inside Arabic text into spoken Arabic. */
export function toSpokenArabic(text: string): string {
  // Lettered choices ("ب: 9x") are read as "الخيار ب: …" with a pause.
  let out = text.replace(/(^|\n)\s*([أبجد])[):]\s*/g, "$1الخيار $2: ");
  // Dialogue markers: "❓ (2/4)" → "السؤال 2:", "💡" → "تلميح:", other icons silent.
  out = out
    .replace(/❓\s*\((\d+)\/\d+\)\s*/g, "السؤال $1: ")
    .replace(/💡\s*/g, "تلميح: ")
    .replace(/(?:🎯|✔|✅|🎉)\s*/g, "");
  // Exponents: x², xⁿ⁻¹, e^(2x+1), 2^n
  out = out.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻ⁿ⁺]+/g, run =>
    spokenExponent(Array.from(run).map(char => SUPERSCRIPT_DIGITS[char]).join(""))
  );
  out = out.replace(/\^\(([^)]*)\)|\^(-?\w+)/g, (_, group, single) => spokenExponent(group ?? single));
  // Subscripts: u₀, uₙ₊₁ → "يو صفر", "يو إن زائد 1"
  out = out.replace(/[₀₁₂₃₄₅₆₇₈₉ₙ₊]+/g, run =>
    " " + Array.from(run).map(char => SUBSCRIPT_DIGITS[char]).join("").replace(/\+/g, " زائد ")
  );
  // f′(x) → إف مشتقة إكس ; (uv)′ → … مشتقة ; z̄ → مرافق زد ; |z| → طويلة زد
  out = out
    .replace(/([a-zA-Z)])′/g, "$1 مشتقة ")
    .replace(/([a-zA-Z])\u0304/g, " مرافق $1")
    .replace(/\|([^|]+)\|/g, " طويلة $1 ");
  for (const [pattern, word] of WORDS) out = out.replace(pattern, word);
  out = out
    .replace(/√/g, " جذر ")
    .replace(/∞/g, " ما لا نهاية ")
    .replace(/→|⟶/g, " يؤول إلى ")
    .replace(/⟺|⇔/g, " يكافئ ")
    .replace(/⇒/g, " إذن ")
    .replace(/≤/g, " أصغر من أو يساوي ")
    .replace(/≥/g, " أكبر من أو يساوي ")
    .replace(/≠/g, " لا يساوي ")
    .replace(/≈/g, " تقريباً ")
    .replace(/±/g, " زائد أو ناقص ")
    .replace(/Δ/g, " دلتا ")
    .replace(/π/g, " باي ")
    .replace(/∈/g, " ينتمي إلى ")
    .replace(/ℝ/g, " مجموعة الأعداد الحقيقية ")
    .replace(/ℂ/g, " مجموعة الأعداد المركبة ")
    .replace(/[×·∙*]/g, " ضرب ")
    .replace(/÷/g, " على ")
    .replace(/(\S)\s*\/\s*(\S)/g, "$1 على $2")
    .replace(/\s=\s|=/g, " يساوي ")
    .replace(/<(?!=)/g, " أصغر من ")
    .replace(/>(?!=)/g, " أكبر من ")
    .replace(/\s\+\s|\+/g, " زائد ")
    .replace(/[−–]|(?<=\s|^|\()-/g, " ناقص ")
    .replace(/(?<=[a-zA-Z0-9)])\s*-\s*(?=[a-zA-Z0-9(])/g, " ناقص ");
  out = out.replace(/-/g, " ناقص ");
  // Runs of 2–3 lowercase letters left after the named functions are
  // products of variables ("4ac" → 4 أ سي).
  out = out.replace(/(?<![a-zA-Z])([a-z]{2,3})(?![a-zA-Z])/g, run => run.split("").join(" "));
  // Single latin letters used as variables (not inside a word).
  out = out.replace(/(?<![a-zA-Z])([a-zA-Z])(?![a-zA-Z])/g, (_, letter: string) => ` ${LETTERS[letter] ?? letter} `);
  return out
    .replace(/[✔✅⚠👋🎉💪👍()[\]{}|′]/g, " ")
    .replace(/[;؛]/g, "،")
    .replace(/\s+/g, " ")
    .replace(/ (?=[.،,:!؟?])/g, "")
    .trim();
}

/**
 * Spoken text in sentences, one per synthesis request (and cache entry):
 * lines first, then sentence ends. A sentence longer than the server's cap
 * is cut at commas, then at spaces.
 */
/** A letter or a digit: something to say. */
export const HAS_WORD = new RegExp("[\\p{L}\\p{N}]", "u");

export function spokenChunks(text: string, max = 180): string[] {
  const sentences = text
    .split(/\n+/)
    .map(toSpokenArabic)
    .flatMap(line => line.split(/(?<=[.!؟?:])\s+/))
    .map(sentence => sentence.trim())
    .filter(sentence => HAS_WORD.test(sentence));
  return sentences.flatMap(sentence => {
    if (sentence.length <= max) return [sentence];
    const pieces: string[] = [];
    for (const part of sentence.split(/(?<=[،,؛])\s+|\s+/)) {
      const last = pieces[pieces.length - 1];
      if (last !== undefined && last.length + part.length + 1 <= max && !/[،,؛]$/.test(last)) pieces[pieces.length - 1] = `${last} ${part}`;
      else if (last !== undefined && last.length + part.length + 1 <= max / 2) pieces[pieces.length - 1] = `${last} ${part}`;
      else pieces.push(part);
    }
    return pieces;
  });
}

// Words toSpokenArabic says for maths. "Strong" ones are maths on their own;
// "weak" ones ("على", "إلى", "من"…) only between two maths words.
export const STRONG_MATH = new Set([
  ...Object.values(LETTERS),
  ..."تربيع تكعيب أس مشتقة مرافق طويلة نهاية لوغاريتم أسية جيب ظل جذر يؤول يكافئ أصغر أكبر يساوي تقريباً زائد ناقص دلتا باي ينتمي ضرب".split(" "),
]);
const WEAK_MATH = new Set("على إلى أو من ما لا التمام الجزء الحقيقي التخيلي مجموعة الأعداد المركبة".split(" "));
const NUMBER = /^[+−-]?[\d٠-٩]+(?:[.,٫][\d٠-٩]+)?%?$/;
const EDGE_PUNCTUATION = /^[«"(]+|[»".,،:؛!؟?)]+$/g;

/** A word stripped of the punctuation around it ("إكس،" → "إكس"). */
export const bareWord = (word: string) => word.replace(EDGE_PUNCTUATION, "");

function mathKind(word: string): "strong" | "weak" | null {
  const bare = bareWord(word);
  if (NUMBER.test(bare) || STRONG_MATH.has(bare)) return "strong";
  return WEAK_MATH.has(bare) ? "weak" : null;
}

export type SpokenSegment = { math: boolean; text: string };

/**
 * A spoken sentence cut into prose and maths ("مثال: | 3 إكس تربيع ناقص 5
 * | هو الجواب."). Joining the segments' text with spaces gives the sentence.
 */
export function spokenSegments(sentence: string): SpokenSegment[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  const kinds = words.map(mathKind);
  // "ما لا نهاية" (∞) is maths from its first word.
  words.forEach((word, index) => {
    if (index >= 2 && bareWord(word) === "نهاية" && words[index - 1] === "لا" && words[index - 2] === "ما") {
      kinds[index - 2] = kinds[index - 1] = "strong";
    }
  });
  const isMath = words.map(() => false);
  for (let index = 0; index < words.length; index += 1) {
    if (kinds[index] !== "strong") continue;
    // Extend over maths words (strong or weak); punctuation ends the run.
    let end = index;
    while (end + 1 < words.length && kinds[end + 1] && bareWord(words[end]) === words[end]) end += 1;
    while (kinds[end] === "weak") end -= 1;
    for (let at = index; at <= end; at += 1) isMath[at] = true;
    index = end;
  }
  const segments: SpokenSegment[] = [];
  words.forEach((word, index) => {
    const last = segments[segments.length - 1];
    const breaksAfterPunctuation = last?.math && bareWord(words[index - 1]) !== words[index - 1];
    if (last && last.math === isMath[index] && !breaksAfterPunctuation) last.text += ` ${word}`;
    else segments.push({ math: isMath[index], text: word });
  });
  return segments;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The sentence without the student's name ("السلام عليكم يا سارة!" →
 * "السلام عليكم!"): what every student shares, so a prepared voice can say
 * it when it has no recording of this student's name.
 */
export function withoutName(sentence: string, name: string): string {
  const spoken = toSpokenArabic(name).trim();
  if (!spoken) return sentence;
  return sentence
    .replace(new RegExp(`\\s*(?:يا\\s+)?${escapeRegExp(spoken)}`, "g"), "")
    .replace(/\s+(?=[.،,:!؟?])/g, "")
    .replace(/([،,])(?=[.!؟?:،,])/g, "")
    .replace(/^[،,\s]+/, "")
    .trim();
}
