import { useState } from "react";
import { Link } from "wouter";
import { Globe2, Newspaper } from "lucide-react";
import { ForwardArrow } from "@/components/DirectionalArrow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";

const labels = {
  ar: {
    title: "المدونة",
    hint: "مقالات ونصائح في الإعلام الآلي، البيروتيك، الذكاء الاصطناعي والتجارة الإلكترونية.",
    home: "الرئيسية",
    empty: "لا توجد مقالات منشورة حاليًا.",
    readMore: "اقرأ المزيد",
  },
  fr: {
    title: "Blog",
    hint: "Articles et conseils en informatique, bureautique, intelligence artificielle et e-commerce.",
    home: "Accueil",
    empty: "Aucun article publié pour le moment.",
    readMore: "Lire la suite",
  },
  en: {
    title: "Blog",
    hint: "Articles and tips on IT, office software, artificial intelligence and e-commerce.",
    home: "Home",
    empty: "No articles have been published yet.",
    readMore: "Read more",
  },
} as const;

export default function Blog() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const t = labels[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  const postsQuery = trpc.blog.posts.useQuery();
  const titleFor = (row: { titleAr: string; titleFr: string; titleEn: string }) =>
    row[lang === "ar" ? "titleAr" : lang === "fr" ? "titleFr" : "titleEn"];
  const excerptFor = (row: {
    excerptAr: string;
    excerptFr: string;
    excerptEn: string;
  }) =>
    row[
      lang === "ar" ? "excerptAr" : lang === "fr" ? "excerptFr" : "excerptEn"
    ];

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
            <Link href="/" className="catalog-home-link">
              {t.home}
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
        <div className="container">
          <div className="catalog-hero">
            <div>
              <div className="section-kicker">NOURIX / BLOG</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
          </div>
          {postsQuery.isLoading ? (
            <p>…</p>
          ) : !postsQuery.data?.length ? (
            <div className="empty-state">
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="course-catalog-grid">
              {postsQuery.data.map(post => (
                <article className="catalog-course-card" key={post.id}>
                  <div className="catalog-card-top">
                    <div className="catalog-course-icon math-tone">
                      <Newspaper size={22} />
                    </div>
                  </div>
                  <h2>{titleFor(post)}</h2>
                  <p>{excerptFor(post)}</p>
                  <Link className="catalog-start" href={`/blog/${post.slug}`}>
                    {t.readMore}
                    <ForwardArrow dir={dir} size={15} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
