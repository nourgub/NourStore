import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { VideoScene, VideoScript } from "@shared/tafawoq";

/**
 * Renders a generated personal video script as a narrated, animated video:
 * each scene is an animated slide, narrated in Arabic with the browser's
 * own speech synthesis (no third-party video service, no upload of the
 * student's data). Without an Arabic voice it still plays, timed by the
 * narration length, with captions.
 */
export function VideoPlayer({ script }: { script: VideoScript }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [finished, setFinished] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const token = useRef(0);
  const scene = script.scenes[index];
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setFinished(false);
  }, [script]);

  useEffect(() => {
    if (!playing || !scene) return;
    const current = ++token.current;
    const advance = () => {
      if (token.current !== current) return;
      setSpeaking(false);
      if (index < script.scenes.length - 1) setIndex(index + 1);
      else {
        setPlaying(false);
        setFinished(true);
      }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (canSpeak && !muted) {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.narration);
      const voice = synth.getVoices().find(entry => entry.lang.toLowerCase().startsWith("ar"));
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? "ar-SA";
      utterance.rate = 0.95;
      utterance.onstart = () => token.current === current && setSpeaking(true);
      utterance.onend = () => {
        timer = setTimeout(advance, 700);
      };
      utterance.onerror = () => {
        timer = setTimeout(advance, readingTime(scene));
      };
      synth.speak(utterance);
    } else {
      timer = setTimeout(advance, readingTime(scene));
    }
    return () => {
      token.current += 1;
      if (timer) clearTimeout(timer);
      if (canSpeak) window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [playing, index, muted, scene, script.scenes.length, canSpeak]);

  useEffect(() => () => {
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);

  if (!scene) return null;
  const go = (next: number) => {
    setFinished(false);
    setIndex(Math.max(0, Math.min(script.scenes.length - 1, next)));
  };

  return (
    <div className="tfq-video" ref={container}>
      <div className="tfq-stage">
        <div className="tfq-stage-inner" key={index}>
          <SceneVisual scene={scene} />
        </div>
        <div className={`tfq-avatar ${speaking ? "speaking" : ""}`} aria-hidden>
          <GraduationCap size={26} />
        </div>
        {(playing || finished || index > 0) && <div className="tfq-caption">{scene.narration}</div>}
        {!playing && index === 0 && !finished && (
          <button
            type="button"
            className="tfq-btn"
            style={{ position: "absolute", bottom: 18 }}
            onClick={() => setPlaying(true)}
          >
            <Play size={18} /> تشغيل الفيديو
          </button>
        )}
      </div>
      <div className="tfq-controls" dir="ltr">
        <button type="button" aria-label="السابق" onClick={() => go(index - 1)}>
          <SkipBack size={18} />
        </button>
        {finished ? (
          <button type="button" aria-label="إعادة" onClick={() => { go(0); setPlaying(true); }}>
            <RotateCcw size={18} />
          </button>
        ) : (
          <button type="button" aria-label={playing ? "إيقاف مؤقت" : "تشغيل"} onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
        <button type="button" aria-label="التالي" onClick={() => go(index + 1)}>
          <SkipForward size={18} />
        </button>
        <div className="tfq-timeline" dir="rtl">
          {script.scenes.map((_, position) => (
            <span
              key={position}
              className={position < index ? "done" : position === index ? "current" : ""}
              onClick={() => go(position)}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
          onClick={() => setMuted(!muted)}
          disabled={!canSpeak}
        >
          {muted || !canSpeak ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          type="button"
          aria-label="ملء الشاشة"
          onClick={() => container.current?.requestFullscreen?.()}
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}

function readingTime(scene: VideoScene) {
  const words = scene.narration.split(/\s+/).length;
  return Math.max(4000, words * 420);
}

function SceneVisual({ scene }: { scene: VideoScene }) {
  const visual = scene.visual;
  switch (visual.kind) {
    case "bullets":
      return (
        <>
          <h2>{visual.heading}</h2>
          <ul>
            {visual.lines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </>
      );
    case "formula":
      return (
        <>
          <h2>{visual.heading}</h2>
          <div className="tfq-formula">{visual.formula}</div>
          {visual.caption && <p style={{ marginTop: 14, fontSize: "clamp(14px, 2vw, 20px)" }}>{visual.caption}</p>}
        </>
      );
    case "example":
      return (
        <>
          <h2>{visual.heading}</h2>
          <p style={{ fontSize: "clamp(15px, 2.2vw, 22px)", fontWeight: 600 }}>{visual.problem}</p>
          <ol>
            {visual.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </>
      );
    default:
      return (
        <>
          <h2 style={{ fontSize: "clamp(26px, 5vw, 52px)" }}>{visual.heading}</h2>
          {visual.subheading && <p style={{ fontSize: "clamp(15px, 2.4vw, 24px)", opacity: 0.85 }}>{visual.subheading}</p>}
        </>
      );
  }
}
