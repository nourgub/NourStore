export type Lang = "ar" | "fr" | "en";

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
  localStorage.setItem("nourix-language", lang);
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}
