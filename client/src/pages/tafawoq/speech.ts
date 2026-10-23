// Tafawoq — speech: speech recognition (the student talks, in the browser)
// and the teacher's voice (synthesised on the server, the browser's own
// voice as a fallback). Maths is rewritten for the ear first
// (shared/spokenArabic.ts).
import { useEffect, useSyncExternalStore } from "react";
import { foreignLanguageOfLesson, spokenParts, type ForeignLang, type SpokenPart } from "@shared/spokenArabic";
import { TAUGHT_LANGUAGES } from "@shared/taughtLanguages";
import { toast } from "sonner";
import { readTeacherVoice } from "./teacherStyle";

export { toSpokenArabic } from "@shared/spokenArabic";

/**
 * The language taught where the student is (a German lesson → "de"): its
 * words are then read by a voice of that language, the rest in Arabic.
 * Set by the lesson and call screens (useSpeechLesson).
 */
let lessonLanguage: ForeignLang | null = null;
export function setSpeechLesson(lessonKey: string | null) {
  lessonLanguage = foreignLanguageOfLesson(lessonKey);
}

/** While this screen shows `lessonKey`, the teacher reads its language in that language's voice. */
export function useSpeechLesson(lessonKey: string | null | undefined) {
  useEffect(() => {
    setSpeechLesson(lessonKey ?? null);
    return () => setSpeechLesson(null);
  }, [lessonKey]);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

/**
 * The device's most natural Arabic voice, for when the server voice is
 * unavailable: network/neural voices ("Google", "Natural", "Online"…) sound
 * far less robotic than the default local ones.
 */
function deviceVoice(lang: SpokenPart["lang"]): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith(lang));
  const natural = /natural|neural|online|google|premium|enhanced|siri/i;
  const score = (voice: SpeechSynthesisVoice) =>
    (natural.test(voice.name) ? 4 : 0) + (voice.lang.toLowerCase().startsWith("ar-dz") ? 2 : 0) + (voice.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
}

const DEFAULT_LANG: Record<SpokenPart["lang"], string> = {
  ar: "ar-SA",
  de: TAUGHT_LANGUAGES.de.bcp47,
  es: TAUGHT_LANGUAGES.es.bcp47,
  it: TAUGHT_LANGUAGES.it.bcp47,
  fr: TAUGHT_LANGUAGES.fr.bcp47,
  en: TAUGHT_LANGUAGES.en.bcp47,
};

/** One piece in the device's voice; resolves when it is said (or cannot be). */
function browserSay(part: SpokenPart): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const voice = deviceVoice(part.lang);
    const utterance = new SpeechSynthesisUtterance(part.text);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? DEFAULT_LANG[part.lang];
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

type SpeakHandlers = { onStart?: () => void; onEnd?: () => void };

/** The browser's own voice (fallback). */
function browserSpeak(chunks: SpokenPart[], handlers: SpeakHandlers, started: boolean) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !chunks.length) {
    handlers.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let stopped = false;
  chunks.forEach((chunk, index) => {
    const voice = deviceVoice(chunk.lang);
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? DEFAULT_LANG[chunk.lang];
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
/**
 * The owner allows one voice only (server TAFAWOQ_VOICE_EXCLUSIVE): a sentence
 * that voice does not have is not spoken at all — never by the device's voice.
 */
let exclusiveVoice = false;
const SKIP = Symbol("not prepared in the only allowed voice");

/**
 * Which voice the student last heard for the Arabic teacher, told plainly on
 * screen: "algerian" (an Algerian voice), "arabic" (a natural Arabic voice
 * that is not Algerian), "device" (the phone's or browser's own voice).
 * Comes from the server's X-Tafawoq-Voice header — never guessed from the
 * teaching style (Darja text can be read by a non-Algerian voice).
 */
export type HeardVoice = "algerian" | "arabic" | "device";
let heardVoice: HeardVoice | null = null;
const heardListeners = new Set<() => void>();
function setHeardVoice(next: HeardVoice) {
  if (heardVoice === next) return;
  heardVoice = next;
  heardListeners.forEach(listener => listener());
}
export function useHeardVoice(): HeardVoice | null {
  return useSyncExternalStore(
    listener => {
      heardListeners.add(listener);
      return () => heardListeners.delete(listener);
    },
    () => heardVoice,
    () => null
  );
}
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

async function fetchVoice({ text, lang }: SpokenPart, signal: AbortSignal): Promise<Blob | typeof SKIP | null> {
  if (serverVoice === false && !exclusiveVoice) return null;
  try {
    const response = await fetch("/api/tafawoq/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text, voice: readTeacherVoice(), lang }),
      signal,
    });
    if (response.status === 409 && response.headers.get("X-Tafawoq-Voice-Exclusive") === "1") {
      exclusiveVoice = true;
      serverVoice = true;
      return SKIP;
    }
    if (response.status === 503 || response.status === 404 || response.status === 401) {
      // No voice for a taught language says nothing about the Arabic one.
      if (lang === "ar") serverVoice = false;
      return null;
    }
    if (!response.ok) return null;
    serverVoice = true;
    if (response.headers.get("X-Tafawoq-Voice-Exclusive") === "1") exclusiveVoice = true;
    if (lang === "ar") {
      const accent = (response.headers.get("X-Tafawoq-Voice") ?? "").split(";")[2]?.trim();
      setHeardVoice(accent === "algerian" ? "algerian" : "arabic");
    }
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
const MISSING_NOTICE: Record<string, string> = {
  ar: "بعض هذه الجمل لم تُسجَّل بعد بصوت الأستاذة: النص ظاهر على الشاشة.",
  fr: "Certaines phrases ne sont pas encore enregistrées avec la voix de l'enseignante : le texte est affiché.",
  en: "Some of these sentences are not recorded in the teacher's voice yet: the text is on screen.",
};
let lastMissingNotice = 0;

/** Exclusive voice, recording missing: say so (at most once a minute) instead of staying silent unexplained. */
function noticeMissingRecording() {
  if (Date.now() - lastMissingNotice < 60_000) return;
  lastMissingNotice = Date.now();
  const lang = (typeof document !== "undefined" && document.querySelector(".tfq")?.getAttribute("lang")) || "ar";
  toast.info(MISSING_NOTICE[lang] ?? MISSING_NOTICE.ar, { id: "voice-missing" });
}

export function speakArabic(text: string, handlers: SpeakHandlers = {}, foreign: ForeignLang | null = lessonLanguage) {
  const chunks = spokenParts(text, foreign);
  if (!chunks.length) {
    handlers.onEnd?.();
    return () => {};
  }
  if (exclusiveVoice && typeof Audio === "undefined") {
    handlers.onEnd?.();
    return () => {};
  }
  if ((serverVoice === false && !exclusiveVoice) || typeof Audio === "undefined") {
    setHeardVoice("device");
    return browserSpeak(chunks, handlers, false);
  }

  let stopped = false;
  let stopFallback: () => void = () => {};
  const controller = new AbortController();
  const pending = new Map<number, Promise<Blob | typeof SKIP | null>>();
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
      if (blob === SKIP || (!blob && exclusiveVoice)) {
        // Not in the only allowed voice: the text is on screen, nothing is said, and a notice says why.
        if (index === 0) handlers.onStart?.();
        noticeMissingRecording();
        continue;
      }
      const ok = blob ? await (index === 0 ? (handlers.onStart?.(), play(blob)) : play(blob)) : false;
      if (stopped) return;
      if (!ok && chunks[index].lang !== "ar" && serverVoice) {
        // No server voice for this language: the device says this piece, the teacher the rest.
        if (index === 0) handlers.onStart?.();
        await browserSay(chunks[index]);
        if (stopped) return;
        continue;
      }
      if (!ok && exclusiveVoice) continue;
      if (!ok) {
        // No natural voice (or it can't play here): say the rest with the browser's.
        setHeardVoice("device");
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
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
