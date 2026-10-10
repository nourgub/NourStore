// Live voice session with the teacher: the student speaks, the teacher
// answers aloud, and (in continuous mode) listens again — a spoken
// conversation, hands-free. Built only on the browser's own speech APIs and
// the same tutor endpoint as the text chat, so every turn is saved in the
// session history and drives the same student model.
import { useEffect, useRef, useState } from "react";
import { GraduationCap, Mic, MicOff, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { M } from "./components";
import { useT } from "./i18n";
import { FOREIGN_REQUESTS, type TeacherStyle } from "./teacherStyle";
import { TAUGHT_LANGUAGES, foreignLanguageOfLesson } from "@shared/taughtLanguages";
import { RECOGNITION_LANG, canListen, canSpeak, listenOnce, speakArabic } from "./speech";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const OPENING = {
  fusha: "أنا معك الآن. اسألني عن أي نقطة في الدرس، أو قل «أعطني مثالاً»، أو قل «اختبرني» لأطرح عليك سؤالاً.",
  darja: "راني معاك دوك. سقسيني على أي نقطة في الدرس، ولا قول «عطيني مثال»، ولا قول «سقسيني» نعطيك سؤال.",
};

export function LiveTutor({
  lessonKey,
  lang,
  style,
  onClose,
}: {
  lessonKey: string;
  lang: "ar" | "fr" | "en";
  style: TeacherStyle;
  onClose: () => void;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const send = trpc.tafawoq.sendMessage.useMutation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [handsFree, setHandsFree] = useState(true);
  const [heard, setHeard] = useState("");
  // A language lesson taught in its own language: the session is held in it.
  const taught = style === "foreign" ? foreignLanguageOfLesson(lessonKey) : null;
  const opening = taught ? FOREIGN_REQUESTS[taught].greeting : OPENING[style === "darja" ? "darja" : "fusha"];
  const [reply, setReply] = useState(opening);
  const [notice, setNotice] = useState<string | null>(canListen() ? null : t.liveUnsupported);
  const [typed, setTyped] = useState("");
  const stopRef = useRef<() => void>(() => {});
  const handsFreeRef = useRef(handsFree);
  const closedRef = useRef(false);
  handsFreeRef.current = handsFree;

  const stopAll = () => {
    stopRef.current();
    stopRef.current = () => {};
  };

  const speak = (text: string) => {
    stopAll();
    setPhase("speaking");
    stopRef.current = speakArabic(text, {
      onEnd: () => {
        if (closedRef.current) return;
        setPhase("idle");
        if (handsFreeRef.current && canListen()) listen();
      },
    });
  };

  const ask = async (message: string) => {
    if (!message.trim()) return;
    stopAll();
    setHeard(message);
    setPhase("thinking");
    try {
      const result = await send.mutateAsync({ lessonKey, message, style });
      if (closedRef.current) return;
      setReply(result.reply);
      void utils.tafawoq.workspace.invalidate({ lessonKey });
      speak(result.reply);
    } catch {
      setPhase("idle");
      setNotice(t.errors.generic);
    }
  };

  const listen = () => {
    stopAll();
    setNotice(canListen() ? null : t.liveUnsupported);
    setHeard("");
    setPhase("listening");
    let gotSpeech = false;
    // Taught in its own language: the student speaks it.
    stopRef.current = listenOnce(taught ? TAUGHT_LANGUAGES[taught].bcp47 : RECOGNITION_LANG[lang], {
      onInterim: text => setHeard(text),
      onFinal: text => {
        gotSpeech = true;
        void ask(text);
      },
      onError: error => {
        if (error === "not-allowed" || error === "service-not-allowed") setNotice(t.liveMicDenied);
        else if (error === "no-speech") setNotice(t.liveNoSpeech);
        else if (error !== "aborted") setNotice(t.liveUnsupported);
      },
      onEnd: () => {
        if (!gotSpeech && !closedRef.current) setPhase("idle");
      },
    });
  };

  // Greet once, then start listening (in continuous mode).
  useEffect(() => {
    closedRef.current = false;
    if (canSpeak()) {
      if (!window.speechSynthesis.getVoices().some(voice => voice.lang.toLowerCase().startsWith("ar"))) {
        // Voices load asynchronously on some browsers; re-check shortly.
        setTimeout(() => {
          if (!window.speechSynthesis.getVoices().some(voice => voice.lang.toLowerCase().startsWith("ar"))) {
            setNotice(current => current ?? t.liveNoVoice);
          }
        }, 1200);
      }
      speak(opening);
    } else if (canListen()) {
      listen();
    }
    return () => {
      closedRef.current = true;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const micAction = () => {
    if (phase === "listening") {
      stopAll();
      setPhase("idle");
    } else if (phase !== "thinking") {
      listen();
    }
  };

  const status =
    phase === "listening" ? t.liveListening : phase === "thinking" ? t.liveThinking : phase === "speaking" ? t.liveSpeaking : t.liveIdle;

  return (
    <div className="tfq-live" role="dialog" aria-modal="true" aria-label={t.liveTitle}>
      <div className="tfq-live-panel">
        <div className="tfq-spread">
          <strong>{t.liveTitle}</strong>
          <button type="button" className="tfq-btn ghost small" onClick={onClose} aria-label={t.liveEnd}>
            <X size={14} /> {t.liveEnd}
          </button>
        </div>

        <div className={`tfq-live-avatar ${phase}`} aria-hidden>
          <GraduationCap size={54} />
        </div>
        <div className="tfq-live-status" aria-live="polite">
          {status}
        </div>

        <div className="tfq-live-transcript">
          {heard && (
            <div className="tfq-bubble student" dir="auto">
              <span className="tfq-muted" style={{ fontSize: 12 }}>{t.liveYou}: </span>
              {heard}
            </div>
          )}
          <div className="tfq-bubble tutor" dir="rtl" lang="ar">
            <span className="tfq-muted" style={{ fontSize: 12 }}>{t.liveTeacher}: </span>
            <M>{reply}</M>
          </div>
        </div>

        {notice && <div className="tfq-banner">{notice}</div>}

        <button
          type="button"
          className={`tfq-live-mic ${phase === "listening" ? "on" : ""}`}
          onClick={micAction}
          disabled={phase === "thinking" || !canListen()}
          aria-label={phase === "listening" ? t.liveListening : t.liveIdle}
        >
          {phase === "listening" ? <MicOff size={30} /> : <Mic size={30} />}
        </button>

        <label className="tfq-row" style={{ justifyContent: "center", fontSize: 13 }}>
          <input type="checkbox" checked={handsFree} onChange={event => setHandsFree(event.target.checked)} />
          {t.liveHandsFree}
        </label>

        {!canListen() && (
          <form
            className="tfq-chat-input"
            onSubmit={event => {
              event.preventDefault();
              const message = typed;
              setTyped("");
              void ask(message);
            }}
          >
            <input className="tfq-input" dir="auto" value={typed} placeholder={t.askPlaceholder} onChange={event => setTyped(event.target.value)} />
            <button type="submit" className="tfq-btn" disabled={!typed.trim() || phase === "thinking"} aria-label={t.send}>
              <Send size={16} className="tfq-flip" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
