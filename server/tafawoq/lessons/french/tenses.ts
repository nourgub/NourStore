// BAC French (اللغة الفرنسية), every stream: the tenses of the BAC text and
// grammar exercises — passé composé (avoir / être, agreement), imparfait vs
// passé composé, futur simple and conditionnel présent.
import type { Lesson } from "../../curriculum";
import { mcq } from "../mcq";

export const tensesLesson: Lesson = {
  key: "fr-tenses",
  curriculum: "dz",
  subject: "french",
  title: "الأزمنة: Passé composé و Imparfait و Futur و Conditionnel",
  levels: ["bac"],
  skills: [
    {
      key: "passe_compose",
      name: "الماضي المركّب Passé composé",
      prerequisites: [],
      explanation:
        "Passé composé = فعل مساعد (avoir أو être) في المضارع + اسم المفعول participe passé: «J'ai mangé»، «Elle est partie». اسم المفعول: أفعال -er → é (parlé)، و finir → fini، والشاذ أهمه: prendre → pris، faire → fait، voir → vu، avoir → eu، être → été، venir → venu، écrire → écrit. أغلب الأفعال تأخذ avoir، أما أفعال الحركة والتغيّر (aller, venir, partir, arriver, entrer, sortir, naître, mourir, rester…) والأفعال الضميرية (se lever) فتأخذ être، ويتفق اسم المفعول حينئذ مع الفاعل: «Elles sont arrivées».",
      example: {
        problem: "أكمل: «Ma sœur ___ à Alger hier.» (aller)",
        steps: ["aller فعل حركة → المساعد être", "être مع elle: est", "اسم المفعول allé يتفق مع الفاعل المؤنث: allée"],
        answer: "Ma sœur est allée à Alger hier.",
      },
    },
    {
      key: "imparfait_pc",
      name: "الماضي الناقص Imparfait والماضي المركّب",
      prerequisites: ["passe_compose"],
      explanation:
        "Imparfait للوصف والعادة والحدث المستمر في الماضي (autrefois, chaque jour, quand j'étais petit): جذر nous في المضارع + -ais, -ais, -ait, -ions, -iez, -aient (nous finissons → je finissais)، والشاذ الوحيد: être → j'étais. Passé composé لحدث محدد منتهٍ (hier, un jour, soudain). وفي السرد: الخلفية بالـ imparfait والحدث الذي يقطعها بالـ passé composé: «Je lisais quand le téléphone a sonné».",
      example: {
        problem: "أكمل: «Quand j'étais petit, je ___ à la plage chaque été.» (aller)",
        steps: ["quand j'étais petit و chaque été = عادة في الماضي → imparfait", "جذر nous allons: all-", "نهاية je: -ais → allais"],
        answer: "Quand j'étais petit, j'allais à la plage chaque été.",
      },
    },
    {
      key: "futur_conditionnel",
      name: "المستقبل Futur simple والشرطي Conditionnel présent",
      prerequisites: [],
      explanation:
        "Futur simple = المصدر + -ai, -as, -a, -ons, -ez, -ont: «Demain, je voyagerai» (أفعال -re تحذف e: prendre → je prendrai). Conditionnel présent = جذر المستقبل + نهايات imparfait (-ais, -ait, -ions…): «je voyagerais». الجذور الشاذة: être → ser-، avoir → aur-، aller → ir-، faire → fer-، pouvoir → pourr-، venir → viendr-، voir → verr-. نستعمل الشرطي للتأدب (Pourriez-vous… ?)، والنصيحة، والفرضية: «Si j'avais le temps, je lirais». وبعد quand للمستقبل نستعمل futur: «Quand tu auras ton bac…».",
      example: {
        problem: "أكمل: «Si j'étais ministre, je ___ des hôpitaux.» (construire)",
        steps: ["si + imparfait → conditionnel présent", "جذر المستقبل: construir-", "نهاية je: -ais → construirais"],
        answer: "Si j'étais ministre, je construirais des hôpitaux.",
      },
    },
  ],
  misconceptions: {
    wrong_auxiliary: "الخلط بين المساعدين avoir و être",
    agreement_error: "خطأ في اتفاق اسم المفعول مع الفاعل",
    participle_form: "صيغة خاطئة لاسم المفعول أو الخلط بينه وبين اسم الفاعل",
    irregular_as_regular: "تصريف فعل شاذ كأنه منتظم",
    tense_confusion: "الخلط بين الأزمنة",
    conjugation_error: "تصريف لا يوافق الفاعل",
  },
  remedies: {
    wrong_auxiliary: "أفعال الحركة والتغيّر (aller, venir, partir, arriver, naître, mourir, rester…) والأفعال الضميرية تأخذ être، وكل الأفعال الأخرى تأخذ avoir.",
    agreement_error: "مع être اسأل: من الفاعل؟ مؤنث → أضف e، جمع → أضف s: «Elles sont parties».",
    tense_confusion: "اسأل: وصف أو عادة في الماضي → imparfait؛ حدث محدد منتهٍ → passé composé؛ فرضية مع si + imparfait أو تأدب → conditionnel؛ حدث آتٍ → futur.",
  },
  bank: [
    mcq("fr-ten-1", "passe_compose", 1, "أكمل: «Hier, nous ___ un film au cinéma.» (voir)", "avons vu", [
      ["sommes vus", "wrong_auxiliary"],
      ["avons voyé", "irregular_as_regular"],
      ["avez vu", "conjugation_error"],
    ], "voir يأخذ avoir، ومع nous: avons، واسم مفعوله شاذ: vu."),
    mcq("fr-ten-2", "passe_compose", 2, "أكمل: «Ma sœur ___ à Alger la semaine dernière.» (aller)", "est allée", [
      ["a allé", "wrong_auxiliary"],
      ["est allé", "agreement_error"],
      ["est allées", "agreement_error"],
    ], "aller فعل حركة → être، واسم المفعول يتفق مع الفاعل المؤنث المفرد: allée."),
    mcq("fr-ten-3", "passe_compose", 2, "ما participe passé للفعل «prendre»؟", "pris", [
      ["prendu", "irregular_as_regular"],
      ["prenant", "participle_form"],
      ["prenait", "tense_confusion"],
    ], "prendre شاذ: pris؛ و prenant اسم الفاعل participe présent."),
    mcq("fr-ten-4", "passe_compose", 3, "أكمل: «Ce matin, les garçons ___ tôt.» (se lever)", "se sont levés", [
      ["se sont levé", "agreement_error"],
      ["s'ont levés", "wrong_auxiliary"],
      ["se sont levées", "agreement_error"],
    ], "الأفعال الضميرية تأخذ être، واسم المفعول يتفق مع الفاعل المذكر الجمع: levés."),
    mcq("fr-ten-5", "imparfait_pc", 1, "أكمل: «Quand j'étais petit, je ___ au football tous les jours.» (jouer)", "jouais", [
      ["ai joué", "tense_confusion"],
      ["jouait", "conjugation_error"],
      ["jouerai", "tense_confusion"],
    ], "tous les jours في الماضي = عادة → imparfait، ومع je: jouais."),
    mcq("fr-ten-6", "imparfait_pc", 2, "ما imparfait للفعل «finir» مع «nous»؟", "finissions", [
      ["finions", "irregular_as_regular"],
      ["finissons", "tense_confusion"],
      ["finirons", "tense_confusion"],
    ], "الجذر من nous finissons: finiss- + -ions؛ و finissons مضارع و finirons مستقبل."),
    mcq("fr-ten-7", "imparfait_pc", 2, "أكمل: «Il ___ quand je suis sorti de la maison.» (pleuvoir)", "pleuvait", [
      ["a plu", "tense_confusion"],
      ["pleuvra", "tense_confusion"],
      ["pleuvaient", "conjugation_error"],
    ], "المطر خلفية مستمرة لحدث «je suis sorti» → imparfait، والفعل لا يُصرَّف إلا مع il."),
    mcq("fr-ten-8", "imparfait_pc", 3, "أكمل: «Je lisais tranquillement quand le téléphone ___.» (sonner)", "a sonné", [
      ["sonnait", "tense_confusion"],
      ["est sonné", "wrong_auxiliary"],
      ["sonnera", "tense_confusion"],
    ], "الحدث المفاجئ الذي يقطع الخلفية (je lisais) → passé composé، و sonner يأخذ avoir."),
    mcq("fr-ten-9", "futur_conditionnel", 1, "أكمل: «Demain, nous ___ pour Oran.» (partir)", "partirons", [
      ["partirions", "tense_confusion"],
      ["partiront", "conjugation_error"],
      ["partions", "tense_confusion"],
    ], "demain → futur simple: المصدر partir + -ons."),
    mcq("fr-ten-10", "futur_conditionnel", 2, "ما futur simple للفعل «avoir» مع «je»؟", "j'aurai", [
      ["j'avoirai", "irregular_as_regular"],
      ["j'aurais", "tense_confusion"],
      ["j'aura", "conjugation_error"],
    ], "avoir جذره الشاذ في المستقبل aur- + -ai؛ و j'aurais شرطي."),
    mcq("fr-ten-11", "futur_conditionnel", 2, "أكمل: «Si j'avais le temps, je ___ le Sahara.» (visiter)", "visiterais", [
      ["visiterai", "tense_confusion"],
      ["visitais", "tense_confusion"],
      ["visiterait", "conjugation_error"],
    ], "si + imparfait → conditionnel présent: visiter + -ais."),
    mcq("fr-ten-12", "futur_conditionnel", 3, "طلب مهذب: «___-vous m'aider, s'il vous plaît ?» (pouvoir)", "Pourriez", [
      ["Pouvriez", "irregular_as_regular"],
      ["Pourrez", "tense_confusion"],
      ["Pourrions", "conjugation_error"],
    ], "التأدب → conditionnel، و pouvoir جذره pourr- + نهاية vous: -iez."),
    mcq("fr-ten-13", "futur_conditionnel", 3, "أكمل: «Quand tu ___ ton bac, tu iras à l'université.» (avoir)", "auras", [
      ["as", "tense_confusion"],
      ["aurais", "tense_confusion"],
      ["aura", "conjugation_error"],
    ], "بعد quand لحدث في المستقبل نستعمل futur في الفرنسية: tu auras."),
  ],
};
