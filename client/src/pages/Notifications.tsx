import { useState } from "react";
import { Bell, Check, Globe2, LogIn } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
const copy = {
  ar: {
    title: "مركز التنبيهات",
    hint: "كل تحديثات التعلم والحساب في مكان واحد.",
    empty: "لا توجد تنبيهات بعد.",
    mark: "تحديد كمقروء",
    login: "تسجيل الدخول",
    back: "العودة إلى لوحة التحكم",
  },
  fr: {
    title: "Centre de notifications",
    hint: "Les mises à jour de votre apprentissage et de votre compte au même endroit.",
    empty: "Aucune notification pour le moment.",
    mark: "Marquer comme lu",
    login: "Se connecter",
    back: "Retour au tableau de bord",
  },
  en: {
    title: "Notification center",
    hint: "Learning and account updates in one place.",
    empty: "No notifications yet.",
    mark: "Mark as read",
    login: "Sign in",
    back: "Back to dashboard",
  },
} as const;

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = copy[lang];
  const notifications = trpc.notifications.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => notifications.refetch(),
  });
  const setLanguage = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  if (!isAuthenticated)
    return (
      <div className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec] grid place-items-center">
        <div className="empty-state">
          <LogIn size={30} />
          <h1>{t.login}</h1>
          <Link href="/login">
            <Button className="gold-button">{t.login}</Button>
          </Link>
        </div>
      </div>
    );
  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/dashboard" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/dashboard" className="catalog-home-link">
              {t.back}
            </Link>
            <ThemeToggle lang={lang} />
            <div className="catalog-lang">
              <Globe2 size={15} />
              {(["ar", "fr", "en"] as Lang[]).map(option => (
                <button
                  key={option}
                  className={option === lang ? "active" : ""}
                  onClick={() => setLanguage(option)}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="catalog-main">
        <div className="container">
          <div className="catalog-hero">
            <div>
              <div className="section-kicker">NOURIX / UPDATES</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
          </div>
          <div className="notification-list">
            {notifications.data?.length ? (
              notifications.data.map(item => (
                <article
                  className={`notification-card ${item.readAt ? "is-read" : ""}`}
                  key={item.id}
                >
                  <div className="notification-icon">
                    <Bell size={18} />
                  </div>
                  <div className="notification-content">
                    <div>
                      <h2>{item.title}</h2>
                      <small>
                        {new Date(item.createdAt).toLocaleDateString(lang)}
                      </small>
                    </div>
                    <p>{item.body}</p>
                    {!item.readAt && (
                      <Button
                        variant="ghost"
                        className="table-action"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate({ id: item.id })}
                      >
                        <Check size={14} />
                        {t.mark}
                      </Button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <Bell size={28} />
                <p>{t.empty}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
