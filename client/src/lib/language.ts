export type Lang = "ar" | "fr" | "en";

export const LANGUAGE_KEY = "tafawoq-language";
/** The key used before the platform was renamed; read once, so nobody loses their choice. */
const LEGACY_LANGUAGE_KEY = "nourix-language";

/** The visitor's saved language, or null when none (or storage is blocked). */
export function getStoredLanguage(): Lang | null {
  try {
    let value = localStorage.getItem(LANGUAGE_KEY);
    if (value === null) {
      value = localStorage.getItem(LEGACY_LANGUAGE_KEY);
      if (value === "ar" || value === "fr" || value === "en") {
        localStorage.setItem(LANGUAGE_KEY, value);
        localStorage.removeItem(LEGACY_LANGUAGE_KEY);
      }
    }
    return value === "ar" || value === "fr" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Persists the chosen language AND keeps the real <html> element's dir/lang
 * attributes in sync with it. client/index.html hardcodes dir="rtl" (a
 * reasonable default, avoids a flash of wrong direction before any React
 * code runs) — but nothing was ever updating it back when a visitor
 * switched to French/English, so anything rendered outside a page's own
 * per-language wrapper div (most notably sonner's toast notifications,
 * which portal directly into document.body and read the real document's
 * dir) stayed RTL-styled regardless of the selected language. Every
 * language-switcher call site should go through this instead of writing to
 * localStorage directly.
 */
export function setStoredLanguage(lang: Lang): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // Storage blocked (private mode): the choice holds for this page only.
  }
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}
