// Reference weekly hour loads (الحجم الساعي الأسبوعي) per secondary stream,
// used as the starting template for the timetable builder — rule 10 of the
// brief: "التقيد بالحجم الساعي المقرر وزاريا لكل مادة و لكل مستوى".
//
// IMPORTANT — these numbers are an EDITABLE TEMPLATE, not an authoritative
// copy of the official ministerial decree. Loads are revised from one
// school year to the next, and a school's own arrêté may differ, so every
// value below is overridable per timetable (a saved timetable stores its
// own requirement rows, never a reference to this file) and the builder
// surfaces CURRICULUM_TEMPLATE_NOTICE_AR next to the numbers so whoever
// builds the timetable confirms them against the official document for
// their year. The engine's job (secondaryTimetable.ts) is to respect
// EXACTLY the hours it is given and to flag any drift from them — it never
// silently substitutes its own figures.
//
// `core: true` marks a stream's defining subjects (المواد الأساسية للشعبة),
// which rule 6 pins to the morning. `practicalHours` is the share of the
// weekly load run as lab/practical work (أعمال تطبيقية), which rule 5
// prefers in the morning. `pe: true` marks التربية البدنية, which rule 7
// pins to the end of a half-day.

export type SecondaryLevel = "1AS" | "2AS" | "3AS";

export type CurriculumSubject = {
  /** Stable key used to match teachers to subjects. */
  subjectId: string;
  nameAr: string;
  /** Total ministerial weekly hours, practicalHours included. */
  weeklyHours: number;
  /** Share of weeklyHours run as أعمال تطبيقية (rule 5). */
  practicalHours?: number;
  /** A defining subject of the stream — morning only (rule 6). */
  core?: boolean;
  /** التربية البدنية — always last in its half-day (rule 7). */
  pe?: boolean;
};

export type StreamTemplate = {
  /** Stable key, e.g. "3AS-experimental-sciences". */
  id: string;
  level: SecondaryLevel;
  nameAr: string;
  subjects: CurriculumSubject[];
};

export const CURRICULUM_TEMPLATE_NOTICE_AR =
  "الأحجام الساعية المعروضة هنا قيم إرشادية قابلة للتعديل. يجب مطابقتها مع " +
  "المنشور/القرار الوزاري الساري للسنة الدراسية قبل اعتماد الجدول.";

export const SECONDARY_LEVEL_LABELS_AR: Record<SecondaryLevel, string> = {
  "1AS": "السنة الأولى ثانوي",
  "2AS": "السنة الثانية ثانوي",
  "3AS": "السنة الثالثة ثانوي",
};

/** Subjects shared by every stream, with the hours they carry there. */
const commonSubjects = (hours: {
  arabic: number;
  history: number;
  french: number;
  english: number;
  islamic: number;
  civics?: number;
  pe?: number;
}): CurriculumSubject[] => [
  { subjectId: "arabic", nameAr: "اللغة العربية", weeklyHours: hours.arabic },
  {
    subjectId: "history-geography",
    nameAr: "التاريخ والجغرافيا",
    weeklyHours: hours.history,
  },
  { subjectId: "french", nameAr: "اللغة الفرنسية", weeklyHours: hours.french },
  {
    subjectId: "english",
    nameAr: "اللغة الإنجليزية",
    weeklyHours: hours.english,
  },
  {
    subjectId: "islamic-sciences",
    nameAr: "العلوم الإسلامية",
    weeklyHours: hours.islamic,
  },
  ...(hours.civics
    ? [
        {
          subjectId: "civics",
          nameAr: "التربية المدنية",
          weeklyHours: hours.civics,
        },
      ]
    : []),
  {
    subjectId: "physical-education",
    nameAr: "التربية البدنية والرياضية",
    weeklyHours: hours.pe ?? 2,
    pe: true,
  },
];

export const SECONDARY_STREAM_TEMPLATES: StreamTemplate[] = [
  {
    id: "1AS-science-technology",
    level: "1AS",
    nameAr: "جذع مشترك علوم وتكنولوجيا",
    subjects: [
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 4,
        practicalHours: 1,
        core: true,
      },
      {
        subjectId: "natural-sciences",
        nameAr: "علوم الطبيعة والحياة",
        weeklyHours: 4,
        practicalHours: 1,
        core: true,
      },
      {
        subjectId: "computer-science",
        nameAr: "الإعلام الآلي",
        weeklyHours: 2,
        practicalHours: 2,
      },
      { subjectId: "technology", nameAr: "التكنولوجيا", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 4,
        history: 3,
        french: 4,
        english: 3,
        islamic: 2,
        civics: 1,
      }),
    ],
  },
  {
    id: "1AS-letters",
    level: "1AS",
    nameAr: "جذع مشترك آداب",
    subjects: [
      {
        subjectId: "arabic",
        nameAr: "اللغة العربية",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "history-geography",
        nameAr: "التاريخ والجغرافيا",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "french", nameAr: "اللغة الفرنسية", weeklyHours: 4 },
      { subjectId: "english", nameAr: "اللغة الإنجليزية", weeklyHours: 3 },
      { subjectId: "mathematics", nameAr: "الرياضيات", weeklyHours: 4 },
      {
        subjectId: "natural-sciences",
        nameAr: "علوم الطبيعة والحياة",
        weeklyHours: 2,
      },
      {
        subjectId: "islamic-sciences",
        nameAr: "العلوم الإسلامية",
        weeklyHours: 2,
      },
      { subjectId: "civics", nameAr: "التربية المدنية", weeklyHours: 1 },
      {
        subjectId: "computer-science",
        nameAr: "الإعلام الآلي",
        weeklyHours: 2,
        practicalHours: 2,
      },
      {
        subjectId: "physical-education",
        nameAr: "التربية البدنية والرياضية",
        weeklyHours: 2,
        pe: true,
      },
    ],
  },
  // --- 2AS: the same six streams as 3AS, one year earlier. Philosophy
  // starts here, the loads of the defining subjects are a little lighter
  // than in the exam year, and — like every figure in this file — they are
  // a template the school confirms against the decree in force.
  {
    id: "2AS-experimental-sciences",
    level: "2AS",
    nameAr: "شعبة علوم تجريبية",
    subjects: [
      {
        subjectId: "natural-sciences",
        nameAr: "علوم الطبيعة والحياة",
        weeklyHours: 4,
        practicalHours: 1,
        core: true,
      },
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 4,
        practicalHours: 1,
        core: true,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 3,
        history: 3,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "2AS-mathematics",
    level: "2AS",
    nameAr: "شعبة رياضيات",
    subjects: [
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 5,
        practicalHours: 1,
        core: true,
      },
      {
        subjectId: "natural-sciences",
        nameAr: "علوم الطبيعة والحياة",
        weeklyHours: 2,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 2,
        history: 3,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "2AS-technical-mathematics",
    level: "2AS",
    nameAr: "شعبة تقني رياضي",
    subjects: [
      {
        subjectId: "technology",
        nameAr: "هندسة (المادة التقنية)",
        weeklyHours: 6,
        practicalHours: 2,
        core: true,
      },
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 4,
        practicalHours: 1,
        core: true,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 2,
        history: 2,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "2AS-management-economics",
    level: "2AS",
    nameAr: "شعبة تسيير واقتصاد",
    subjects: [
      {
        subjectId: "accounting-management",
        nameAr: "التسيير المحاسبي والمالي",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "economics",
        nameAr: "الاقتصاد والمناجمنت",
        weeklyHours: 4,
        core: true,
      },
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "law", nameAr: "القانون", weeklyHours: 2 },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 2,
        history: 3,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "2AS-letters-philosophy",
    level: "2AS",
    nameAr: "شعبة آداب وفلسفة",
    subjects: [
      {
        subjectId: "arabic",
        nameAr: "اللغة العربية",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "philosophy",
        nameAr: "الفلسفة",
        weeklyHours: 4,
        core: true,
      },
      {
        subjectId: "history-geography",
        nameAr: "التاريخ والجغرافيا",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "french", nameAr: "اللغة الفرنسية", weeklyHours: 3 },
      { subjectId: "english", nameAr: "اللغة الإنجليزية", weeklyHours: 3 },
      { subjectId: "mathematics", nameAr: "الرياضيات", weeklyHours: 2 },
      {
        subjectId: "islamic-sciences",
        nameAr: "العلوم الإسلامية",
        weeklyHours: 2,
      },
      {
        subjectId: "physical-education",
        nameAr: "التربية البدنية والرياضية",
        weeklyHours: 2,
        pe: true,
      },
    ],
  },
  {
    id: "2AS-foreign-languages",
    level: "2AS",
    nameAr: "شعبة لغات أجنبية",
    subjects: [
      {
        subjectId: "english",
        nameAr: "اللغة الإنجليزية",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "french",
        nameAr: "اللغة الفرنسية",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "third-language",
        nameAr: "اللغة الأجنبية الثالثة",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "arabic", nameAr: "اللغة العربية", weeklyHours: 3 },
      {
        subjectId: "history-geography",
        nameAr: "التاريخ والجغرافيا",
        weeklyHours: 3,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      { subjectId: "mathematics", nameAr: "الرياضيات", weeklyHours: 2 },
      {
        subjectId: "islamic-sciences",
        nameAr: "العلوم الإسلامية",
        weeklyHours: 2,
      },
      {
        subjectId: "physical-education",
        nameAr: "التربية البدنية والرياضية",
        weeklyHours: 2,
        pe: true,
      },
    ],
  },
  {
    id: "3AS-experimental-sciences",
    level: "3AS",
    nameAr: "شعبة علوم تجريبية",
    subjects: [
      {
        subjectId: "natural-sciences",
        nameAr: "علوم الطبيعة والحياة",
        weeklyHours: 5,
        practicalHours: 1,
        core: true,
      },
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 5,
        practicalHours: 1,
        core: true,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 3,
        history: 3,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "3AS-mathematics",
    level: "3AS",
    nameAr: "شعبة رياضيات",
    subjects: [
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 5,
        practicalHours: 1,
        core: true,
      },
      {
        subjectId: "natural-sciences",
        nameAr: "علوم الطبيعة والحياة",
        weeklyHours: 2,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 2,
        history: 3,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "3AS-technical-mathematics",
    level: "3AS",
    nameAr: "شعبة تقني رياضي",
    subjects: [
      {
        subjectId: "technology",
        nameAr: "هندسة (المادة التقنية)",
        weeklyHours: 6,
        practicalHours: 2,
        core: true,
      },
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "physics",
        nameAr: "العلوم الفيزيائية",
        weeklyHours: 4,
        practicalHours: 1,
        core: true,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 2,
        history: 2,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "3AS-management-economics",
    level: "3AS",
    nameAr: "شعبة تسيير واقتصاد",
    subjects: [
      {
        subjectId: "accounting-management",
        nameAr: "التسيير المحاسبي والمالي",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "economics",
        nameAr: "الاقتصاد والمناجمنت",
        weeklyHours: 4,
        core: true,
      },
      {
        subjectId: "mathematics",
        nameAr: "الرياضيات",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "law", nameAr: "القانون", weeklyHours: 2 },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      ...commonSubjects({
        arabic: 2,
        history: 3,
        french: 3,
        english: 3,
        islamic: 2,
      }),
    ],
  },
  {
    id: "3AS-letters-philosophy",
    level: "3AS",
    nameAr: "شعبة آداب وفلسفة",
    subjects: [
      {
        subjectId: "philosophy",
        nameAr: "الفلسفة",
        weeklyHours: 6,
        core: true,
      },
      {
        subjectId: "arabic",
        nameAr: "اللغة العربية",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "history-geography",
        nameAr: "التاريخ والجغرافيا",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "french", nameAr: "اللغة الفرنسية", weeklyHours: 3 },
      { subjectId: "english", nameAr: "اللغة الإنجليزية", weeklyHours: 3 },
      { subjectId: "mathematics", nameAr: "الرياضيات", weeklyHours: 2 },
      {
        subjectId: "islamic-sciences",
        nameAr: "العلوم الإسلامية",
        weeklyHours: 2,
      },
      {
        subjectId: "physical-education",
        nameAr: "التربية البدنية والرياضية",
        weeklyHours: 2,
        pe: true,
      },
    ],
  },
  {
    id: "3AS-foreign-languages",
    level: "3AS",
    nameAr: "شعبة لغات أجنبية",
    subjects: [
      {
        subjectId: "english",
        nameAr: "اللغة الإنجليزية",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "french",
        nameAr: "اللغة الفرنسية",
        weeklyHours: 5,
        core: true,
      },
      {
        subjectId: "third-language",
        nameAr: "اللغة الأجنبية الثالثة",
        weeklyHours: 4,
        core: true,
      },
      { subjectId: "arabic", nameAr: "اللغة العربية", weeklyHours: 3 },
      {
        subjectId: "history-geography",
        nameAr: "التاريخ والجغرافيا",
        weeklyHours: 3,
      },
      { subjectId: "philosophy", nameAr: "الفلسفة", weeklyHours: 2 },
      { subjectId: "mathematics", nameAr: "الرياضيات", weeklyHours: 2 },
      {
        subjectId: "islamic-sciences",
        nameAr: "العلوم الإسلامية",
        weeklyHours: 2,
      },
      {
        subjectId: "physical-education",
        nameAr: "التربية البدنية والرياضية",
        weeklyHours: 2,
        pe: true,
      },
    ],
  },
];

export function findStreamTemplate(id: string): StreamTemplate | undefined {
  return SECONDARY_STREAM_TEMPLATES.find(stream => stream.id === id);
}

/** Total weekly hours a stream template asks of a section. */
export function templateWeeklyTotal(stream: StreamTemplate): number {
  return stream.subjects.reduce((sum, s) => sum + s.weeklyHours, 0);
}
