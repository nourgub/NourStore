import { describe, expect, it } from "vitest";
import { LESSONS, getLesson } from "./curriculum";
import { DIALOGUE_DONE, dialogueAnswerMatches, dialogueReply, dialogueState, startDialogue } from "./dialogue";
import { detectIntent } from "./templates";
import { foreignLanguageOfSubject } from "@shared/taughtLanguages";

/** Plays a whole dialogue, answering each step with `answer(step)`. */
function play(lessonKey: string, skillKey: string, answer: (index: number) => string[]) {
  const lesson = getLesson(lessonKey)!;
  const skill = lesson.skills.find(entry => entry.key === skillKey)!;
  let last = startDialogue(skill);
  const transcript = [last];
  for (let turn = 0; turn < 40 && !last.includes(DIALOGUE_DONE); turn += 1) {
    const state = dialogueState(lesson, last);
    expect(state, `lost the dialogue after: ${last}`).not.toBeNull();
    expect(state!.skill.key).toBe(skillKey);
    const replies = answer(state!.index);
    const message = replies[Math.min(replies.length - 1, transcript.filter(line => line.includes(`(${state!.index + 1}/`)).length - 1)];
    const reply = dialogueReply(state!, message, detectIntent(message), "Amine", turn);
    expect(reply, `no reply to "${message}"`).not.toBeNull();
    last = reply!;
    transcript.push(last);
  }
  return transcript;
}

describe("teaching by dialogue", () => {
  it("detects the request in Arabic, Darja, French and English", () => {
    for (const message of ["علمني بالحوار", "فهمني خطوة خطوة", "explique-moi par le dialogue", "teach me step by step"]) {
      expect(detectIntent(message), message).toBe("dialogue");
    }
  });

  it("accepts spoken and typed forms of an answer", () => {
    const step = { ask: "?", answer: "5x⁴", hint: "…" };
    expect(dialogueAnswerMatches(step, "5x^4")).toBe(true);
    expect(dialogueAnswerMatches(step, "خمسة إكس أس أربعة")).toBe(true);
    expect(dialogueAnswerMatches(step, "أظن 5x^4")).toBe(true);
    expect(dialogueAnswerMatches(step, "4x^5")).toBe(false);
    const plusInfinity = { ask: "?", answer: "+∞", hint: "…" };
    expect(dialogueAnswerMatches(plusInfinity, "+∞")).toBe(true);
    expect(dialogueAnswerMatches(plusInfinity, "زائد ما لا نهاية")).toBe(true);
    expect(dialogueAnswerMatches(plusInfinity, "−∞")).toBe(false);
    expect(dialogueAnswerMatches(plusInfinity, "ناقص ما لا نهاية")).toBe(false);
    expect(dialogueAnswerMatches(plusInfinity, "5")).toBe(false);
    const minusInfinity = { ask: "?", answer: "−∞", hint: "…" };
    expect(dialogueAnswerMatches(minusInfinity, "-inf")).toBe(true);
    expect(dialogueAnswerMatches(minusInfinity, "ناقص ما لا نهاية")).toBe(true);
    const word = { ask: "?", answer: "متزايدة", accept: ["تتزايد", "تزداد"], hint: "…" };
    expect(dialogueAnswerMatches(word, "الدالة متزايدة")).toBe(true);
    expect(dialogueAnswerMatches(word, "تزداد")).toBe(true);
    expect(dialogueAnswerMatches(word, "متناقصة")).toBe(false);
  });

  it("leads to the rule with correct answers", () => {
    const transcript = play("math-derivatives", "power_rule", index => [
      getLesson("math-derivatives")!.skills.find(skill => skill.key === "power_rule")!.dialogue!.steps[index].answer,
    ]);
    expect(transcript).toHaveLength(5);
    expect(transcript.at(-1)).toContain("(xⁿ)′ = n·xⁿ⁻¹");
  });

  it("hints after a first miss, reveals after a second, never stalls", () => {
    const transcript = play("math-derivatives", "power_rule", () => ["7", "9"]);
    expect(transcript[1]).toContain("💡");
    expect(transcript[2]).toContain("الجواب: 5");
    expect(transcript.at(-1)).toContain(DIALOGUE_DONE);
  });

  it("lets a question interrupt without counting it as an answer", () => {
    const lesson = getLesson("math-derivatives")!;
    const state = dialogueState(lesson, startDialogue(lesson.skills.find(skill => skill.key === "power_rule")!))!;
    expect(dialogueReply(state, "أعطني مثالاً", detectIntent("أعطني مثالاً"), "Amine", 0)).toBeNull();
    expect(dialogueReply(state, "لماذا ينزل الأس؟", detectIntent("لماذا ينزل الأس؟"), "Amine", 0)).toBeNull();
  });
});

describe("dialogue content", () => {
  for (const lesson of LESSONS) {
    for (const skill of lesson.skills) {
      it(`${lesson.key} / ${skill.key} has a sound dialogue`, () => {
        const dialogue = skill.dialogue;
        expect(dialogue, "missing dialogue").toBeDefined();
        expect(dialogue!.opening.trim()).not.toBe("");
        expect(dialogue!.rule.trim()).not.toBe("");
        expect(dialogue!.steps.length).toBeGreaterThanOrEqual(3);
        expect(dialogue!.steps.length).toBeLessThanOrEqual(5);
        dialogue!.steps.forEach((step, index) => {
          const where = `step ${index + 1}: ${step.ask}`;
          expect(step.ask.trim(), where).not.toBe("");
          expect(step.hint.trim(), where).not.toBe("");
          for (const form of [step.answer, ...(step.accept ?? [])]) {
            expect(dialogueAnswerMatches(step, form), `${where} — "${form}" is not accepted`).toBe(true);
          }
          // The hint nudges; it must not give the answer away.
          expect(dialogueAnswerMatches(step, step.hint), `${where} — the hint contains the answer`).toBe(false);
          // "I don't know" must never count as an answer.
          expect(dialogueAnswerMatches(step, "لا أعرف"), where).toBe(false);
        });
        const transcript = play(lesson.key, skill.key, index => [dialogue!.steps[index].answer]);
        expect(transcript).toHaveLength(dialogue!.steps.length + 1);
      });
    }
  }
});

describe("taught-language editions (the teacher speaking the language)", () => {
  for (const lesson of LESSONS.filter(entry => foreignLanguageOfSubject(entry.subject))) {
    it(`${lesson.key}: every skill, item and misconception has its edition`, () => {
      expect(lesson.titleTaught).toBeTruthy();
      for (const question of lesson.bank) expect(question.promptTaught, question.id).toBeTruthy();
      for (const skill of lesson.skills) expect(skill.taught, skill.key).toBeDefined();
      for (const key of Object.keys(lesson.misconceptions)) expect(lesson.misconceptionsTaught?.[key], key).toBeTruthy();
    });
    for (const skill of lesson.skills) {
      it(`${lesson.key} / ${skill.key} has a sound dialogue in the taught language`, () => {
        const dialogue = skill.taught!.dialogue;
        expect(dialogue.opening.trim()).not.toBe("");
        expect(dialogue.rule.trim()).not.toBe("");
        expect(dialogue.steps.length).toBeGreaterThanOrEqual(3);
        expect(dialogue.steps.length).toBeLessThanOrEqual(5);
        dialogue.steps.forEach((step, index) => {
          const where = `step ${index + 1}: ${step.ask}`;
          for (const form of [step.answer, ...(step.accept ?? [])]) {
            expect(dialogueAnswerMatches(step, form), `${where} — "${form}" is not accepted`).toBe(true);
          }
          expect(dialogueAnswerMatches(step, step.hint), `${where} — the hint contains the answer`).toBe(false);
          for (const unsure of ["Ich weiß es nicht", "keine Ahnung", "No lo sé", "Non lo so", "لا أعرف"]) {
            expect(dialogueAnswerMatches(step, unsure), `${where} — "${unsure}"`).toBe(false);
          }
        });
      });
    }
  }
});

describe("the teacher speaking German", () => {
  it("holds a whole dialogue in German, hint then answer", () => {
    const lesson = getLesson("de-tenses")!;
    const skill = lesson.skills.find(entry => entry.key === "partizip")!;
    let last = startDialogue(skill, "de");
    expect(last).toContain("Wir entdecken «Das Partizip II bilden»");
    let state = dialogueState(lesson, last)!;
    expect(state.lang).toBe("de");
    // A wrong answer gets a German hint, "ich weiß es nicht" the answer.
    last = dialogueReply(state, "kaufte", detectIntent("kaufte"), "Amel", 0)!;
    expect(last).toContain("Noch nicht, aber du bist nah dran.");
    state = dialogueState(lesson, last)!;
    expect(state.hinted).toBe(true);
    last = dialogueReply(state, "Ich weiß es nicht", detectIntent("Ich weiß es nicht"), "Amel", 0)!;
    expect(last).toContain("Die Antwort: gekauft.");
    for (const answer of ["gesehen", "telefoniert", "aufgemacht"]) {
      state = dialogueState(lesson, last)!;
      last = dialogueReply(state, answer, detectIntent(answer), "Amel", 2)!;
    }
    expect(last).toContain("Super, Amel! Du hast die Regel selbst gefunden:");
    expect(last).toContain(skill.taught!.dialogue.rule);
  });

  it("understands requests in German", () => {
    expect(detectIntent("Frag mich")).toBe("quiz");
    expect(detectIntent("Ich weiß es nicht")).toBe("giveUp");
    expect(detectIntent("Bring mir das Passiv bei")).toBe("dialogue");
    expect(detectIntent("Im Dialog bitte")).toBe("dialogue");
    expect(detectIntent("Ein Beispiel bitte")).toBe("example");
    expect(detectIntent("Ich habe das nicht verstanden")).toBe("simpler");
    expect(detectIntent("Etwas Schwereres? Eine Herausforderung")).toBe("challenge");
    expect(detectIntent("Danke!")).toBe("thanks");
  });

  it("understands requests in Spanish, Italian, French and English", () => {
    for (const [message, intent] of [
      ["Pregúntame", "quiz"],
      ["No lo sé", "giveUp"],
      ["Enséñame paso a paso", "dialogue"],
      ["Un ejemplo, por favor", "example"],
      ["No lo he entendido", "simpler"],
      ["¿Por qué me equivoco?", "mistake"],
      ["Fammi una domanda", "quiz"],
      ["Non lo so", "giveUp"],
      ["In dialogo", "dialogue"],
      ["Un esempio, per favore", "example"],
      ["Non ho capito", "simpler"],
      ["Grazie!", "thanks"],
      ["Interroge-moi", "quiz"],
      ["Je ne sais pas", "giveUp"],
      ["En dialogue", "dialogue"],
      ["Je n'ai pas compris", "simpler"],
      ["Ask me", "quiz"],
      ["I don't know", "giveUp"],
      ["I didn't understand", "simpler"],
      ["An example, please", "example"],
    ] as const) {
      expect(detectIntent(message), message).toBe(intent);
    }
  });
});
