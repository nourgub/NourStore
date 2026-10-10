// Tafawoq BAC platform — the papers: placement test across the student's
// subjects, weekly tests, targeted (remedial) exercises and the BAC topic
// bank built from the curriculum's problem generators. Pure functions:
// numbers are drawn from a seeded RNG and every answer is computed, so the
// supply is unlimited and never has a wrong key.
import type { BankQuestion, Lesson } from "../curriculum";
import { itemPool } from "../curriculum";
import { createRng } from "../generators/core";
import { instantiate } from "../generators/instantiate";
import { instantiateProblem } from "../problems";
import { targetDifficulty, type SkillState } from "../studentModel";

/** One easy item, then medium/hard items on other skills — covers the lesson's basics first. */
export function placementItemsForLesson(lesson: Lesson, seed: number, count: number): BankQuestion[] {
  const rng = createRng(seed);
  const pool = itemPool(lesson, seed);
  const easy = rng.shuffle(pool.filter(item => item.difficulty === 1));
  const medium = rng.shuffle(pool.filter(item => item.difficulty === 2));
  const hard = rng.shuffle(pool.filter(item => item.difficulty === 3));
  const picked: BankQuestion[] = [];
  const usedSkills = new Set<string>();
  const take = (candidates: BankQuestion[]) => {
    const item = candidates.find(entry => !usedSkills.has(entry.skill) && !picked.includes(entry)) ??
      candidates.find(entry => !picked.includes(entry));
    if (item) {
      picked.push(item);
      usedSkills.add(item.skill);
    }
  };
  const order = [easy, medium, hard];
  for (let index = 0; picked.length < count && index < count * 3; index += 1) {
    take(order[Math.min(index, order.length - 1)].length ? order[Math.min(index, order.length - 1)] : pool);
  }
  return picked.slice(0, count);
}

/**
 * Lessons of several subjects spread evenly along the paper: each subject's
 * lessons take positions in proportion to their count, so every subject
 * reaches the easy, the medium and the hard part of the paper.
 */
function interleaveBySubject(lessons: Lesson[]): Lesson[] {
  const groups = new Map<string, Lesson[]>();
  for (const lesson of lessons) groups.set(lesson.subject, [...(groups.get(lesson.subject) ?? []), lesson]);
  return Array.from(groups.values())
    .flatMap(group => group.map((lesson, index) => ({ lesson, at: (index + 0.5) / group.length })))
    .sort((a, b) => a.at - b.at)
    .map(entry => entry.lesson);
}

/**
 * Placement paper over several lessons (one subject or more): a few items
 * per lesson, ordered easy → medium → hard across the whole paper.
 */
export function placementPaper(lessons: Lesson[], seed: number, maxQuestions = 20) {
  if (!lessons.length) return [];
  const rng = createRng(seed);
  // More lessons than questions: an even spread of them.
  const chosen =
    lessons.length > maxQuestions
      ? Array.from({ length: maxQuestions }, (_, index) => lessons[Math.floor((index * lessons.length) / maxQuestions)])
      : lessons;
  const perLesson = Math.max(1, Math.min(3, Math.floor(maxQuestions / chosen.length)));
  if (perLesson === 1) {
    // One item per lesson: the difficulty rises along the paper (easy, then
    // medium, then hard), so the test still separates the levels; subjects
    // take turns, so each one is measured at every difficulty.
    return interleaveBySubject(chosen).map((lesson, index, ordered) => {
      const target = (1 + Math.floor((3 * index) / ordered.length)) as 1 | 2 | 3;
      const pool = itemPool(lesson, rng.int(1, 2 ** 30));
      const closest = Math.min(...pool.map(item => Math.abs(item.difficulty - target)));
      const candidates = pool.filter(item => Math.abs(item.difficulty - target) === closest);
      return { lesson, items: candidates.length ? [rng.pick(candidates)] : [] };
    });
  }
  return chosen.map(lesson => ({
    lesson,
    items: placementItemsForLesson(lesson, rng.int(1, 2 ** 30), perLesson),
  }));
}

/** Fresh items on one skill, as close as possible to the target difficulty. */
export function skillItems(lesson: Lesson, skillKey: string, difficulty: 1 | 2 | 3, count: number, seed: number) {
  const rng = createRng(seed);
  const generators = (lesson.generators ?? [])
    .filter(generator => generator.skill === skillKey)
    .sort((a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty));
  const items: BankQuestion[] = [];
  for (let index = 0; index < count && generators.length; index += 1) {
    items.push(instantiate(generators[index % generators.length], rng.int(1, 2 ** 30)));
  }
  if (items.length < count) {
    const bank = rng
      .shuffle(lesson.bank.filter(question => question.skill === skillKey))
      .sort((a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty));
    items.push(...bank.slice(0, count - items.length));
  }
  return items;
}

/** Weekly test items for one lesson: its weakest skills, each at the student's level. */
export function weeklyItemsForLesson(lesson: Lesson, states: SkillState[], count: number, seed: number) {
  const rng = createRng(seed);
  const mastery = new Map(states.map(state => [state.skill, state.pKnown]));
  const skills = [...lesson.skills].sort((a, b) => (mastery.get(a.key) ?? 0.3) - (mastery.get(b.key) ?? 0.3));
  const items: BankQuestion[] = [];
  for (let index = 0; items.length < count && index < skills.length * 2; index += 1) {
    const skill = skills[index % skills.length];
    const [item] = skillItems(lesson, skill.key, targetDifficulty(mastery.get(skill.key) ?? 0.3), 1, rng.int(1, 2 ** 30));
    if (item && !items.some(entry => entry.id === item.id)) items.push(item);
  }
  return items;
}

/** Points of each question out of `total`, by difficulty, to the quarter point. */
export function pointsByDifficulty(difficulties: number[], total = 20): number[] {
  const sum = difficulties.reduce((acc, value) => acc + value, 0) || 1;
  const shares = difficulties.map(value => Math.round(((total * value) / sum) * 4) / 4);
  if (shares.length) shares[shares.length - 1] += total - shares.reduce((acc, value) => acc + value, 0);
  return shares.map(value => Math.round(value * 100) / 100);
}

// ---------------------------------------------------------------------------
// BAC topic bank: generated topics (a full multi-part problem, or a single
// question) — always labelled as "BAC-style", never given a fake year.
// ---------------------------------------------------------------------------

export type GeneratedTopic = {
  id: string;
  source: "generated";
  lessonKey: string;
  unit: string;
  kind: "full" | "single";
  title: string;
  difficulty: 1 | 2 | 3;
  questionType: "mcq" | "short" | "mixed";
  parts: number;
  points: number;
  year: null;
};

function typeOf(types: Array<"mcq" | "short">): GeneratedTopic["questionType"] {
  const unique = Array.from(new Set(types));
  return unique.length === 1 ? unique[0] : "mixed";
}

export function generatedTopics(lessons: Lesson[], stream: string): GeneratedTopic[] {
  const topics: GeneratedTopic[] = [];
  for (const lesson of lessons) {
    for (const problem of lesson.problems ?? []) {
      if (problem.streams && !problem.streams.includes(stream as never)) continue;
      const sample = problem.generate(createRng(1));
      const average = sample.parts.reduce((sum, part) => sum + part.difficulty, 0) / (sample.parts.length || 1);
      topics.push({
        id: `gen:${lesson.key}:${problem.id}`,
        source: "generated",
        lessonKey: lesson.key,
        unit: lesson.title,
        kind: "full",
        title: problem.title,
        difficulty: (average < 1.6 ? 1 : average < 2.4 ? 2 : 3) as 1 | 2 | 3,
        questionType: typeOf(sample.parts.map(part => part.type)),
        parts: sample.parts.length,
        points: Math.min(7, Math.max(3, sample.parts.length + 1)),
        year: null,
      });
    }
    for (const generator of lesson.generators ?? []) {
      const sample = generator.generate(createRng(1));
      topics.push({
        id: `q:${lesson.key}:${generator.id}`,
        source: "generated",
        lessonKey: lesson.key,
        unit: lesson.title,
        kind: "single",
        title: lesson.skills.find(skill => skill.key === generator.skill)?.name ?? lesson.title,
        difficulty: generator.difficulty,
        questionType: sample.type,
        parts: 1,
        points: generator.difficulty,
        year: null,
      });
    }
  }
  return topics;
}

/** One draw of a generated topic (same seed → same statement: "retry"). */
export function drawGeneratedTopic(lesson: Lesson, topicId: string, seed: number): BankQuestion[] | null {
  const [, , itemId] = topicId.split(":");
  if (topicId.startsWith("gen:")) {
    const problem = lesson.problems?.find(entry => entry.id === itemId);
    return problem ? instantiateProblem(problem, seed) : null;
  }
  const generator = lesson.generators?.find(entry => entry.id === itemId);
  return generator ? [instantiate(generator, seed)] : null;
}
