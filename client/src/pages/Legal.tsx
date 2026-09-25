import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ForwardArrow, BackArrow } from "@/components/DirectionalArrow";
import { Globe2, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { setStoredLanguage } from "@/lib/language";

type Lang = "ar" | "fr" | "en";
type Doc = "privacy" | "terms";

const nav = {
  ar: {
    back: "الرئيسية",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    draftNotice:
      "هذا نص مسودة يغطي النقاط الأساسية المطلوبة، وليس وثيقة معتمدة قانونيًا. يجب مراجعته من محامٍ مختص في القانون الجزائري (القانون 18-07 لحماية المعطيات ذات الطابع الشخصي) قبل النشر الرسمي.",
  },
  fr: {
    back: "Accueil",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
    draftNotice:
      "Ceci est un texte de brouillon couvrant les points essentiels — ce n’est pas un document juridiquement validé. Il doit être révisé par un avocat spécialisé en droit algérien (loi 18-07 sur la protection des données à caractère personnel) avant publication officielle.",
  },
  en: {
    back: "Home",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    draftNotice:
      "This is a draft covering the essential points — it is not a legally certified document. It should be reviewed by a lawyer specialized in Algerian law (Law 18-07 on personal data protection) before official publication.",
  },
} as const;

const privacyContent = {
  ar: {
    title: "سياسة الخصوصية",
    sections: [
      {
        h: "من نحن ولماذا نجمع بياناتك",
        p: 'منصة Nourix Academy ("المنصة") تجمع بياناتك الشخصية بهدف تقديم خدمات التعلم عن بعد، تتبع تقدمك، إصدار الشهادات، وإدارة الاشتراكات والدفع.',
      },
      {
        h: "البيانات التي نجمعها",
        p: "الاسم، البريد الإلكتروني، رقم الهاتف (إن قُدِّم)، بيانات الالتحاق والتقدم الدراسي، نتائج الاختبارات، وبيانات الفوترة (لا نجمع أو نُخزّن أي بيانات بطاقة بنكية — الدفع يدوي عبر تحويل بريدي وإثبات دفع فقط).",
      },
      {
        h: "أساس المعالجة",
        p: "نعالج بياناتك بناءً على موافقتك عند التسجيل، ولتنفيذ العقد التعليمي بيننا، ولأغراض قانونية (كالفوترة الضريبية) عند الاقتضاء.",
      },
      {
        h: "حقوقك",
        p: "وفق القانون 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي، يحق لك الوصول إلى بياناتك، تصحيحها، طلب حذفها، والاعتراض على معالجتها، عبر التواصل معنا على العنوان المذكور أدناه.",
      },
      {
        h: "مشاركة البيانات",
        p: "لا نبيع بياناتك لأي طرف ثالث. قد تُشارك بيانات محدودة مع مزود الاستضافة التقنية فقط، بالقدر اللازم لتشغيل الخدمة. الدفع يدوي بالكامل (تحويل بريدي ومراجعة إدارية) ولا يمر عبر أي مزود دفع خارجي.",
      },
      {
        h: "مدة الاحتفاظ بالبيانات",
        p: "نحتفظ ببياناتك طوال مدة نشاط حسابك، ولمدة إضافية بعد الإلغاء إن اقتضت القوانين المحاسبية/الضريبية ذلك.",
      },
      {
        h: "الاتصال بنا",
        p: "لأي استفسار متعلق بالخصوصية أو لممارسة حقوقك، راسلنا عبر البريد الإلكتروني الموضح في تذييل الموقع.",
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    sections: [
      {
        h: "Qui nous sommes et pourquoi nous collectons vos données",
        p: "Nourix Academy (« la Plateforme ») collecte vos données personnelles afin de fournir des services d’apprentissage à distance, suivre votre progression, délivrer des certificats, et gérer les abonnements et paiements.",
      },
      {
        h: "Données collectées",
        p: "Nom, e-mail, numéro de téléphone (si fourni), données d'inscription et de progression, résultats aux évaluations, et données de facturation (nous ne collectons ni ne stockons aucune donnée de carte bancaire — le paiement est manuel, par virement postal et justificatif de paiement).",
      },
      {
        h: "Base légale du traitement",
        p: "Nous traitons vos données sur la base de votre consentement lors de l’inscription, de l’exécution du contrat pédagogique, et pour des obligations légales (facturation fiscale) le cas échéant.",
      },
      {
        h: "Vos droits",
        p: "Conformément à la loi 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, vous disposez d’un droit d’accès, de rectification, de suppression et d’opposition, en nous contactant à l’adresse indiquée ci-dessous.",
      },
      {
        h: "Partage des données",
        p: "Nous ne vendons pas vos données. Des données limitées peuvent être partagées uniquement avec l'hébergeur technique, dans la stricte mesure nécessaire au fonctionnement du service. Le paiement est entièrement manuel (virement postal et vérification par l'administration) et ne passe par aucun prestataire de paiement externe.",
      },
      {
        h: "Durée de conservation",
        p: "Nous conservons vos données pendant la durée d’activité de votre compte, et au-delà si des obligations comptables/fiscales l’exigent.",
      },
      {
        h: "Nous contacter",
        p: "Pour toute question relative à la confidentialité ou pour exercer vos droits, contactez-nous à l’adresse e-mail indiquée en pied de page.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    sections: [
      {
        h: "Who we are and why we collect your data",
        p: 'Nourix Academy ("the Platform") collects your personal data to provide remote learning services, track your progress, issue certificates, and manage subscriptions and payments.',
      },
      {
        h: "Data we collect",
        p: "Name, email, phone number (if provided), enrollment and progress data, assessment results, and billing data (we never collect or store any card details — payment is manual, via postal transfer and a payment receipt).",
      },
      {
        h: "Legal basis for processing",
        p: "We process your data based on your consent at sign-up, to perform our educational contract with you, and for legal obligations (e.g. tax invoicing) where applicable.",
      },
      {
        h: "Your rights",
        p: "Under Law 18-07 on the protection of individuals in the processing of personal data, you have the right to access, correct, request deletion of, and object to the processing of your data, by contacting us at the address below.",
      },
      {
        h: "Data sharing",
        p: "We do not sell your data. Limited data may be shared only with the technical hosting provider, to the extent necessary to operate the service. Payment is entirely manual (postal transfer and review by the administration) and never goes through any external payment provider.",
      },
{
        h: "Data retention",
        p: "We retain your data for as long as your account is active, and for an additional period after cancellation where accounting/tax rules require it.",
      },
      {
        h: "Contact us",
        p: "For any privacy question or to exercise your rights, contact us at the email address shown in the site footer.",
      },
    ],
  },
} as const;

const termsContent = {
  ar: {
    title: "شروط الاستخدام",
    sections: [
      {
        h: "قبول الشروط",
        p: "باستخدامك للمنصة، فإنك توافق على هذه الشروط. إذا كنت لا توافق، يرجى عدم استخدام المنصة.",
      },
      {
        h: "الحسابات والأدوار",
        p: "يوفر النظام أدوارًا متعددة (متعلم، أستاذ/مدرّب، مؤسسة، مسؤول). كل مستخدم مسؤول عن سرية بيانات دخوله وعن دقة المعلومات المقدمة.",
      },
      {
        h: "الاشتراكات والدفع",
        p: "تُعرض الأسعار بالدينار الجزائري (DZD) وفق التنظيم المعمول به. الدفع يتم يدويًا عبر تحويل بريدي (CCP/RIP) وإرسال إثبات الدفع للمراجعة (عبر المنصة أو واتساب)؛ لا نطلب ولا نُخزّن أي بيانات لبطاقة بنكية. تفعيل الاشتراك يتم بعد مراجعة الإدارة للإيصال.",
      },
      {
        h: "الإلغاء والاسترجاع",
        p: "يمكن إلغاء الاشتراك في أي وقت من لوحة التحكم؛ سياسة الاسترجاع (كليًا أو جزئيًا) تُحدَّد حسب المدة المستهلكة من الخدمة ووفق ما يقتضيه القانون التجاري الجزائري.",
      },
      {
        h: "المحتوى والملكية الفكرية",
        p: "كل محتوى الدورات (نصوص، فيديوهات، تمارين) محمي بحقوق الملكية الفكرية. يُمنع نسخه أو إعادة توزيعه دون إذن كتابي.",
      },
      {
        h: "سلوك المستخدم",
        p: "يُمنع استخدام المنصة للغش في الاختبارات، مشاركة الحسابات، أو أي نشاط يضر بالمنصة أو بمستخدمين آخرين. الإدارة تحتفظ بحق تعليق أي حساب يخالف هذه الشروط.",
      },
      {
        h: "الشهادات",
        p: "الشهادات الصادرة عن المنصة تُثبت إكمال المحتوى التعليمي داخل Nourix Academy فقط، وليست معادلة رسميًا ما لم يُذكر ذلك صراحة.",
      },
      {
        h: "حدود المسؤولية",
        p: 'تُقدَّم الخدمة "كما هي". لا نضمن نتائج أكاديمية محددة (كالنجاح في امتحان رسمي)، والمنصة أداة مساعدة على التعلم وليست بديلاً عن المتابعة المدرسية الرسمية.',
      },
      {
        h: "التعديلات على الشروط",
        p: "قد تُحدَّث هذه الشروط من وقت لآخر؛ الاستمرار في استخدام المنصة بعد التحديث يُعد قبولًا للنسخة الجديدة.",
      },
    ],
  },
  fr: {
    title: "Conditions d’utilisation",
    sections: [
      {
        h: "Acceptation des conditions",
        p: "En utilisant la plateforme, vous acceptez ces conditions. Si vous n’êtes pas d’accord, veuillez ne pas utiliser la plateforme.",
      },
      {
        h: "Comptes et rôles",
        p: "Le système propose plusieurs rôles (apprenant, formateur/enseignant, institution, administrateur). Chaque utilisateur est responsable de la confidentialité de ses identifiants et de l’exactitude des informations fournies.",
      },
      {
        h: "Abonnements et paiement",
        p: "Les prix sont affichés en dinars algériens (DZD) conformément à la réglementation en vigueur. Le paiement s'effectue manuellement par virement postal (CCP/RIP) suivi de l'envoi d'un justificatif pour vérification (via la plateforme ou WhatsApp) ; nous ne demandons ni ne stockons aucune donnée de carte bancaire. L'abonnement est activé après vérification du reçu par l'administration.",
      },
      {
        h: "Annulation et remboursement",
        p: "L’abonnement peut être annulé à tout moment depuis le tableau de bord ; la politique de remboursement (total ou partiel) dépend de la durée de service déjà consommée et du droit commercial algérien applicable.",
      },
      {
        h: "Contenu et propriété intellectuelle",
        p: "Tout le contenu des cours (textes, vidéos, exercices) est protégé par le droit de propriété intellectuelle. Sa copie ou redistribution sans autorisation écrite est interdite.",
      },
      {
        h: "Comportement de l’utilisateur",
        p: "Il est interdit d’utiliser la plateforme pour tricher aux évaluations, partager des comptes, ou toute activité nuisant à la plateforme ou à d’autres utilisateurs. L’administration se réserve le droit de suspendre tout compte enfreignant ces conditions.",
      },
      {
        h: "Certificats",
        p: "Les certificats délivrés attestent uniquement l’achèvement du contenu pédagogique sur Nourix Academy et ne constituent pas une équivalence officielle sauf mention explicite contraire.",
      },
      {
        h: "Limitation de responsabilité",
        p: "Le service est fourni « tel quel ». Nous ne garantissons pas de résultat académique spécifique (comme la réussite à un examen officiel) ; la plateforme est un outil d’accompagnement et non un substitut au suivi scolaire officiel.",
      },
      {
        h: "Modifications des conditions",
        p: "Ces conditions peuvent être mises à jour ponctuellement ; la poursuite de l’utilisation après mise à jour vaut acceptation de la nouvelle version.",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    sections: [
      {
        h: "Acceptance of terms",
        p: "By using the platform, you agree to these terms. If you do not agree, please do not use the platform.",
      },
      {
        h: "Accounts and roles",
        p: "The system offers multiple roles (learner, teacher/instructor, institution, admin). Each user is responsible for the confidentiality of their credentials and the accuracy of the information they provide.",
      },
      {
        h: "Subscriptions and payment",
        p: "Prices are shown in Algerian dinars (DZD) per applicable regulation. Payment is manual, via postal transfer (CCP/RIP) followed by sending proof of payment for review (through the platform or WhatsApp); we never request or store any card details. A subscription is activated once the administration has reviewed the receipt.",
      },
      {
        h: "Cancellation and refunds",
        p: "A subscription can be canceled at any time from the dashboard; the refund policy (full or partial) depends on the service duration already consumed and applicable Algerian commercial law.",
      },
      {
        h: "Content and intellectual property",
        p: "All course content (text, video, exercises) is protected by intellectual property rights. Copying or redistributing it without written permission is prohibited.",
      },
      {
        h: "User conduct",
        p: "Using the platform to cheat on assessments, share accounts, or engage in any activity harmful to the platform or other users is prohibited. The administration reserves the right to suspend any account violating these terms.",
      },
      {
        h: "Certificates",
        p: "Certificates issued attest only to completion of educational content within Nourix Academy and are not an official equivalence unless explicitly stated.",
      },
      {
        h: "Limitation of liability",
        p: 'The service is provided "as is". We do not guarantee any specific academic outcome (such as passing an official exam); the platform is a learning aid, not a substitute for official school attendance.',
      },
      {
        h: "Changes to these terms",
        p: "These terms may be updated from time to time; continued use of the platform after an update constitutes acceptance of the new version.",
      },
    ],
  },
} as const;

export default function Legal() {
  const [, params] = useRoute("/legal/:doc");
  const initialDoc: Doc = params?.doc === "terms" ? "terms" : "privacy";
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("nourix-language") as Lang) || "ar"
  );
  const [doc, setDoc] = useState<Doc>(initialDoc);
  const t = nav[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  const content = (doc === "privacy" ? privacyContent : termsContent)[lang];

  return (
    <div
      dir={dir}
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
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="catalog-hero">
            <div>
              <div className="section-kicker">NOURIX / LEGAL</div>
              <h1>{content.title}</h1>
            </div>
          </div>
          <div className="catalog-tabs" style={{ marginBottom: 20 }}>
            <button
              className={doc === "privacy" ? "active" : ""}
              onClick={() => setDoc("privacy")}
            >
              {t.privacy}
            </button>
            <button
              className={doc === "terms" ? "active" : ""}
              onClick={() => setDoc("terms")}
            >
              {t.terms}
            </button>
          </div>
          <div
            className="flow-card"
            style={{
              marginBottom: 24,
              borderColor: "rgba(212,167,44,.3)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <ShieldAlert
              size={20}
              color="#d4a72c"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>
              {t.draftNotice}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {content.sections.map(section => (
              <div key={section.h}>
                <h2 style={{ fontSize: 15, marginBottom: 6, color: "#f1ce63" }}>
                  {section.h}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.8,
                    opacity: 0.85,
                  }}
                >
                  {section.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
