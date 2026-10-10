// "استمع": the teacher reads a text aloud in the chosen voice (male or
// female, ./teacherStyle.ts), from the server's natural voice, or the
// device's own voice when offline (./speech.ts).
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { canSpeak, speakArabic, unlockAudio } from "./speech";
import { useB } from "./bacI18n";

export function ListenButton({ text }: { text: string }) {
  const b = useB();
  const [speaking, setSpeaking] = useState(false);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);
  if (!canSpeak() || !text.trim()) return null;
  return (
    <button
      type="button"
      className="tfq-btn ghost small"
      aria-label={speaking ? b.stop : b.readAloud}
      onClick={event => {
        event.stopPropagation();
        if (speaking) {
          stop.current();
          setSpeaking(false);
          return;
        }
        unlockAudio();
        setSpeaking(true);
        stop.current = speakArabic(text, { onEnd: () => setSpeaking(false) });
      }}
    >
      {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />} {speaking ? b.stop : b.readAloud}
    </button>
  );
}
