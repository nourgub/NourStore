// What content really exists, per stream and subject — counted from the
// lesson catalogue (./curriculum.ts), never estimated. "Has lessons" is not
// "covers the official programme": coverage needs a teacher to map these
// lessons against the ministry's programme, recorded here as a human review
// per lesson (tafawoqContentReviews). Nothing is ever marked approved
// automatically; tests and type checks are not a pedagogical review.
import {
  BAC_SUBJECTS,
  CURRICULUM_SUBJECT_TO_BAC,
  PLATFORM_STREAMS,
  SECOND_SUBJECT_OPTIONS,
  STREAM_CORE_SUBJECTS,
  THIRD_LANGUAGES,
  type BacSubject,
  type PlatformStream,
} from "@shared/bacPlatform";
import { LESSONS, lessonForStream, lessonsFor } from "./curriculum";

export type LessonInventory = {
  key: string;
  title: string;
  subject: BacSubject;
  skills: number;
  mcq: number;
  short: number;
  generators: number;
  problems: number;
};

export type SubjectInventory = {
  stream: PlatformStream;
  subject: BacSubject;
  role: "core" | "second";
  lessons: LessonInventory[];
};

function describe(lessonKey: string, stream: PlatformStream): LessonInventory | null {
  const base = LESSONS.find(lesson => lesson.key === lessonKey);
  if (!base) return null;
  const lesson = lessonForStream(base, stream);
  return {
    key: lesson.key,
    title: lesson.title,
    subject: CURRICULUM_SUBJECT_TO_BAC[lesson.subject] ?? (lesson.subject as BacSubject),
    skills: lesson.skills.length,
    mcq: lesson.bank.filter(question => question.type === "mcq").length,
    short: lesson.bank.filter(question => question.type === "short").length,
    generators: lesson.generators?.length ?? 0,
    problems: lesson.problems?.length ?? 0,
  };
}

/** Every stream × subject a student can study, with the lessons available to them. */
export function contentInventory(): SubjectInventory[] {
  const rows: SubjectInventory[] = [];
  for (const stream of PLATFORM_STREAMS) {
    const available = lessonsFor({ schoolLevel: "bac", stream });
    const core: BacSubject[] = STREAM_CORE_SUBJECTS[stream].flatMap(subject =>
      subject === "third_language" ? [...THIRD_LANGUAGES] : [subject]
    );
    const subjects: Array<[BacSubject, "core" | "second"]> = [
      ...core.map(subject => [subject, "core"] as [BacSubject, "core"]),
      ...SECOND_SUBJECT_OPTIONS[stream].filter(subject => !core.includes(subject)).map(subject => [subject, "second"] as [BacSubject, "second"]),
    ];
    for (const [subject, role] of subjects) {
      const lessons = available
        .filter(lesson => (CURRICULUM_SUBJECT_TO_BAC[lesson.subject] ?? lesson.subject) === subject)
        .map(lesson => describe(lesson.key, stream))
        .filter((entry): entry is LessonInventory => !!entry);
      rows.push({ stream, subject, role, lessons });
    }
  }
  return rows;
}

/** All BAC lessons once (for the review list), whatever the stream. */
export function allBacLessons(): Array<{ key: string; title: string; subject: BacSubject }> {
  return LESSONS.filter(lesson => lesson.levels.includes("bac")).map(lesson => ({
    key: lesson.key,
    title: lesson.title,
    subject: CURRICULUM_SUBJECT_TO_BAC[lesson.subject] ?? (lesson.subject as BacSubject),
  }));
}

export const KNOWN_SUBJECTS = BAC_SUBJECTS;
