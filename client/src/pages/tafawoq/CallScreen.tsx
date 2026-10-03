// A phone-call lesson with the subject teacher. Unlike the open live
// session (LiveTutor), the teacher leads: rings, greets the student by
// name, teaches the priority skill by dialogue (small questions that lead
// the student to the rule) or with a worked example, asks three oral
// questions (each graded and adapting difficulty through the student
// model), handles "اشرح"/"أعد" interruptions, and hangs up with a summary.
// Browser speech APIs only — free, no call service, nothing recorded.
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, RotateCcw, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { M } from "./components";
import { useT } from "./i18n";
import { RECOGNITION_LANG, canListen, listenOnce, speakArabic } from "./speech";

type Phase = "ringing" | "connecting" | "speaking" | "listening" | "thinking" | "ended";

const QUESTIONS_PER_CALL = 3;
const REPEAT = /أعد|اعد|كرر|كرّر|عاود|répète|repete|repeat|again/i;
const GRADED = /^(✔|ليس تماماً|لا بأس\. الجواب الصحيح)/;
const NOT_HEARD = "لم أسمعك جيداً. أعد جوابك من فضلك.";

/** Marks the message that closes a dialogue (server/tafawoq/dialogue.ts). */
const DIALOGUE_DONE = "🎯";
const DIALOGUE_STEP = "❓ (";

/** The tutor's "say «اختبرني»…" tails make no sense mid-call. */
function forCall(text: string) {
  return text.replace(/\n?قل «اختبرني»[^\n]*/g, "").trim();
}

/** Two-tone ring, synthesised (no audio file). Returns a stop function. */
function ring(): () => void {
  const AudioContextClass =
    typeof window !== "undefined"
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioContextClass) return () => {};
  const context = new AudioContextClass();
  let stopped = false;
  const burst = () => {
    if (stopped) return;
    const now = context.currentTime;
    for (const [offset, frequency] of [[0, 440], [0.4, 480]] as const) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.4);
    }
  };
  burst();
  const timer = setInterval(burst, 2200);
  return () => {
    stopped = true;
    clearInterval(timer);
    void context.close();
  };
}

function TeacherFace({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  return (
    <svg className={`tfq-face ${speaking ? "speaking" : ""} ${listening ? "listening" : ""}`} viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="url(#tfq-face-bg)" />
      <defs>
        <linearGradient id="tfq-face-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4a72c" />
          <stop offset="1" stopColor="#f1ce63" />
        </linearGradient>
      </defs>
      <path d="M30 42 Q60 14 90 42" stroke="#3b2a05" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="56" r="5" fill="#1b1305" className="tfq-face-eye" />
      <circle cx="76" cy="56" r="5" fill="#1b1305" className="tfq-face-eye" />
      <rect x="34" y="50" width="20" height="13" rx="5" fill="none" stroke="#1b1305" strokeWidth="2.5" />
      <rect x="66" y="50" width="20" height="13" rx="5" fill="none" stroke="#1b1305" strokeWidth="2.5" />
      <line x1="54" y1="56" x2="66" y2="56" stroke="#1b1305" strokeWidth="2.5" />
      <ellipse cx="60" cy="84" rx="13" ry="5" fill="#3b2a05" className="tfq-face-mouth" />
    </svg>
  );
}

export function CallScreen({
  lessonKey,
  lang,
  teacherName,
  onClose,
}: {
  lessonKey: string;
  lang: "ar" | "fr" | "en";
  teacherName: string;
  onClose: () => void;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const intro = trpc.tafawoq.callIntro.useMutation();
  const send = trpc.tafawoq.sendMessage.useMutation();
  const summary = trpc.tafawoq.callSummary.useMutation();

  const [phase, setPhase] = useState<Phase>("ringing");
  const [caption, setCaption] = useState("");
  const [heard, setHeard] = useState("");
  const [asked, setAsked] = useState(0);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const stopRef = useRef<() => void>(() => {});
  const ringRef = useRef<() => void>(() => {});
  const closedRef = useRef(false);
  const callStart = useRef<number | null>(null);
  const lastQuestion = useRef("");
  const askedRef = useRef(0);
  const mutedRef = useRef(false);
  const misses = useRef(0);
  /** "dialogue" while the teacher leads the student to the rule, then "quiz". */
  const mode = useRef<"dialogue" | "quiz">("dialogue");
  mutedRef.current = muted;

  const stopAll = () => {
    stopRef.current();
    stopRef.current = () => {};
  };

  useEffect(() => {
    ringRef.current = ring();
    return () => {
      closedRef.current = true;
      ringRef.current();
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "ringing" || phase === "ended" || phase === "connecting") return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase === "ringing" || phase === "ended" || phase === "connecting"]);

  const say = (text: string, then?: () => void) => {
    if (closedRef.current) return;
    stopAll();
    setCaption(text);
    setPhase("speaking");
    stopRef.current = speakArabic(text, {
      onEnd: () => {
        if (closedRef.current) return;
        then?.();
      },
    });
  };

  const listen = () => {
    if (closedRef.current) return;
    stopAll();
    setHeard("");
    setPhase("listening");
    if (mutedRef.current || !canListen()) return; // typed answer or unmute
    let got = false;
    stopRef.current = listenOnce(RECOGNITION_LANG[lang], {
      onInterim: text => setHeard(text),
      onFinal: text => {
        got = true;
        void respond(text);
      },
      onError: () => {},
      onEnd: () => {
        if (got || closedRef.current) return;
        misses.current += 1;
        if (misses.current <= 2) say(NOT_HEARD, listen);
        else {
          // Still nothing: switch to typing until the student unmutes.
          mutedRef.current = true;
          setMuted(true);
          setPhase("listening");
        }
      },
    });
  };

  const startDialogue = async () => {
    if (closedRef.current) return;
    setPhase("thinking");
    const { reply } = await send.mutateAsync({ lessonKey, message: "علّمني بالحوار" });
    if (!reply.includes(DIALOGUE_STEP)) {
      // No dialogue for this skill: straight to the questions.
      mode.current = "quiz";
      await askNext();
      return;
    }
    lastQuestion.current = reply.slice(reply.lastIndexOf(DIALOGUE_STEP));
    say(reply, listen);
  };

  const askNext = async () => {
    if (closedRef.current) return;
    if (askedRef.current >= QUESTIONS_PER_CALL) {
      await finish();
      return;
    }
    setPhase("thinking");
    const { reply } = await send.mutateAsync({ lessonKey, message: "اختبرني" });
    lastQuestion.current = reply;
    askedRef.current += 1;
    setAsked(askedRef.current);
    say(reply, listen);
  };

  const respond = async (text: string) => {
    if (!text.trim() || closedRef.current) return;
    misses.current = 0;
    setHeard(text);
    if (REPEAT.test(text)) {
      say(lastQuestion.current, listen);
      return;
    }
    setPhase("thinking");
    const { reply } = await send.mutateAsync({ lessonKey, message: text });
    void utils.tafawoq.workspace.invalidate({ lessonKey });
    if (mode.current === "dialogue") {
      if (reply.includes(DIALOGUE_DONE)) {
        mode.current = "quiz";
        say(`${forCall(reply)}\nوالآن لنتأكد أنك فهمت.`, () => void askNext());
      } else if (reply.includes(DIALOGUE_STEP)) {
        lastQuestion.current = reply.slice(reply.lastIndexOf(DIALOGUE_STEP));
        say(reply, listen);
      } else {
        // The dialogue was left (should not happen in a call): go on with the questions.
        mode.current = "quiz";
        say(forCall(reply), () => void askNext());
      }
      return;
    }
    if (GRADED.test(reply)) {
      say(forCall(reply), () => void askNext());
    } else {
      // An explanation or example in the middle of a question: answer it,
      // then put the same question back.
      say(`${reply}\nوالآن، أعيد السؤال.`, () => say(lastQuestion.current, listen));
    }
  };

  const finish = async () => {
    stopAll();
    if (callStart.current === null) {
      setPhase("ended");
      return;
    }
    setPhase("thinking");
    const data = await summary.mutateAsync({ lessonKey, afterId: callStart.current });
    setResult({ correct: data.correct, total: data.total });
    void utils.tafawoq.workspace.invalidate({ lessonKey });
    void utils.tafawoq.overview.invalidate();
    say(data.text, () => setPhase("ended"));
  };

  const accept = async () => {
    ringRef.current();
    setPhase("connecting");
    try {
      const data = await intro.mutateAsync({ lessonKey });
      callStart.current = data.afterId;
      mode.current = "dialogue";
      say(data.text, () => void startDialogue());
    } catch {
      setCaption(t.errors.generic);
      setPhase("ended");
    }
  };

  const hangUp = () => {
    stopAll();
    ringRef.current();
    if (phase === "ringing" || askedRef.current === 0) {
      closedRef.current = true;
      onClose();
      return;
    }
    // Close the call properly: the teacher says the summary, which is saved.
    void finish();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) {
      stopAll();
      setPhase("listening");
    } else if (phase === "listening") {
      listen();
    }
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const status =
    phase === "connecting"
      ? t.callConnecting
      : phase === "speaking"
        ? t.callTeacherSpeaking
        : phase === "listening"
          ? t.callListening
          : phase === "thinking"
            ? t.callThinking
            : phase === "ended"
              ? t.callEnded
              : t.callIncoming;

  return (
    <div className="tfq-live tfq-call" role="dialog" aria-modal="true" aria-label={teacherName}>
      <div className="tfq-call-panel">
        <div className={`tfq-call-avatar ${phase === "ringing" ? "ringing" : ""}`}>
          <TeacherFace speaking={phase === "speaking"} listening={phase === "listening"} />
        </div>
        <div className="tfq-call-name" dir="rtl" lang="ar">
          {teacherName}
        </div>
        <div className="tfq-live-status" aria-live="polite">
          {status}
          {phase !== "ringing" && phase !== "ended" && <span className="tfq-call-clock"> · {clock}</span>}
        </div>
        {asked > 0 && phase !== "ended" && (
          <div className="tfq-muted" style={{ textAlign: "center", fontSize: 13 }}>
            {t.callQuestion(Math.min(asked, QUESTIONS_PER_CALL), QUESTIONS_PER_CALL)}
          </div>
        )}

        {phase !== "ringing" && (
          <div className="tfq-live-transcript">
            {caption && (
              <div className="tfq-bubble tutor" dir="rtl" lang="ar">
                <M>{caption}</M>
              </div>
            )}
            {heard && (
              <div className="tfq-bubble student" dir="auto">
                {heard}
              </div>
            )}
          </div>
        )}

        {phase === "ended" && result && result.total > 0 && (
          <div className="tfq-banner" style={{ textAlign: "center", fontSize: 18 }}>
            {t.callScore(result.correct, result.total)}
          </div>
        )}

        {(muted || !canListen()) && phase === "listening" && (
          <form
            className="tfq-chat-input"
            onSubmit={event => {
              event.preventDefault();
              const text = typed;
              setTyped("");
              void respond(text);
            }}
          >
            <input className="tfq-input" dir="auto" value={typed} placeholder={t.callTypeInstead} onChange={event => setTyped(event.target.value)} />
            <button type="submit" className="tfq-btn" disabled={!typed.trim()} aria-label={t.send}>
              <Send size={16} className="tfq-flip" />
            </button>
          </form>
        )}

        <div className="tfq-call-actions">
          {phase === "ringing" ? (
            <>
              <button type="button" className="tfq-call-btn decline" onClick={hangUp} aria-label={t.callDecline}>
                <PhoneOff size={28} />
                <span>{t.callDecline}</span>
              </button>
              <button type="button" className="tfq-call-btn accept" onClick={() => void accept()} aria-label={t.callAccept}>
                <Phone size={28} />
                <span>{t.callAccept}</span>
              </button>
            </>
          ) : phase === "ended" ? (
            <>
              <button type="button" className="tfq-call-btn neutral" onClick={onClose} aria-label={t.callClose}>
                <PhoneOff size={24} />
                <span>{t.callClose}</span>
              </button>
              <button
                type="button"
                className="tfq-call-btn accept"
                aria-label={t.callAgain}
                onClick={() => {
                  closedRef.current = false;
                  askedRef.current = 0;
                  setAsked(0);
                  setSeconds(0);
                  setResult(null);
                  setCaption("");
                  setHeard("");
                  void accept();
                }}
              >
                <RotateCcw size={24} />
                <span>{t.callAgain}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`tfq-call-btn neutral ${muted ? "on" : ""}`}
                onClick={toggleMute}
                disabled={!canListen()}
                aria-label={muted ? t.callUnmute : t.callMute}
              >
                {muted ? <MicOff size={24} /> : <Mic size={24} />}
                <span>{muted ? t.callUnmute : t.callMute}</span>
              </button>
              <button type="button" className="tfq-call-btn decline" onClick={hangUp} aria-label={t.callHangUp}>
                <PhoneOff size={28} />
                <span>{t.callHangUp}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
