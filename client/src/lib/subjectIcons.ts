import {
  Atom,
  BookOpen,
  Brain,
  Briefcase,
  ClipboardCheck,
  Code2,
  FileText,
  FlaskConical,
  GraduationCap,
  Globe2,
  Music,
  Palette,
  Scale,
  ShoppingCart,
  Sigma,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a subject's stored `icon` key (see admin.createSubject) to an actual
 * lucide-react component. New subjects an admin adds only need to pick one
 * of these keys — no code/UI change needed to support the new subject.
 */
const SUBJECT_ICONS = {
  sigma: Sigma,
  code: Code2,
  flask: FlaskConical,
  atom: Atom,
  globe: Globe2,
  brain: Brain,
  music: Music,
  palette: Palette,
  book: BookOpen,
  "file-text": FileText,
  scale: Scale,
  "graduation-cap": GraduationCap,
  "clipboard-check": ClipboardCheck,
  briefcase: Briefcase,
  "shopping-cart": ShoppingCart,
} satisfies Record<string, LucideIcon>;

export function subjectIcon(iconKey: string | undefined | null): LucideIcon {
  return (iconKey && SUBJECT_ICONS[iconKey as keyof typeof SUBJECT_ICONS]) || BookOpen;
}

export const SUBJECT_ICON_KEYS = Object.keys(SUBJECT_ICONS) as Array<
  keyof typeof SUBJECT_ICONS
>;
