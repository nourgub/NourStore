import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

type Lang = "ar" | "fr" | "en";

const LABELS: Record<Lang, { light: string; dark: string }> = {
  ar: { light: "التبديل للوضع الفاتح", dark: "التبديل للوضع الداكن" },
  fr: { light: "Passer au mode clair", dark: "Passer au mode sombre" },
  en: { light: "Switch to light mode", dark: "Switch to dark mode" },
};

/**
 * The same control Home.tsx has had since the light theme was built (see
 * AUDIT.md) — extracted into a shared component so every other page can
 * show it too, instead of only inheriting the theme via the shared
 * <html data-theme> attribute with no visible control of their own.
 */
export function ThemeToggle({ lang = "ar" as Lang }: { lang?: Lang }) {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  const label = theme === "dark" ? LABELS[lang].light : LABELS[lang].dark;
  return (
    <button
      className="language-button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
