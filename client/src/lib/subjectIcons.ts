import {
  Atom,
  BookOpen,
  Brain,
  Code2,
  FlaskConical,
  Globe2,
  Music,
  Palette,
  Sigma,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a subject's stored `icon` key (see admin.createSubject) to an actual
 * lucide-react component. New subjects an admin adds only need to pick one
 * of these keys — no code/UI change needed to support the new subject.
 */
const SUBJECT_ICONS: Record<string, LucideIcon> = {
  sigma: Sigma,
  code: Code2,
  flask: FlaskConical,
  atom: Atom,
  globe: Globe2,
  brain: Brain,
  music: Music,
  palette: Palette,
  book: BookOpen,
};

export function subjectIcon(iconKey: string | undefined | null): LucideIcon {
  return (iconKey && SUBJECT_ICONS[iconKey]) || BookOpen;
}

export const SUBJECT_ICON_KEYS = Object.keys(SUBJECT_ICONS);
