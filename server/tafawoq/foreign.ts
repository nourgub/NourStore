// Tafawoq AI Teacher — the language teacher speaking the taught language.
//
// In a German, Spanish or Italian lesson the student can choose to be
// taught in that language (teacher style "foreign"): the greeting, the free
// tutor's answers, the discovery dialogue (./dialogue.ts), the oral quiz,
// the structured messages and the phone call are then in simple A2–B1
// sentences, from each skill's edition in the language (Skill.taught).
// Arabic stays as help where it matters most: an item's solution is shown
// in Arabic. Deterministic and free, like the Arabic templates.
import { TAUGHT_LANGUAGES, foreignLanguageOfSubject, type ForeignLang } from "@shared/taughtLanguages";
import type { BankQuestion, Lesson, Skill } from "./curriculum";
import type { StudentContext } from "./context";
import type { TeacherStyle } from "./darja";
import { detectIntent, mentionedSkill } from "./templates";

/** The language the teacher speaks here: the lesson's own, when the student chose it. */
export function taughtLanguage(style: TeacherStyle | undefined, lesson: Pick<Lesson, "subject">): ForeignLang | null {
  return style === "foreign" ? foreignLanguageOfSubject(lesson.subject) : null;
}

type Tier = StudentContext["tier"];

/** Everything the teacher says around the lesson content, in each taught language. */
type Words = {
  hello: (name: string) => string;
  canAlready: (names: string) => string;
  stillHard: (names: string) => string;
  oftenError: (label: string) => string;
  plan: Record<Tier, (focus: string) => string>;
  mastered: string;
  askMe: string;
  doExercises: (name: string) => string;
  thanks: (name: string, next: string | null) => string;
  noRecurring: (name: string) => string;
  recurring: (count: number, label: string) => string;
  rightWay: string;
  simpler: (skill: string) => string;
  easyExample: string;
  simplerEnd: string;
  challenge: (skill: string) => string;
  challengeEnd: string;
  example: (skill: string) => string;
  exampleEnd: string;
  exampleLabel: string;
  explainEnd: string;
  question: string;
  sayLetter: string;
  sayAnswer: string;
  correct: (name: string, answer: string) => string;
  gaveUp: (answer: string) => string;
  notQuite: (answer: string) => string;
  mistake: (label: string) => string;
  solutionInArabic: string;
  newQuestion: string;
  callHello: (name: string) => string;
  callToday: (skill: string, title: string) => string;
  callError: (label: string) => string;
  callMethod: string;
  callHelp: string;
  callEnd: (name: string) => string;
  callScore: (correct: number, total: number) => string;
  callRose: (skill: string, before: number, after: number) => string;
  callAgain: (skill: string) => string;
  callNext: (skill: string) => string;
  callReady: string;
  callPractice: string;
  bye: string;
  msg: {
    understood: string;
    simplerTitle: (skill: string) => string;
    oneIdea: (idea: string) => string;
    exampleTitle: (skill: string) => string;
    exampleExplanation: string;
    exampleQuestion: string;
    stepTitle: (skill: string) => string;
    stepExplanation: string;
    stepQuestion: string;
    similarTitle: (skill: string) => string;
    similarExplanation: string;
    similarQuestion: string;
    summaryTitle: (title: string) => string;
    canAlready: (names: string) => string;
    focusNow: (names: string) => string;
    check: (question: string) => string;
  };
};

const WORDS: Record<ForeignLang, Words> = {
  de: {
    hello: name => `Hallo ${name}! Heute sprechen wir Deutsch.`,
    canAlready: names => `Ich sehe, du kannst ${names} schon gut.`,
    stillHard: names => `Noch schwer für dich: ${names}.`,
    oftenError: label => `Ein Fehler kommt oft vor: ${label}.`,
    plan: {
      weak: focus => `Wir beginnen mit «${focus}»: einfach erklärt, mit leichten Beispielen, und dann Schritt für Schritt weiter.`,
      intermediate: focus => `Wir konzentrieren uns auf «${focus}», mit verschiedenen Beispielen und Übungen.`,
      advanced: focus => `Wir vertiefen «${focus}» und lösen schwierigere Aufgaben.`,
    },
    mastered: "Du kannst diese Lektion schon! Jetzt kommen Extra-Aufgaben.",
    askMe: "Frag mich alles: «Ein Beispiel», «Einfacher», «Im Dialog» oder «Frag mich». Wenn du etwas nicht verstehst, helfe ich dir auch auf Arabisch.",
    doExercises: name => `Sehr gut, ${name}! Mach jetzt die Übungen unter «تماريني».`,
    thanks: (name, next) => `Viel Erfolg, ${name}! ${next ? `Dein nächster Schritt: «${next}». ` : ""}Ich bin immer für dich da.`,
    noRecurring: name => `Ich sehe bei dir noch keinen Fehler, der oft vorkommt, ${name} 👍 Wenn du in einer Übung einen Fehler machst, schau die Korrektur Schritt für Schritt an.`,
    recurring: (count, label) => `Dieser Fehler kommt bei dir ${count}-mal vor: ${label}.`,
    rightWay: "So geht es richtig:",
    simpler: skill => `Kein Problem, Schritt für Schritt: «${skill}»`,
    easyExample: "Ein leichtes Beispiel:",
    simplerEnd: "Ist es jetzt klar? Sag «Beispiel» für ein neues Beispiel, oder «Im Dialog».",
    challenge: skill => `Eine Herausforderung zu «${skill}» 💪`,
    challengeEnd: "Sag jetzt «Frag mich», und ich prüfe dich.",
    example: skill => `Ein gelöstes Beispiel zu «${skill}»:`,
    exampleEnd: "Sag «Frag mich», dann versuchst du es selbst.",
    exampleLabel: "Beispiel:",
    explainEnd: "Möchtest du ein Beispiel, eine einfachere Erklärung oder einen Dialog?",
    question: "Frage",
    sayLetter: "Sag den Buchstaben (A, B, C oder D) oder die Antwort.",
    sayAnswer: "Sag oder schreib deine Antwort.",
    correct: (name, answer) => `✔ Richtig, sehr gut, ${name}! Die Antwort: ${answer}.`,
    gaveUp: answer => `Kein Problem. Die richtige Antwort: ${answer}.`,
    notQuite: answer => `Nicht ganz. Die richtige Antwort: ${answer}.`,
    mistake: label => `Der Fehler: ${label}.`,
    solutionInArabic: "Erklärung (auf Arabisch):",
    newQuestion: "Sag «Frag mich» für eine neue Frage.",
    callHello: name => `Hallo ${name}! Hier ist dein Deutschlehrer. Wie geht es dir?`,
    callToday: (skill, title) => `Heute arbeiten wir zusammen an «${skill}» in der Lektion «${title}».`,
    callError: label => `Ein Fehler kommt bei dir manchmal vor: ${label}. Wir korrigieren ihn zusammen.`,
    callMethod: "Ich gebe dir die Regel nicht fertig: Ich stelle dir kleine Fragen, und du findest sie selbst. Dann prüfe ich dich mit drei kurzen Fragen.",
    callHelp: "Sag jederzeit «Wiederhole», dann sage ich es noch einmal, oder «Ich weiß es nicht», dann helfe ich dir.",
    callEnd: name => `Unsere Stunde ist zu Ende, ${name}.`,
    callScore: (correct, total) => `Du hast ${correct} von ${total} Fragen richtig beantwortet.`,
    callRose: (skill, before, after) => `Bei «${skill}» bist du von ${before} % auf ${after} % gestiegen. Sehr gut!`,
    callAgain: skill => `Wir wiederholen «${skill}» noch einmal. Das ist normal: Aus jedem Fehler lernst du.`,
    callNext: skill => `Super! Beim nächsten Anruf kommt «${skill}».`,
    callReady: "Super! Du bist bereit für schwerere Übungen.",
    callPractice: "Mach bitte deine Übungen unter «تماريني» vor unserem nächsten Anruf.",
    bye: "Tschüss und viel Erfolg!",
    msg: {
      understood: "Hast du diesen Schritt verstanden?",
      simplerTitle: skill => `${skill}: einfacher`,
      oneIdea: idea => `Nur eine Idee: ${idea}`,
      exampleTitle: skill => `Gelöstes Beispiel: ${skill}`,
      exampleExplanation: "Wir wenden die Regel auf ein Beispiel an, Schritt für Schritt. Achte darauf, wie wir die Regel in jedem Schritt benutzen.",
      exampleQuestion: "Was war unser erster Schritt in diesem Beispiel, und warum?",
      stepTitle: skill => `Schritt für Schritt: ${skill}`,
      stepExplanation: "Kein Problem. Wir gehen die Lösung Schritt für Schritt durch und machen erst weiter, wenn alles klar ist.",
      stepQuestion: "Welchen Schritt hast du nicht verstanden? Schreib seine Nummer, und ich erkläre ihn dir.",
      similarTitle: skill => `Ähnliche Übung: ${skill}`,
      similarExplanation: "Versuch es zuerst selbst. Ich gebe dir die Lösung nicht sofort: Schick mir deine Antwort, und ich korrigiere sie.",
      similarQuestion: "Löse die Übung unten und schick mir deine Antwort.",
      summaryTitle: title => `Zusammenfassung: ${title}`,
      canAlready: names => `Das kannst du schon: ${names}.`,
      focusNow: names => `Jetzt konzentrieren wir uns auf: ${names}.`,
      check: question => `Eine kurze Frage zur Kontrolle: ${question}`,
    },
  },
  es: {
    hello: name => `¡Hola, ${name}! Hoy hablamos en español.`,
    canAlready: names => `Veo que ya dominas bien: ${names}.`,
    stillHard: names => `Todavía te cuesta: ${names}.`,
    oftenError: label => `Hay un error que se repite: ${label}.`,
    plan: {
      weak: focus => `Empezamos con «${focus}»: una explicación sencilla, ejemplos fáciles y después, paso a paso, más difícil.`,
      intermediate: focus => `Nos centramos en «${focus}», con ejemplos variados y ejercicios.`,
      advanced: focus => `Profundizamos en «${focus}» y resolvemos ejercicios más difíciles.`,
    },
    mastered: "¡Ya dominas esta lección! Ahora vienen ejercicios extra.",
    askMe: "Pregúntame lo que quieras: «Un ejemplo», «Más fácil», «En diálogo» o «Pregúntame». Si no entiendes algo, también te ayudo en árabe.",
    doExercises: name => `¡Muy bien, ${name}! Ahora haz los ejercicios en «تماريني».`,
    thanks: (name, next) => `¡Mucho éxito, ${name}! ${next ? `Tu próximo paso: «${next}». ` : ""}Estoy aquí cuando me necesites.`,
    noRecurring: name => `Todavía no veo ningún error que se repita, ${name} 👍 Si te equivocas en un ejercicio, mira la corrección paso a paso.`,
    recurring: (count, label) => `Este error se repite ${count} veces: ${label}.`,
    rightWay: "Así se hace correctamente:",
    simpler: skill => `No pasa nada, paso a paso: «${skill}»`,
    easyExample: "Un ejemplo fácil:",
    simplerEnd: "¿Está claro ahora? Di «Ejemplo» para otro ejemplo, o «En diálogo».",
    challenge: skill => `Un reto sobre «${skill}» 💪`,
    challengeEnd: "Ahora di «Pregúntame», y te pongo a prueba.",
    example: skill => `Un ejemplo resuelto sobre «${skill}»:`,
    exampleEnd: "Di «Pregúntame» y lo intentas tú.",
    exampleLabel: "Ejemplo:",
    explainEnd: "¿Quieres un ejemplo, una explicación más fácil o un diálogo?",
    question: "Pregunta",
    sayLetter: "Di la letra (A, B, C o D) o la respuesta.",
    sayAnswer: "Di o escribe tu respuesta.",
    correct: (name, answer) => `✔ ¡Correcto, muy bien, ${name}! La respuesta: ${answer}.`,
    gaveUp: answer => `No pasa nada. La respuesta correcta: ${answer}.`,
    notQuite: answer => `Casi. La respuesta correcta: ${answer}.`,
    mistake: label => `El error: ${label}.`,
    solutionInArabic: "Explicación (en árabe):",
    newQuestion: "Di «Pregúntame» para otra pregunta.",
    callHello: name => `¡Hola, ${name}! Soy tu profesor de español. ¿Qué tal estás?`,
    callToday: (skill, title) => `Hoy trabajamos juntos «${skill}» en la lección «${title}».`,
    callError: label => `A veces cometes este error: ${label}. Lo corregimos juntos.`,
    callMethod: "No te doy la regla hecha: te hago preguntas pequeñas y tú la descubres. Después te pongo a prueba con tres preguntas cortas.",
    callHelp: "Di «Repite» en cualquier momento y lo repito, o «No lo sé» y te ayudo.",
    callEnd: name => `Nuestra clase ha terminado, ${name}.`,
    callScore: (correct, total) => `Has acertado ${correct} de ${total} preguntas.`,
    callRose: (skill, before, after) => `En «${skill}» has subido del ${before} % al ${after} %. ¡Muy bien!`,
    callAgain: skill => `Vamos a repasar «${skill}» otra vez. Es normal: de cada error se aprende.`,
    callNext: skill => `¡Genial! En la próxima llamada vemos «${skill}».`,
    callReady: "¡Genial! Estás listo para ejercicios más difíciles.",
    callPractice: "Haz tus ejercicios en «تماريني» antes de nuestra próxima llamada.",
    bye: "¡Hasta luego y mucho éxito!",
    msg: {
      understood: "¿Has entendido este paso?",
      simplerTitle: skill => `${skill}: más fácil`,
      oneIdea: idea => `Solo una idea: ${idea}`,
      exampleTitle: skill => `Ejemplo resuelto: ${skill}`,
      exampleExplanation: "Aplicamos la regla a un ejemplo, paso a paso. Fíjate en cómo usamos la regla en cada paso.",
      exampleQuestion: "¿Cuál fue nuestro primer paso en este ejemplo, y por qué?",
      stepTitle: skill => `Paso a paso: ${skill}`,
      stepExplanation: "No pasa nada. Vemos la solución paso a paso y solo seguimos cuando todo está claro.",
      stepQuestion: "¿Qué paso no has entendido? Escribe su número y te lo explico.",
      similarTitle: skill => `Ejercicio parecido: ${skill}`,
      similarExplanation: "Inténtalo primero tú. No te doy la solución enseguida: mándame tu respuesta y te la corrijo.",
      similarQuestion: "Resuelve el ejercicio de abajo y mándame tu respuesta.",
      summaryTitle: title => `Resumen: ${title}`,
      canAlready: names => `Ya dominas: ${names}.`,
      focusNow: names => `Ahora nos centramos en: ${names}.`,
      check: question => `Una pregunta corta para comprobarlo: ${question}`,
    },
  },
  it: {
    hello: name => `Ciao ${name}! Oggi parliamo in italiano.`,
    canAlready: names => `Vedo che sai già bene: ${names}.`,
    stillHard: names => `Ancora difficile per te: ${names}.`,
    oftenError: label => `C'è un errore che si ripete: ${label}.`,
    plan: {
      weak: focus => `Cominciamo con «${focus}»: una spiegazione semplice, esempi facili e poi, passo dopo passo, più difficile.`,
      intermediate: focus => `Ci concentriamo su «${focus}», con esempi diversi ed esercizi.`,
      advanced: focus => `Approfondiamo «${focus}» e risolviamo esercizi più difficili.`,
    },
    mastered: "Conosci già questa lezione! Ora arrivano esercizi extra.",
    askMe: "Chiedimi quello che vuoi: «Un esempio», «Più facile», «In dialogo» o «Fammi una domanda». Se non capisci qualcosa, ti aiuto anche in arabo.",
    doExercises: name => `Molto bene, ${name}! Ora fai gli esercizi in «تماريني».`,
    thanks: (name, next) => `In bocca al lupo, ${name}! ${next ? `Il tuo prossimo passo: «${next}». ` : ""}Sono qui quando hai bisogno.`,
    noRecurring: name => `Non vedo ancora un errore che si ripete, ${name} 👍 Se sbagli in un esercizio, guarda la correzione passo dopo passo.`,
    recurring: (count, label) => `Questo errore si ripete ${count} volte: ${label}.`,
    rightWay: "Ecco come si fa correttamente:",
    simpler: skill => `Nessun problema, passo dopo passo: «${skill}»`,
    easyExample: "Un esempio facile:",
    simplerEnd: "È chiaro adesso? Di' «Esempio» per un altro esempio, o «In dialogo».",
    challenge: skill => `Una sfida su «${skill}» 💪`,
    challengeEnd: "Ora di' «Fammi una domanda», e ti metto alla prova.",
    example: skill => `Un esempio risolto su «${skill}»:`,
    exampleEnd: "Di' «Fammi una domanda» e provi tu.",
    exampleLabel: "Esempio:",
    explainEnd: "Vuoi un esempio, una spiegazione più facile o un dialogo?",
    question: "Domanda",
    sayLetter: "Di' la lettera (A, B, C o D) o la risposta.",
    sayAnswer: "Di' o scrivi la tua risposta.",
    correct: (name, answer) => `✔ Giusto, bravissimo ${name}! La risposta: ${answer}.`,
    gaveUp: answer => `Nessun problema. La risposta giusta: ${answer}.`,
    notQuite: answer => `Non proprio. La risposta giusta: ${answer}.`,
    mistake: label => `L'errore: ${label}.`,
    solutionInArabic: "Spiegazione (in arabo):",
    newQuestion: "Di' «Fammi una domanda» per un'altra domanda.",
    callHello: name => `Ciao ${name}! Sono il tuo professore d'italiano. Come stai?`,
    callToday: (skill, title) => `Oggi lavoriamo insieme su «${skill}» nella lezione «${title}».`,
    callError: label => `A volte fai questo errore: ${label}. Lo correggiamo insieme.`,
    callMethod: "Non ti do la regola già pronta: ti faccio piccole domande e la scopri tu. Poi ti metto alla prova con tre domande brevi.",
    callHelp: "Di' «Ripeti» in qualsiasi momento e lo ripeto, oppure «Non lo so» e ti aiuto.",
    callEnd: name => `La nostra lezione è finita, ${name}.`,
    callScore: (correct, total) => `Hai risposto giusto a ${correct} domande su ${total}.`,
    callRose: (skill, before, after) => `In «${skill}» sei salito dal ${before} % al ${after} %. Bravo!`,
    callAgain: skill => `Ripassiamo «${skill}» ancora una volta. È normale: da ogni errore si impara.`,
    callNext: skill => `Ottimo! Alla prossima chiamata vediamo «${skill}».`,
    callReady: "Ottimo! Sei pronto per esercizi più difficili.",
    callPractice: "Fai i tuoi esercizi in «تماريني» prima della nostra prossima chiamata.",
    bye: "Ciao e in bocca al lupo!",
    msg: {
      understood: "Hai capito questo passo?",
      simplerTitle: skill => `${skill}: più facile`,
      oneIdea: idea => `Solo un'idea: ${idea}`,
      exampleTitle: skill => `Esempio risolto: ${skill}`,
      exampleExplanation: "Applichiamo la regola a un esempio, passo dopo passo. Guarda come usiamo la regola in ogni passo.",
      exampleQuestion: "Qual è stato il nostro primo passo in questo esempio, e perché?",
      stepTitle: skill => `Passo dopo passo: ${skill}`,
      stepExplanation: "Nessun problema. Vediamo la soluzione passo dopo passo e andiamo avanti solo quando tutto è chiaro.",
      stepQuestion: "Quale passo non hai capito? Scrivi il suo numero e te lo spiego.",
      similarTitle: skill => `Esercizio simile: ${skill}`,
      similarExplanation: "Prova prima tu. Non ti do subito la soluzione: mandami la tua risposta e te la correggo.",
      similarQuestion: "Risolvi l'esercizio qui sotto e mandami la tua risposta.",
      summaryTitle: title => `Riassunto: ${title}`,
      canAlready: names => `Sai già: ${names}.`,
      focusNow: names => `Ora ci concentriamo su: ${names}.`,
      check: question => `Una domanda breve per controllare: ${question}`,
    },
  },
};

/** The teacher's words in the taught language. */
export function teacherWords(lang: ForeignLang): Words {
  return WORDS[lang];
}

function taughtName(lesson: Lesson, key: string, fallback: string): string {
  return lesson.skills.find(skill => skill.key === key)?.taught?.name ?? fallback;
}

function taughtTitle(lesson: Lesson): string {
  return lesson.titleTaught ?? lesson.title;
}

/** A misconception's label in the taught language (the Arabic one when missing). */
export function taughtMisconception(lesson: Lesson, error: { key: string; label: string }): string {
  return lesson.misconceptionsTaught?.[error.key] ?? error.label;
}

function exampleText(example: { problem: string; steps: string[]; answer: string }): string {
  return `${example.problem}\n${example.steps.map((step, index) => `${index + 1}) ${step}`).join("\n")}\n✔ ${example.answer}`;
}

/** The greeting that opens the session (the Arabic one: templates.ts templateOpening). */
export function foreignOpening(lang: ForeignLang, lesson: Lesson, context: StudentContext): string {
  const w = WORDS[lang];
  const names = (skills: StudentContext["skills"]) => skills.map(skill => taughtName(lesson, skill.key, skill.name)).join(", ");
  const focus = context.focusSkills[0];
  const parts = [w.hello(context.name)];
  if (context.strengths.length) parts.push(w.canAlready(names(context.strengths)));
  if (context.weaknesses.length) parts.push(w.stillHard(names(context.weaknesses)));
  if (context.recurringErrors.length) parts.push(w.oftenError(taughtMisconception(lesson, context.recurringErrors[0])));
  parts.push(focus ? w.plan[context.tier](taughtName(lesson, focus.key, focus.name)) : w.mastered);
  parts.push(w.askMe);
  return parts.join(" ");
}

function skillFor(lesson: Lesson, context: StudentContext, message: string): Skill | undefined {
  return (
    mentionedSkill(lesson, message) ??
    lesson.skills.find(entry => entry.key === context.focusSkills[0]?.key) ??
    lesson.skills.find(entry => entry.key === [...context.skills].sort((a, b) => a.mastery - b.mastery)[0]?.key)
  );
}

/** The free tutor in the taught language (the Arabic one: templates.ts templateTutorReply). */
export function foreignTutorReply(lang: ForeignLang, lesson: Lesson, context: StudentContext, message: string): string {
  const w = WORDS[lang];
  const skill = skillFor(lesson, context, message);
  const taught = skill?.taught;
  if (!skill || !taught) return w.doExercises(context.name);
  switch (detectIntent(message)) {
    case "thanks": {
      const next = context.focusSkills[0];
      return w.thanks(context.name, next ? taughtName(lesson, next.key, next.name) : null);
    }
    case "mistake": {
      const error = context.recurringErrors[0];
      if (!error) return w.noRecurring(context.name);
      const remedy = lesson.remediesTaught?.[error.key];
      return `${w.recurring(error.count, taughtMisconception(lesson, error))}\n${remedy ? `✅ ${remedy}\n` : ""}\n${w.rightWay}\n${exampleText(taught.example)}`;
    }
    case "simpler": {
      const sentences = taught.explanation.split(/(?<=[.:])\s+/).filter(Boolean);
      return `${w.simpler(taught.name)}\n${sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join("\n")}\n\n${w.easyExample}\n${exampleText(taught.example)}\n\n${w.simplerEnd}`;
    }
    case "challenge":
      return `${w.challenge(taught.name)}\n${exampleText(taught.example)}\n\n${w.challengeEnd}`;
    case "example":
      return `${w.example(taught.name)}\n${exampleText(taught.example)}\n\n${w.exampleEnd}`;
    default:
      return `«${taught.name}»: ${taught.explanation}\n\n${w.exampleLabel}\n${exampleText(taught.example)}\n\n${w.explainEnd}`;
  }
}

const LETTERS = ["A", "B", "C", "D"];

/** An oral quiz question in the taught language; options are answered with A–D. */
export function foreignOralQuestion(lang: ForeignLang, item: BankQuestion): string {
  const w = WORDS[lang];
  const options =
    item.type === "mcq" && item.options
      ? "\n" + item.options.map((option, index) => `${LETTERS[index]}: ${option}`).join("\n") + `\n${w.sayLetter}`
      : `\n${w.sayAnswer}`;
  return `${w.question}: ${item.promptTaught ?? item.prompt}${options}`;
}

/** The feedback on an oral answer; the solution stays in Arabic as help. */
export function foreignOralFeedback(
  lang: ForeignLang,
  lesson: Lesson,
  input: { name: string; correct: boolean; gaveUp: boolean; correctAnswer: string; misconceptionKey: string | undefined; explanation: string; progress: string }
): string {
  const w = WORDS[lang];
  if (input.correct) return `${w.correct(input.name, input.correctAnswer)}${input.progress}\n${w.newQuestion}`;
  const key = input.misconceptionKey;
  const label = key ? lesson.misconceptionsTaught?.[key] : undefined;
  const remedy = key ? lesson.remediesTaught?.[key] : undefined;
  return [
    input.gaveUp ? w.gaveUp(input.correctAnswer) : w.notQuite(input.correctAnswer),
    label ? w.mistake(label) : null,
    remedy ? `✅ ${remedy}` : null,
    `${w.solutionInArabic}\n${input.explanation}`,
    w.newQuestion,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The phone call's opening (the Arabic one: templates.ts callIntroText). */
export function foreignCallIntro(lang: ForeignLang, lesson: Lesson, context: StudentContext): string {
  const w = WORDS[lang];
  const focus = context.focusSkills[0] ?? [...context.skills].sort((a, b) => a.mastery - b.mastery)[0];
  const skill = lesson.skills.find(entry => entry.key === focus?.key) ?? lesson.skills[0];
  const error = context.recurringErrors[0];
  return [
    w.callHello(context.name),
    w.callToday(skill.taught?.name ?? skill.name, taughtTitle(lesson)),
    error ? w.callError(taughtMisconception(lesson, error)) : "",
    w.callMethod,
    w.callHelp,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The phone call's goodbye (the Arabic one: templates.ts callSummaryText). */
export function foreignCallSummary(
  lang: ForeignLang,
  input: { name: string; correct: number; total: number; skillName: string | null; before: number | null; after: number | null; nextSkillName: string | null }
): string {
  const w = WORDS[lang];
  const { name, correct, total, skillName, before, after, nextSkillName } = input;
  const lines = [w.callEnd(name)];
  if (total) lines.push(w.callScore(correct, total));
  if (skillName && total) {
    const rose = before !== null && after !== null && Math.round(after * 100) > Math.round(before * 100);
    if (rose && correct * 2 >= total) lines.push(w.callRose(skillName, Math.round(before! * 100), Math.round(after! * 100)));
    else if (correct * 2 < total) lines.push(w.callAgain(skillName));
  }
  if (total && correct === total) lines.push(nextSkillName ? w.callNext(nextSkillName) : w.callReady);
  else if (total) lines.push(w.callPractice);
  lines.push(w.bye);
  return lines.join(" ");
}

/** A skill's name in the taught language, for the call. */
export function taughtSkillName(lesson: Lesson, key: string | undefined, fallback: string | null): string | null {
  if (!key) return fallback;
  return taughtName(lesson, key, fallback ?? key);
}

/** The language's name as the student picks it ("Deutsch", "Español", "Italiano"). */
export function taughtLabel(lang: ForeignLang): string {
  return TAUGHT_LANGUAGES[lang].label;
}
