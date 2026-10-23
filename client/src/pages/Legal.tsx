import { useState } from "react";
import { Link, useRoute } from "wouter";
import { BackArrow } from "@/components/DirectionalArrow";
import { Globe2, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getStoredLanguage, setStoredLanguage } from "@/lib/language";
import { trpc } from "@/lib/trpc";

type Lang = "ar" | "fr" | "en";
type Doc = "privacy" | "terms";

const nav = {
  ar: {
    back: "الرئيسية",
    ownerTitle: "من يدير المنصة وكيف تتواصل معه",
    owner: "صاحب المنصة",
    email: "البريد",
    address: "العنوان",
    hosting: "مكان استضافة البيانات",
    retention: "مدة الاحتفاظ التي حددها المالك",
    refund: "سياسة الاسترجاع التي حددها المالك",
    updated: "آخر تحديث",
    notSet: "لم يحدده مالك المنصة بعد",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    draftNotice:
      "مسودة للتجربة: هذا النص يغطي النقاط الأساسية لكنه ليس وثيقة معتمدة قانونيًا. يجب أن يراجعه محامٍ مختص في القانون الجزائري (القانون 18-07 لحماية المعطيات ذات الطابع الشخصي) قبل الإطلاق التجاري وقبل تحصيل أي اشتراك.",
  },
  fr: {
    back: "Accueil",
    ownerTitle: "Qui exploite la plateforme et comment le joindre",
    owner: "Exploitant",
    email: "E-mail",
    address: "Adresse",
    hosting: "Lieu d'hébergement des données",
    retention: "Durée de conservation fixée par l'exploitant",
    refund: "Politique de remboursement fixée par l'exploitant",
    updated: "Dernière mise à jour",
    notSet: "pas encore indiqué par l'exploitant",
    privacy: "Politique de confidentialité",
    terms: "Conditions d’utilisation",
    draftNotice:
      "Brouillon pour la phase d’essai : ce texte couvre les points essentiels mais n’est pas un document juridiquement validé. Il doit être révisé par un avocat spécialisé en droit algérien (loi 18-07 sur la protection des données à caractère personnel) avant le lancement commercial et avant tout encaissement d’abonnement.",
  },
  en: {
    back: "Home",
    ownerTitle: "Who runs the platform and how to reach them",
    owner: "Operator",
    email: "Email",
    address: "Address",
    hosting: "Where the data is hosted",
    retention: "Retention period set by the operator",
    refund: "Refund policy set by the operator",
    updated: "Last updated",
    notSet: "not set by the operator yet",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    draftNotice:
      "Draft for the trial phase: this text covers the essential points but is not a legally certified document. It must be reviewed by a lawyer specialised in Algerian law (Law 18-07 on personal data protection) before the commercial launch and before any subscription is charged.",
  },
} as const;

const privacyContent = {
  ar: {
    title: "سياسة الخصوصية",
    sections: [
      {
        h: "من نحن ولماذا نجمع بياناتك",
        p: 'منصة Tafawoq ("المنصة") تساعد تلاميذ البكالوريا في الجزائر على التحضير: دروس وتمارين واختبارات وأستاذ ذكي وحصص مع أساتذة. نجمع بياناتك فقط لتقديم هذه الخدمة ومتابعة تقدمك وإدارة اشتراكك.',
      },
      {
        h: "البيانات التي نجمعها",
        p: "الحساب: الاسم، البريد الإلكتروني، كلمة المرور (مشفّرة، لا نراها أبداً)، العمر، المستوى، الشعبة والمادة الثانية. التعلّم: إجاباتك ونتائج اختباراتك ونوع أخطائك وخطة مراجعتك ونقاطك، ومحادثاتك مع الأستاذ الذكي، وصور التمارين التي ترسلها، وملاحظات حجز الحصص. الاشتراك: طلبات الاشتراك وطريقة الدفع التي تختارها (لا نجمع أي بيانات بطاقة بنكية). الأمان: سجل أحداث (تسجيل الدخول، تغيير الشعبة…) دون كلمات المرور.",
      },
      {
        h: "الصوت والميكروفون",
        p: "عند التحدث مع الأستاذ، يحوّل متصفحك صوتك إلى نص (قد يعالجه مزود المتصفح، مثل Google في Chrome)، ولا تصل إلى المنصة إلا الكلمات المكتوبة، ولا نسجّل صوتك. صوت الأستاذ يُولَّد من النص على خوادمنا.",
      },
      {
        h: "أساس المعالجة",
        p: "نعالج بياناتك بناءً على موافقتك عند التسجيل، ولتنفيذ الخدمة التعليمية التي اشتركت فيها، ولأغراض قانونية عند الاقتضاء.",
      },
      {
        h: "التلاميذ القاصرون وأولياء الأمور",
        p: "إذا كان عمرك أقل من 18 سنة، فاستعمالك للمنصة يكون بموافقة وليّك. يمكن لوليّك ربط حسابه بحسابك برمز تعطيه إياه، فيرى مستواك وتقدمك واشتراكك. محادثاتك مع الأستاذ تبقى خاصة ولا تظهر لوليّك إلا إذا فعّلت مشاركتها، ويمكنك إيقافها متى شئت.",
      },
      {
        h: "مشاركة البيانات",
        p: "لا نبيع بياناتك. نشارك فقط ما يلزم لتشغيل الخدمة: مزود الاستضافة؛ وعند تفعيلها، مزود الذكاء الاصطناعي (يصله محتوى الدرس ورسائلك وإجاباتك ومستواك الدراسي ودرجة إتقانك ونوع أخطائك، دون اسمك أو بريدك أو عمرك أو أهدافك؛ ولا تُرسل إليه صور التمارين) ومزود تحويل النص إلى صوت (يصله نص الرد دون اسمك)؛ ومزود البريد الإلكتروني الذي يرسل رابط استعادة كلمة المرور (يصله بريدك ونص الرسالة)؛ والأستاذ الذي تحجز معه حصة (اسمك الأول، المادة وملاحظتك). الحصص المباشرة تجري على Jitsi Meet (خدمة خارجية) برابط سري، ولا تسجّلها المنصة. الأساتذة الذين يجيبون عن تمارينك يرون اسمك الأول وصورة التمرين فقط.",
      },
      {
        h: "مدة الاحتفاظ",
        p: "نحتفظ ببياناتك ما دام حسابك نشطاً. من صفحة «حسابي» يمكنك تنزيل نسخة من بياناتك فوراً، وطلب حذف حسابك. تؤكد الإدارة الطلب ثم يُمحى اسمك وبريدك وكلمة مرورك ومحادثاتك وتمارينك وصورك وإجاباتك المكتوبة وروابط الولي، ويتوقف الدخول. تبقى دون اسم: سجلات الدفع والاشتراك (محاسبة) ونتائج الإجابات صح/خطأ (إحصاء). مدة الاحتفاظ بهذه السجلات وبالنسخ الاحتياطية تحددها إدارة المنصة وفق ما يفرضه القانون.",
      },
      {
        h: "حقوقك",
        p: "وفق القانون 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي، يحق لك الوصول إلى بياناتك وتصحيحها وطلب حذفها والاعتراض على معالجتها، من صفحة «حسابي» أو بالتواصل مع إدارة المنصة. لتصحيح بيانات لا يمكنك تعديلها بنفسك، تواصل مع الإدارة.",
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    sections: [
      {
        h: "Qui sommes-nous et pourquoi collectons-nous vos données",
        p: "Tafawoq (« la Plateforme ») aide les élèves algériens à préparer le BAC : leçons, exercices, tests, professeur IA et séances avec des enseignants. Nous collectons vos données uniquement pour fournir ce service, suivre votre progression et gérer votre abonnement.",
      },
      {
        h: "Données collectées",
        p: "Compte : nom, e-mail, mot de passe (chiffré, jamais visible), âge, niveau, filière et deuxième matière. Apprentissage : réponses, résultats, types d’erreurs, plan de révision, points, conversations avec le professeur IA, photos d’exercices envoyées, notes de réservation. Abonnement : demandes et moyen de paiement choisi (aucune donnée de carte bancaire). Sécurité : journal d’événements (connexions, changement de filière…), sans mots de passe.",
      },
      {
        h: "Voix et microphone",
        p: "Quand vous parlez au professeur, votre navigateur transforme votre voix en texte (ce traitement peut être fait par l’éditeur du navigateur, par exemple Google pour Chrome) ; seuls les mots écrits parviennent à la Plateforme, qui n’enregistre pas votre voix. La voix du professeur est générée à partir du texte sur nos serveurs.",
      },
      {
        h: "Base du traitement",
        p: "Nous traitons vos données sur la base de votre consentement à l’inscription, pour exécuter le service éducatif souscrit, et pour des obligations légales le cas échéant.",
      },
      {
        h: "Élèves mineurs et parents",
        p: "Si vous avez moins de 18 ans, l’utilisation de la Plateforme se fait avec l’accord de votre parent ou tuteur. Il peut lier son compte au vôtre grâce à un code que vous lui donnez, et voit alors votre niveau, votre progression et votre abonnement. Vos conversations avec le professeur restent privées, sauf si vous activez leur partage, désactivable à tout moment.",
      },
      {
        h: "Partage des données",
        p: "Nous ne vendons pas vos données. Nous ne partageons que le nécessaire : l’hébergeur ; lorsqu’ils sont activés, le fournisseur d’IA (il reçoit le contenu de la leçon, vos messages et réponses, votre niveau scolaire, votre maîtrise et vos types d’erreurs, sans votre nom, e-mail, âge ni objectifs ; les photos d’exercices ne lui sont jamais envoyées) et le fournisseur de synthèse vocale (le texte de la réponse, sans votre nom) ; le fournisseur d’e-mail qui envoie le lien de réinitialisation du mot de passe (votre adresse et le message) ; l’enseignant avec qui vous réservez une séance (prénom, matière, votre note). Les séances en direct se déroulent sur Jitsi Meet (service externe) via un lien secret, et la Plateforme ne les enregistre pas. Les enseignants qui répondent à vos exercices ne voient que votre prénom et la photo.",
      },
      {
        h: "Durée de conservation",
        p: "Vos données sont conservées tant que votre compte est actif. Depuis « Mon compte », vous pouvez télécharger immédiatement une copie de vos données et demander la suppression du compte. Après confirmation par l’administration, nom, e-mail, mot de passe, conversations, exercices, photos, réponses rédigées et liens parent sont effacés et la connexion est bloquée. Restent sans nom : paiements et abonnements (comptabilité) et le juste/faux des réponses (statistiques). La durée de conservation de ces traces et des sauvegardes est fixée par l’administration selon les obligations légales.",
      },
      {
        h: "Vos droits",
        p: "Conformément à la loi 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel, vous pouvez accéder à vos données, les rectifier, demander leur suppression et vous opposer à leur traitement depuis « Mon compte » ou en contactant l’administration de la Plateforme.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    sections: [
      {
        h: "Who we are and why we collect your data",
        p: 'Tafawoq ("the Platform") helps Algerian students prepare for the BAC: lessons, exercises, tests, an AI teacher and sessions with teachers. We collect your data only to provide this service, follow your progress and manage your subscription.',
      },
      {
        h: "Data we collect",
        p: "Account: name, email, password (encrypted, never visible to us), age, level, stream and second subject. Learning: your answers, results, types of mistakes, revision plan, points, conversations with the AI teacher, exercise photos you send, and booking notes. Subscription: requests and the payment method you choose (no bank card data). Security: an event log (sign-ins, stream changes…), never passwords.",
      },
      {
        h: "Voice and microphone",
        p: "When you speak to the teacher, your browser turns your voice into text (this may be done by the browser vendor, e.g. Google for Chrome); only the written words reach the Platform, which never records your voice. The teacher's voice is generated from text on our servers.",
      },
      {
        h: "Legal basis",
        p: "We process your data based on your consent at registration, to deliver the educational service you subscribed to, and for legal obligations where applicable.",
      },
      {
        h: "Minors and parents",
        p: "If you are under 18, you use the Platform with your parent's or guardian's agreement. They can link their account to yours with a code you give them, and then see your level, progress and subscription. Your conversations with the teacher stay private unless you turn on sharing, which you can turn off at any time.",
      },
      {
        h: "Data sharing",
        p: "We do not sell your data. We share only what the service needs: our hosting provider; when enabled, the AI provider (it receives the lesson content, your messages and answers, your school level, mastery and mistake types — never your name, email, age or goals; exercise photos are never sent to it) and the text-to-speech provider (the reply text, without your name); the email provider that sends password reset links (your address and the message); the teacher you book a session with (first name, subject, your note). Live sessions take place on Jitsi Meet (an external service) through a secret link, and the Platform does not record them. Teachers who answer your exercises see only your first name and the photo.",
      },
      {
        h: "Retention",
        p: "We keep your data while your account is active. From “My account” you can download a copy of your data at once and request deletion of your account. Once the administration confirms, your name, email, password, chats, exercises, photos, written answers and parent links are erased and sign-in is blocked. Kept without a name: payment and subscription records (accounting) and right/wrong answer results (statistics). How long those records and backups are kept is set by the administration according to legal obligations.",
      },
      {
        h: "Your rights",
        p: "Under Law 18-07 on the protection of individuals in the processing of personal data, you may access, correct, request deletion of, and object to the processing of your data from “My account” or by contacting the Platform's administration.",
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
        p: "الحسابات: تلميذ، وليّ أمر، أستاذ، مسؤول. يختار المستخدم بنفسه دور التلميذ أو الولي فقط؛ حسابات الأساتذة تفعّلها الإدارة. كل مستخدم مسؤول عن سرية كلمة مروره وعن دقة معلوماته. الشعبة تُختار مرة واحدة ولا تتغير إلا بطلب توافق عليه الإدارة.",
      },
      {
        h: "الاشتراك والدفع",
        p: "يُعرض السعر بالدينار الجزائري في صفحة الاشتراك. يُدفع عبر الوسيلة المختارة (CCP أو بريدي موب…) ثم تفعّل الإدارة الاشتراك بعد تأكيد الدفع؛ لا يُعتبر أي شيء مدفوعاً قبل ذلك. لا يتجدد الاشتراك تلقائياً. اختبار تحديد المستوى متاح بلا اشتراك.",
      },
      {
        h: "الاسترجاع",
        p: "تُدرس طلبات الاسترجاع حسب المدة المستهلكة من الاشتراك ووفق ما يقتضيه القانون الجزائري، بالتواصل مع الإدارة.",
      },
      {
        h: "الأستاذ الذكي والمحتوى",
        p: "الأستاذ الذكي والتمارين المولّدة وسيلة مساعدة وقد تخطئ أحياناً؛ لا تعوّض الأستاذ ولا المتابعة المدرسية. مواضيع البكالوريا التجريبية مولّدة على نمط الامتحان وليست مواضيع رسمية ما لم يُذكر ذلك. كل المحتوى محمي بحقوق الملكية الفكرية ويُمنع نسخه أو إعادة توزيعه دون إذن.",
      },
      {
        h: "الحصص مع الأساتذة",
        p: "تُحجز الحصص للمشتركين حسب القواعد المعروضة في صفحة الحصص (الإلغاء المجاني قبل 12 ساعة على الأقل). يلتزم الجميع بالاحترام خلال الحصة؛ ويحق للإدارة إيقاف أي حساب يسيء.",
      },
      {
        h: "سلوك المستخدم",
        p: "يُمنع مشاركة الحسابات، أو محاولة الوصول إلى بيانات غيرك، أو إرسال محتوى مسيء، أو أي نشاط يضر بالمنصة أو بمستخدميها. يحق للإدارة تعليق أي حساب يخالف هذه الشروط.",
      },
      {
        h: "حدود المسؤولية",
        p: 'تُقدَّم الخدمة "كما هي". لا نضمن نتيجة معيّنة في البكالوريا؛ المنصة أداة مساعدة على التحضير.',
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
        p: "En utilisant la Plateforme, vous acceptez ces conditions. Si vous n’êtes pas d’accord, merci de ne pas l’utiliser.",
      },
      {
        h: "Comptes et rôles",
        p: "Comptes : élève, parent, enseignant, administrateur. Chacun choisit lui-même uniquement le rôle élève ou parent ; les comptes enseignants sont activés par l’administration. Chaque utilisateur est responsable de la confidentialité de son mot de passe et de l’exactitude de ses informations. La filière est choisie une seule fois et ne change que sur demande acceptée par l’administration.",
      },
      {
        h: "Abonnement et paiement",
        p: "Le prix est affiché en dinars algériens sur la page d’abonnement. Le paiement se fait par le moyen choisi (CCP, BaridiMob…), puis l’administration active l’abonnement après confirmation ; rien n’est considéré comme payé avant. L’abonnement ne se renouvelle pas automatiquement. Le test de positionnement est accessible sans abonnement.",
      },
      {
        h: "Remboursement",
        p: "Les demandes de remboursement sont étudiées selon la durée consommée et conformément au droit algérien, en contactant l’administration.",
      },
      {
        h: "Professeur IA et contenu",
        p: "Le professeur IA et les exercices générés sont une aide et peuvent parfois se tromper ; ils ne remplacent ni un enseignant ni le suivi scolaire. Les sujets de BAC blanc sont générés sur le modèle de l’examen et ne sont pas des sujets officiels, sauf mention contraire. Tout le contenu est protégé et ne peut être copié ni redistribué sans autorisation.",
      },
      {
        h: "Séances avec des enseignants",
        p: "Les séances sont réservées aux abonnés selon les règles affichées sur la page des séances (annulation gratuite jusqu’à 12 h avant). Chacun s’engage au respect pendant la séance ; l’administration peut suspendre tout compte qui en abuse.",
      },
      {
        h: "Comportement",
        p: "Sont interdits : le partage de compte, toute tentative d’accéder aux données d’autrui, l’envoi de contenu offensant et toute activité nuisible à la Plateforme ou à ses utilisateurs. L’administration peut suspendre tout compte qui enfreint ces conditions.",
      },
      {
        h: "Limitation de responsabilité",
        p: "Le service est fourni « tel quel ». Nous ne garantissons aucun résultat au BAC ; la Plateforme est une aide à la préparation.",
      },
      {
        h: "Modifications",
        p: "Ces conditions peuvent être mises à jour ; continuer à utiliser la Plateforme après une mise à jour vaut acceptation de la nouvelle version.",
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
        p: "Accounts: student, parent, teacher, admin. Users choose only the student or parent role themselves; teacher accounts are activated by the administration. Every user is responsible for keeping their password secret and their information accurate. The stream is chosen once and changes only through a request the administration approves.",
      },
      {
        h: "Subscription and payment",
        p: "The price is shown in Algerian dinars on the subscription page. You pay with the chosen method (CCP, BaridiMob…), then the administration activates the subscription once the payment is confirmed; nothing counts as paid before that. Subscriptions never renew automatically. The placement test is available without a subscription.",
      },
      {
        h: "Refunds",
        p: "Refund requests are assessed according to the time used and Algerian law, by contacting the administration.",
      },
      {
        h: "AI teacher and content",
        p: "The AI teacher and generated exercises are a study aid and can sometimes be wrong; they replace neither a teacher nor school follow-up. Mock BAC papers are generated in the exam's style and are not official papers unless stated. All content is protected and may not be copied or redistributed without permission.",
      },
      {
        h: "Sessions with teachers",
        p: "Sessions are for subscribers, under the rules shown on the sessions page (free cancellation up to 12 hours before). Everyone must be respectful during a session; the administration may suspend any account that abuses it.",
      },
      {
        h: "User conduct",
        p: "Sharing accounts, trying to access other people's data, sending offensive content, or any activity harmful to the platform or its users is prohibited. The administration may suspend any account that breaks these terms.",
      },
      {
        h: "Limitation of liability",
        p: 'The service is provided "as is". We do not guarantee any particular BAC result; the platform is a preparation aid.',
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
    () => getStoredLanguage() ?? "ar"
  );
  const [doc, setDoc] = useState<Doc>(initialDoc);
  const t = nav[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const changeLang = (next: Lang) => {
    setLang(next);
    setStoredLanguage(next);
  };
  const content = (doc === "privacy" ? privacyContent : termsContent)[lang];
  // The owner's details (admin settings); what is not set yet says so.
  const legal = trpc.tafawoq.legalInfo.useQuery(undefined, { staleTime: 5 * 60_000 });
  const owner = legal.data?.fields ?? { ownerName: null, contactEmail: null, contactAddress: null, refundPolicy: null, hostingLocation: null, dataRetention: null, updatedOn: null };

  return (
    <div
      dir={dir}
      className="app-shell min-h-screen bg-[#050505] text-[#f7f4ec]"
    >
      <header className="site-header">
        <div className="container flex h-[76px] items-center justify-between gap-6">
          <Link href="/tafawoq" className="brand-lockup">
            <span className="brand-mark-text" aria-hidden="true">
              T
            </span>
            <span className="brand-wordmark">
              Tafawoq <b>AI Teacher</b>
            </span>
          </Link>
          <div className="catalog-header-actions">
            <Link href="/tafawoq" className="catalog-home-link">
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
              <div className="section-kicker">TAFAWOQ / LEGAL</div>
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
            <div>
              <h2 style={{ fontSize: 15, marginBottom: 6, color: "#f1ce63" }}>{t.ownerTitle}</h2>
              <dl style={{ margin: 0, fontSize: 13, lineHeight: 1.8, opacity: 0.85, display: "grid", gap: 4 }}>
                {(
                  [
                    [t.owner, owner.ownerName],
                    [t.email, owner.contactEmail],
                    [t.address, owner.contactAddress],
                    [t.hosting, owner.hostingLocation],
                    ...(doc === "privacy" ? [[t.retention, owner.dataRetention] as const] : [[t.refund, owner.refundPolicy] as const]),
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt style={{ display: "inline", fontWeight: 600 }}>{label}: </dt>
                    <dd style={{ display: "inline", margin: 0 }} dir="auto">
                      {value ?? <em>{t.notSet}</em>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
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
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
              {t.updated}: {owner.updatedOn ?? t.notSet}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
