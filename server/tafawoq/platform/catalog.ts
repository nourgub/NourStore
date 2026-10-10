// Tafawoq BAC platform — what each stream contains and who may open what.
//
// Pure functions over the curriculum (no database): the service layer
// (./service.ts) loads the student, their subscription and the admin's
// content switches, then asks these functions for a decision. Every
// procedure that serves lesson content goes through checkLessonAccess, so
// a lesson of another stream, a subject that isn't the student's, or an
// expired subscription is refused by the server — hiding a link in the
// interface is never the only protection.
import {
  ACCESS_ERRORS,
  CURRICULUM_SUBJECT_TO_BAC,
  SECOND_SUBJECT_OPTIONS,
  STREAM_CORE_SUBJECTS,
  coreSubjects,
  isPlatformStream,
  type BacSubject,
  type PlatformStream,
} from "@shared/bacPlatform";
import { LESSONS, lessonForStream, type Lesson } from "../curriculum";

/** Subjects and lessons an admin has hidden (tafawoqContentSettings). */
export type ContentSwitches = { disabledSubjects: Set<string>; disabledLessons: Set<string> };

export const NO_SWITCHES: ContentSwitches = { disabledSubjects: new Set(), disabledLessons: new Set() };

export function lessonSubject(lesson: Pick<Lesson, "subject">): BacSubject | null {
  return CURRICULUM_SUBJECT_TO_BAC[lesson.subject] ?? null;
}

/** BAC lessons of the stream's programme that really have content. */
export function streamLessons(stream: PlatformStream): Lesson[] {
  return LESSONS.filter(
    lesson => lesson.levels.includes("bac") && (!lesson.streams || lesson.streams.includes(stream))
  )
    .map(lesson => lessonForStream(lesson, stream))
    .filter(lesson => lesson.skills.length > 0);
}

/** Lessons of one subject a student of the stream can study right now. */
export function subjectLessons(stream: PlatformStream, subject: BacSubject, switches: ContentSwitches): Lesson[] {
  if (switches.disabledSubjects.has(subject)) return [];
  return streamLessons(stream).filter(
    lesson => lessonSubject(lesson) === subject && !switches.disabledLessons.has(lesson.key)
  );
}

export type SubjectOffer = { key: BacSubject; available: boolean; lessons: number };

function offer(stream: PlatformStream, subject: BacSubject, switches: ContentSwitches): SubjectOffer {
  const lessons = subjectLessons(stream, subject, switches).length;
  return { key: subject, available: lessons > 0, lessons };
}

/** The subscription's content: core subjects of the stream, then the second subject. */
export function subscriptionContent(
  stream: PlatformStream,
  secondSubject: BacSubject | null,
  switches: ContentSwitches,
  thirdLanguage: string | null = null
) {
  const core = coreSubjects(stream, thirdLanguage).map(subject => offer(stream, subject, switches));
  const second = secondSubject ? offer(stream, secondSubject, switches) : null;
  const all = second ? [...core, second] : core;
  return {
    core,
    second,
    /** True only when every subject of the subscription has content. */
    everythingAvailable: all.every(entry => entry.available),
    availableCount: all.filter(entry => entry.available).length,
  };
}

/** Subjects the student may pick as second subject, with what's ready. */
export function secondSubjectChoices(stream: PlatformStream, switches: ContentSwitches): SubjectOffer[] {
  return SECOND_SUBJECT_OPTIONS[stream].map(subject => offer(stream, subject, switches));
}

/** The student's subjects: their stream's core (with their own third language) and their second subject. */
export function allowedSubjects(stream: PlatformStream, secondSubject: string | null, thirdLanguage: string | null = null): Set<BacSubject> {
  const allowed = new Set<BacSubject>(coreSubjects(stream, thirdLanguage));
  if (secondSubject && (SECOND_SUBJECT_OPTIONS[stream] as string[]).includes(secondSubject)) {
    allowed.add(secondSubject as BacSubject);
  }
  return allowed;
}

/** Every lesson the student may open (their stream, their subjects, not hidden). */
export function accessibleLessons(
  stream: PlatformStream,
  secondSubject: string | null,
  switches: ContentSwitches,
  thirdLanguage: string | null = null
): Lesson[] {
  const allowed = allowedSubjects(stream, secondSubject, thirdLanguage);
  return Array.from(allowed).flatMap(subject => subjectLessons(stream, subject, switches));
}

export type AccessStudent = {
  stream: string | null;
  streamLockedAt: Date | null;
  secondSubject: string | null;
  /** Foreign-languages stream: german | spanish | italian. */
  thirdLanguage?: string | null;
};

export type AccessDecision =
  | { ok: true; stream: PlatformStream; subject: BacSubject }
  | { ok: false; reason: (typeof ACCESS_ERRORS)[keyof typeof ACCESS_ERRORS] };

/**
 * May this student open this lesson? Order matters: a lesson of another
 * stream is reported as such (STREAM_LOCKED) even when the subscription
 * has also expired, so the message names the real reason.
 */
export function checkLessonAccess(
  student: AccessStudent,
  lessonKey: string,
  switches: ContentSwitches,
  options: { subscriptionActive: boolean; requireSubscription: boolean }
): AccessDecision {
  if (!student.streamLockedAt || !isPlatformStream(student.stream)) {
    return { ok: false, reason: ACCESS_ERRORS.streamRequired };
  }
  const stream = student.stream;
  const lesson = LESSONS.find(entry => entry.key === lessonKey);
  const subject = lesson ? lessonSubject(lesson) : null;
  if (!lesson || !subject) return { ok: false, reason: ACCESS_ERRORS.subjectUnavailable };
  if (!lesson.levels.includes("bac") || (lesson.streams && !lesson.streams.includes(stream))) {
    return { ok: false, reason: ACCESS_ERRORS.streamLocked };
  }
  if (!allowedSubjects(stream, student.secondSubject, student.thirdLanguage).has(subject)) {
    return { ok: false, reason: ACCESS_ERRORS.subjectNotAllowed };
  }
  if (switches.disabledSubjects.has(subject) || switches.disabledLessons.has(lesson.key)) {
    return { ok: false, reason: ACCESS_ERRORS.subjectUnavailable };
  }
  if (lessonForStream(lesson, stream).skills.length === 0) {
    return { ok: false, reason: ACCESS_ERRORS.subjectUnavailable };
  }
  if (options.requireSubscription && !options.subscriptionActive) {
    return { ok: false, reason: ACCESS_ERRORS.subscriptionRequired };
  }
  return { ok: true, stream, subject };
}

/** May the student open a subject-level paper (mock BAC) in this subject? */
export function checkSubjectAccess(
  student: AccessStudent,
  subject: string,
  switches: ContentSwitches,
  options: { subscriptionActive: boolean; requireSubscription: boolean }
): AccessDecision {
  if (!student.streamLockedAt || !isPlatformStream(student.stream)) {
    return { ok: false, reason: ACCESS_ERRORS.streamRequired };
  }
  const stream = student.stream;
  if (!allowedSubjects(stream, student.secondSubject, student.thirdLanguage).has(subject as BacSubject)) {
    return { ok: false, reason: ACCESS_ERRORS.subjectNotAllowed };
  }
  if (!subjectLessons(stream, subject as BacSubject, switches).length) {
    return { ok: false, reason: ACCESS_ERRORS.subjectUnavailable };
  }
  if (options.requireSubscription && !options.subscriptionActive) {
    return { ok: false, reason: ACCESS_ERRORS.subscriptionRequired };
  }
  return { ok: true, stream, subject: subject as BacSubject };
}
