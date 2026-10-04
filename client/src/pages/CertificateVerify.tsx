import { useState } from "react";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import {
  BadgeCheck,
  Download,
  Globe2,
  Search,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QrCode } from "@/components/QrCode";
import { Input } from "@/components/ui/input";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
const copy = {
  ar: {
    title: "التحقق من الشهادة",
    hint: "أدخل معرّف الشهادة للتحقق من صحتها.",
    placeholder: "معرّف الشهادة",
    verify: "تحقق",
    valid: "شهادة صالحة",
    revoked: "تم إلغاء هذه الشهادة",
    invalid: "لم نعثر على شهادة بهذا المعرّف.",
    student: "الطالب",
    course: "الدورة",
    issued: "تاريخ الإصدار",
    back: "الرئيسية",
    download: "تنزيل الشهادة PDF",
    disclaimer:
      "هذه شهادة إتمام صادرة عن Nourix Academy، وليست اعتمادًا رسميًا من وزارة التربية الوطنية.",
  },
  fr: {
    title: "Vérifier un certificat",
    hint: "Saisissez l’identifiant du certificat pour vérifier son authenticité.",
    placeholder: "Identifiant du certificat",
    verify: "Vérifier",
    valid: "Certificat valide",
    revoked: "Ce certificat a été révoqué",
    invalid: "Aucun certificat ne correspond à cet identifiant.",
    student: "Apprenant",
    course: "Cours",
    issued: "Date d’émission",
    back: "Accueil",
    download: "Télécharger le certificat PDF",
    disclaimer:
      "Ceci est un certificat de réussite délivré par Nourix Academy, et non une accréditation officielle du ministère de l'Éducation nationale.",
  },
  en: {
    title: "Verify a certificate",
    hint: "Enter a certificate ID to verify its authenticity.",
    placeholder: "Certificate ID",
    verify: "Verify",
    valid: "Valid certificate",
    revoked: "This certificate has been revoked",
    invalid: "No certificate matches this ID.",
    student: "Learner",
    course: "Course",
    issued: "Issued",
    back: "Home",
    download: "Download certificate PDF",
    disclaimer:
      "This is a certificate of completion issued by Nourix Academy, not an official accreditation from the Ministry of Education.",
  },
} as const;

export default function CertificateVerify() {
  const [, params] = useRoute("/verify/certificate/:id");
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [input, setInput] = useState(params?.id || "");
  const [submitted, setSubmitted] = useState(params?.id || "");
  const t = copy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const verification = trpc.certificates.verify.useQuery(
    { id: submitted },
    { enabled: submitted.length >= 6 }
  );
  const courseTitle = verification.data
    ? verification.data[
        lang === "ar"
          ? "courseTitleAr"
          : lang === "fr"
            ? "courseTitleFr"
            : "courseTitleEn"
      ]
    : "";
  const setLanguage = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  const isRevoked = verification.data?.status === "revoked";
  const verifyUrl = verification.data
    ? `${window.location.origin}/verify/certificate/${verification.data.certificateId}`
    : "";
  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="nourix-app min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
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
              <div className="section-kicker">NOURIX / TRUST</div>
              <h1>{t.title}</h1>
              <p>{t.hint}</p>
            </div>
          </div>
          <form
            className="certificate-search"
            onSubmit={event => {
              event.preventDefault();
              setSubmitted(input.trim());
            }}
          >
            <Input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
            />
            <Button type="submit" className="gold-button">
              <Search size={15} />
              {t.verify}
            </Button>
          </form>
          {submitted.length >= 6 && !verification.isLoading && (
            <div
              className={`certificate-result ${verification.data ? (isRevoked ? "certificate-invalid" : "certificate-valid") : "certificate-invalid"}`}
            >
              {verification.data ? (
                isRevoked ? (
                  <>
                    <ShieldX size={34} />
                    <h2>{t.revoked}</h2>
                    <dl>
                      <div>
                        <dt>ID</dt>
                        <dd>{verification.data.certificateId}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <>
                    <BadgeCheck size={34} />
                    <h2>{t.valid}</h2>
                    <dl>
                      <div>
                        <dt>{t.student}</dt>
                        <dd>{verification.data.studentName || "—"}</dd>
                      </div>
                      <div>
                        <dt>{t.course}</dt>
                        <dd>{courseTitle}</dd>
                      </div>
                      <div>
                        <dt>{t.issued}</dt>
                        <dd>
                          {new Date(
                            verification.data.issuedAt
                          ).toLocaleDateString(lang)}
                        </dd>
                      </div>
                      <div>
                        <dt>ID</dt>
                        <dd>{verification.data.certificateId}</dd>
                      </div>
                    </dl>
                    {verifyUrl && <QrCode value={verifyUrl} size={120} />}
                    <p
                      style={{
                        fontSize: 12,
                        color: "#8a8580",
                        marginTop: 10,
                        maxWidth: 320,
                        textAlign: "center",
                      }}
                    >
                      {t.disclaimer}
                    </p>
                    <a
                      href={`/api/certificates/${verification.data.certificateId}/pdf?lang=${lang}`}
                      className="quiet-button"
                      style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                    >
                      <Download size={15} />
                      {t.download}
                    </a>
                  </>
                )
              ) : (
                <>
                  <ShieldAlert size={34} />
                  <h2>{t.invalid}</h2>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
