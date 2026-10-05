// Tafawoq — browser speech, free and on-device where the browser allows:
// speech recognition (the student talks) and speech synthesis (the teacher
// answers aloud). No third-party account, no audio uploaded by this app.
//
// Teaching content is written with unicode math (x², f′(x), −3, √, ≤…),
// which text-to-speech reads badly or skips. toSpokenArabic() rewrites it
// the way an Algerian teacher would say it aloud ("إكس تربيع", "ناقص 3",
// "إف مشتقة إكس") before it is spoken. The screen still shows the symbols.

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
    .trim();
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

/**
 * The device's most natural Arabic voice, for when the server voice is
 * unavailable: network/neural voices ("Google", "Natural", "Online"…) sound
 * far less robotic than the default local ones.
 */
function arabicVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith("ar"));
  const natural = /natural|neural|online|google|premium|enhanced|siri/i;
  const score = (voice: SpeechSynthesisVoice) =>
    (natural.test(voice.name) ? 4 : 0) + (voice.lang.toLowerCase().startsWith("ar-dz") ? 2 : 0) + (voice.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

/** Spoken text in sentence-sized pieces (Chrome cuts utterances after ~15 s; the server caps a request). */
function chunksOf(text: string): string[] {
  return toSpokenArabic(text)
    .split(/(?<=[.!؟?:،\n])\s+/)
    .reduce<string[]>((acc, part) => {
      const last = acc[acc.length - 1];
      if (last && last.length + part.length < 180) acc[acc.length - 1] = `${last} ${part}`;
      else acc.push(part);
      return acc;
    }, [])
    .filter(chunk => chunk.trim());
}

type SpeakHandlers = { onStart?: () => void; onEnd?: () => void };

/** The browser's own voice (fallback). */
function browserSpeak(chunks: string[], handlers: SpeakHandlers, started: boolean) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !chunks.length) {
    handlers.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let stopped = false;
  const voice = arabicVoice();
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "ar-SA";
    utterance.rate = 0.95;
    if (index === 0 && !started) utterance.onstart = () => !stopped && handlers.onStart?.();
    if (index === chunks.length - 1) {
      utterance.onend = () => !stopped && handlers.onEnd?.();
      utterance.onerror = () => !stopped && handlers.onEnd?.();
    }
    synth.speak(utterance);
  });
  return () => {
    stopped = true;
    synth.cancel();
  };
}

// ---------------------------------------------------------------------------
// The teacher's natural voice, synthesised on the server (server/tafawoq/tts.ts).
// ---------------------------------------------------------------------------

/** null = not tried yet; false = the server has no natural voice (use the browser's). */
let serverVoice: boolean | null = null;
let player: HTMLAudioElement | null = null;
const SILENT_MP3 = "data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80LEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQsQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NCxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function audioPlayer() {
  if (!player) {
    player = new Audio();
    player.preload = "auto";
  }
  return player;
}

/**
 * Call from a tap (accepting the call, opening a session, pressing play):
 * phones only let a page play sound it started from a user gesture.
 */
export function unlockAudio() {
  if (typeof Audio === "undefined") return;
  try {
    const audio = audioPlayer();
    audio.src = SILENT_MP3;
    void audio.play().catch(() => {});
  } catch {
    // nothing to unlock
  }
}

async function fetchVoice(text: string, signal: AbortSignal): Promise<Blob | null> {
  if (serverVoice === false) return null;
  try {
    const response = await fetch("/api/tafawoq/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
      signal,
    });
    if (response.status === 503 || response.status === 404 || response.status === 401) {
      serverVoice = false;
      return null;
    }
    if (!response.ok) return null;
    serverVoice = true;
    return await response.blob();
  } catch {
    return null;
  }
}

function play(blob: Blob): Promise<boolean> {
  return new Promise(resolve => {
    const audio = audioPlayer();
    const url = URL.createObjectURL(blob);
    const done = (ok: boolean) => {
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.src = url;
    audio.play().catch(() => done(false));
  });
}

/**
 * Speaks Arabic teaching text (math rewritten for the ear) in the teacher's
 * natural voice, sentence by sentence — the next sentence is fetched while
 * the current one plays. Falls back to the browser's best voice when the
 * server has none. Returns a stop function.
 */
export function speakArabic(text: string, handlers: SpeakHandlers = {}) {
  const chunks = chunksOf(text);
  if (!chunks.length) {
    handlers.onEnd?.();
    return () => {};
  }
  if (serverVoice === false || typeof Audio === "undefined") return browserSpeak(chunks, handlers, false);

  let stopped = false;
  let stopFallback: () => void = () => {};
  const controller = new AbortController();
  const pending = new Map<number, Promise<Blob | null>>();
  const fetchAt = (index: number) => {
    if (index < chunks.length && !pending.has(index)) pending.set(index, fetchVoice(chunks[index], controller.signal));
    return pending.get(index);
  };

  void (async () => {
    fetchAt(0);
    fetchAt(1);
    for (let index = 0; index < chunks.length; index += 1) {
      const blob = await fetchAt(index);
      if (stopped) return;
      fetchAt(index + 1);
      fetchAt(index + 2);
      const ok = blob ? await (index === 0 ? (handlers.onStart?.(), play(blob)) : play(blob)) : false;
      if (stopped) return;
      if (!ok) {
        // No natural voice (or it can't play here): say the rest with the browser's.
        stopFallback = browserSpeak(chunks.slice(index), handlers, index > 0);
        return;
      }
    }
    if (!stopped) handlers.onEnd?.();
  })();

  return () => {
    stopped = true;
    controller.abort();
    player?.pause();
    stopFallback();
  };
}

// ---------------------------------------------------------------------------
// Speech recognition (Chrome, Edge, Safari, Android — not Firefox)
// ---------------------------------------------------------------------------

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionConstructor() !== null;
}

export const RECOGNITION_LANG = { ar: "ar-DZ", fr: "fr-FR", en: "en-US" } as const;

/**
 * Listens for one utterance. Calls onInterim with the live transcript and
 * onFinal once the student stops talking. Returns a stop function.
 */
export function listenOnce(
  lang: string,
  handlers: {
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }
) {
  const Constructor = recognitionConstructor();
  if (!Constructor) {
    handlers.onError("not-supported");
    handlers.onEnd();
    return () => {};
  }
  const recognition = new Constructor();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  let finalText = "";
  recognition.onresult = event => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    handlers.onInterim((finalText + interim).trim());
  };
  recognition.onerror = event => handlers.onError(event.error);
  recognition.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim());
    handlers.onEnd();
  };
  try {
    recognition.start();
  } catch {
    handlers.onError("start-failed");
    handlers.onEnd();
  }
  return () => {
    try {
      recognition.stop();
    } catch {
      // already stopped
    }
  };
}
