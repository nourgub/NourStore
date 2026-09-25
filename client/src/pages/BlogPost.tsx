import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Globe2 } from "lucide-react";
import { BackArrow } from "@/components/DirectionalArrow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { setStoredLanguage } from "@/lib/language";
import { setDocumentMeta, resetDocumentMeta } from "@/lib/documentMeta";

type Lang = "ar" | "fr" | "en";

const labels = {
  ar: { back: "المدونة", notFound: "المقالة غير موجودة." },
  fr: { back: "Blog", notFound: "Article introuvable." },
  en: { back: "Blog", notFound: "Post not found." },
} as const;

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = labels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  const postQuery = trpc.blog.post.useQuery({ slug }, { enabled: Boolean(slug) });
  const post = postQuery.data;
  const titleFor = () =>
    post
      ? post[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"]
      : "";
  const excerptFor = () =>
    post
      ? post[
          lang === "ar" ? "excerptAr" : lang === "fr" ? "excerptFr" : "excerptEn"
        ]
      : "";
  const contentFor = () =>
    post
      ? post[
          lang === "ar" ? "contentAr" : lang === "fr" ? "contentFr" : "contentEn"
        ]
      : "";

  useEffect(() => {
    if (post) {
      setDocumentMeta({
        title: `${titleFor()} — Nourix Academy`,
        description: excerptFor(),
      });
    }
    return () => resetDocumentMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, lang]);

  return (
    <div dir={dir} className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]">
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              N
            </span>
            <span className="brand-wordmark">
              Nourix <b>Academy</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/blog" className="catalog-home-link">
              <BackArrow dir={dir} size={14} />
              {t.back}
            </Link>
            <ThemeToggle lang={lang} />
            <div className="catalog-lang">
              <Globe2 size={15} />
              {(["ar", "fr", "en"] as Lang[]).map(option => (
                <button
                  key={option}
                  className={option === lang ? "active" : ""}
                  onClick={() => changeLang(option)}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="catalog-main">
        <div className="container" style={{ maxWidth: 760 }}>
          {postQuery.isLoading ? (
            <p>…</p>
          ) : !post ? (
            <div className="empty-state">
              <p>{t.notFound}</p>
            </div>
          ) : (
            <article className="flow-card" style={{ padding: 30 }}>
              <div className="section-kicker">NOURIX / BLOG</div>
              <h1 style={{ marginTop: 8 }}>{titleFor()}</h1>
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  marginTop: 20,
                }}
              >
                {contentFor()}
              </p>
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
