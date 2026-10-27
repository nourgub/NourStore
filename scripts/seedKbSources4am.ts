// Registers the REAL sources found via live web research on 2026-10-26 and
// 2026-10-27 for the Algerian math / 4AM (BEM) knowledge-base pilot (see
// DELIVERY_SUMMARY section "NourStore Knowledge Engine"). Metadata + URL
// only — no content is fetched or stored here, since none of these sources'
// license status has been confirmed yet (see knowledgeBase/service.ts's
// canStoreFullText/canStoreExcerpt gating). Safe to re-run: registerSource
// is idempotent on url, addSourceResearchNote is idempotent on exact note
// text, and this script skips a source document whose url is already
// recorded.
//
// Run with: npx tsx scripts/seedKbSources4am.ts
import { addSourceResearchNote, registerSource, recordSourceDocument } from "../src/lib/knowledgeBase/service";
import { listKbSourceDocuments } from "../src/lib/db";

function alreadyRecorded(url: string): boolean {
  return listKbSourceDocuments().some((d) => d.url === url);
}

const onefd = registerSource({
  name: "onefd.edu.dz — الديوان الوطني للتعليم والتكوين عن بعد",
  url: "http://www.onefd.edu.dz",
  sourceType: "official_ministry",
  licenseStatus: "unknown",
  reliabilityNote:
    "موقع رسمي تابع لوزارة التربية الوطنية الجزائرية. وُجد عبر بحث حي أنه يستضيف وثائق مرافقة لمناهج التعليم المتوسط (تأكدنا من وجود نسخة السنة الثانية متوسط في الرياضيات فعليًا؛ لم نجد رابطًا مؤكدًا لنسخة السنة الرابعة متوسط على هذا النطاق بالذات في هذا البحث). يحتاج تحقق بشري من حالة الترخيص قبل استخراج أي نص.",
});

const eddirasa = registerSource({
  name: "Eddirasa (الدراسة الجزائري)",
  url: "https://eddirasa.com",
  sourceType: "trusted_educational_site",
  licenseStatus: "unknown",
  reliabilityNote:
    'موقع تعليمي جزائري معروف يستضيف مواضيع شهادة التعليم المتوسط (BEM) السابقة وتصحيحاتها النموذجية لعدة سنوات (2015، 2021، 2022، 2023، 2024). ملاحظة من الموقع نفسه: بعض الصفحات تصف موضوعها بأنه "غير رسمي" (مثال: موضوع 2023)، بينما تصف أخرى موضوعها بأنه رسمي (مثال: تصحيح 2022) — كل وثيقة يجب التحقق من رسميتها فرديًا قبل اعتمادها.',
});

const dzexams = registerSource({
  name: "DZ Exams",
  url: "https://www.dzexams.com",
  sourceType: "trusted_educational_site",
  licenseStatus: "unknown",
  reliabilityNote: "موقع تعليمي جزائري يستضيف دروسًا وتمارين لمادة الرياضيات للسنة الرابعة متوسط من إعداد أساتذة أفراد، وليس محتوى وزاريًا رسميًا.",
});

const educationGov = registerSource({
  name: "education.gov.dz — الموقع الرسمي لوزارة التربية الوطنية الجزائرية",
  url: "https://www.education.gov.dz",
  sourceType: "official_ministry",
  licenseStatus: "unknown",
  reliabilityNote:
    'الموقع الرسمي لوزارة التربية الوطنية الجزائرية. تأكدنا عبر بحث حي بتاريخ 2026-10-27 من وجود صفحة فهرس رسمية لمناهج التعليم المتوسط تحتوي ملف "منهاج الرياضيات.pdf" (1.33 ميغابايت) ضمن المسار: وثائق بيداغوجية / مرحلة التعليم المتوسط / مناهج التعليم المتوسط. لم نتمكن من تنزيل الملف آليًا (الخادم أرجع أخطاء اتصال متكررة 503 وانقطاع اتصال عبر عدة محاولات حية) — هذا على الأرجح حماية تقنية للخادم ضد الزيارات الآلية، وليس بالضرورة منعًا مقصودًا؛ يحتاج تنزيلاً يدويًا من متصفح حقيقي ثم رفعه هنا. محتوى منهاج رسمي صادر عن الوزارة نفسها — أقرب حالة لدينا لملك عام حقيقي.',
});

const dzexamsPro = registerSource({
  name: "dzexams.pro",
  url: "https://www.dzexams.pro",
  sourceType: "trusted_educational_site",
  licenseStatus: "unknown",
  reliabilityNote:
    "موقع يستضيف ملفات PDF تعليمية جزائرية قابلة للتنزيل المباشر (روابط مباشرة من نوع /data/<id>/<id>.pdf)، وُجد عبر بحث حي بتاريخ 2026-10-27. أحد الملفات المكتشفة (34117.pdf) يبدو من وصف نتائج البحث أنه توزيع فصلي لمنهاج الرياضيات لكن حجمه تجاوز حد الأداة التقنية المتاحة لنا فلم نراجع محتواه الكامل فعليًا — لا يزال غير مؤكَّد المستوى والمصدر الحقيقي (موقع فردي، وليس وزاريًا).",
});

addSourceResearchNote(
  eddirasa.id,
  'مراجعة حية لصفحتي موضوع 2024 وتصحيح 2022: تذييل الموقع يذكر صراحة "جميع الحقوق محفوظة" — يستبعد افتراض الملك العام. محتوى الامتحان/التصحيح معروض كصورة (معاينة/تحميل PDF) وليس نصًا قابلًا للنسخ على الصفحة نفسها، فالاستخراج يحتاج قراءة الملف يدويًا (تنزيل + فتح) لا مجرد نسخ نص من الصفحة. لم تذكر الصفحتان أن الموضوع نفسه "رسمي" بشكل قاطع.',
);
addSourceResearchNote(
  dzexams.id,
  "محاولة وصول آلي للصفحة أرجعت خطأ 403 (ممنوع) — الموقع يحجب أدوات الجلب الآلي صراحة. أي استخراج من هذا المصدر يحتاج قراءة ونسخًا يدويين من متصفح حقيقي، لا جلبًا آليًا بأي شكل.",
);

const candidates = [
  {
    sourceId: onefd.id,
    url: "http://www.onefd.edu.dz/pdf/affaires-educatives/affaires-educatives2/affaires-educatives2-4/MOYEN/MOYEN/2AM/Maths.htm",
    title: "الوثيقة المرافقة لمنهاج الرياضيات - السنة الثانية متوسط (للمقارنة البنيوية فقط، ليست 4AM)",
    fileType: "html" as const,
    documentKind: "curriculum_reference" as const,
    contentYear: null,
    notes:
      "هذا الرابط فعليًا للسنة الثانية متوسط (2AM) لا الرابعة (4AM) — سُجِّل فقط لإثبات وجود نمط روابط onefd.edu.dz الرسمي. يحتاج بحثًا إضافيًا عن مسار 4AM المكافئ قبل أي استخراج.",
  },
  {
    sourceId: eddirasa.id,
    url: "https://eddirasa.com/bem-maths-2024/",
    title: "موضوع امتحان شهادة التعليم المتوسط 2024 — مادة الرياضيات",
    fileType: "html" as const,
    documentKind: "exam" as const,
    contentYear: "2024",
    notes: "لم يُستخرج أي نص بعد — الترخيص غير محدد.",
  },
  {
    sourceId: eddirasa.id,
    url: "https://eddirasa.com/correction-bem-maths-2024/",
    title: "تصحيح موضوع امتحان شهادة التعليم المتوسط 2024 — مادة الرياضيات",
    fileType: "html" as const,
    documentKind: "model_answer" as const,
    contentYear: "2024",
    notes: "التصحيح النموذجي المرافق للموضوع أعلاه — نفس ملاحظة الترخيص.",
  },
  {
    sourceId: eddirasa.id,
    url: "https://eddirasa.com/correction-bem-maths-2022/",
    title: "تصحيح موضوع امتحان شهادة التعليم المتوسط 2022 — مادة الرياضيات (تصفه صفحة الموقع بأنه رسمي)",
    fileType: "html" as const,
    documentKind: "model_answer" as const,
    contentYear: "2022",
    notes: "صفحة الموقع تصف موضوع 2022 بأنه رسمي — يحتاج تأكيدًا مستقلاً قبل اعتماد هذا الوصف.",
  },
  {
    sourceId: dzexams.id,
    url: "https://www.dzexams.com/en/4am/mathematiques/cours",
    title: "دروس وتمارين الرياضيات - السنة الرابعة متوسط",
    fileType: "html" as const,
    documentKind: "lesson" as const,
    contentYear: null,
    notes: "فهرس دروس من إعداد أساتذة أفراد وليس محتوى وزاريًا — يحتاج مراجعة محتوى فردي لكل درس.",
  },
];

let created = 0;
for (const c of candidates) {
  if (alreadyRecorded(c.url)) {
    console.log(`skip (already recorded): ${c.url}`);
    continue;
  }
  const doc = recordSourceDocument({
    sourceId: c.sourceId,
    url: c.url,
    title: c.title,
    fileType: c.fileType,
    subjectId: "math",
    educationLevelId: "4am",
    documentKind: c.documentKind,
    contentYear: c.contentYear,
    notes: c.notes,
  });
  console.log(`created: [${doc.status}] ${doc.title}`);
  created++;
}
console.log(`\nDone — ${created} new source document(s) recorded (metadata/URL only, no content fetched).`);
