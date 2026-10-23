// The German lessons in German: what the teacher says when the student
// chooses "Deutsch" (the teacher speaks German, simple A2–B1 sentences).
// Each skill gets its German edition — name, explanation, worked example
// and discovery dialogue — and each bank item a German prompt (oral quiz).
// Attached in ./index.ts; answers never appear in their own hints
// (server/tafawoq/dialogue.test.ts).
import type { SkillEdition } from "../../curriculum";

export const GERMAN_EDITIONS: Record<string, { title: string; skills: Record<string, SkillEdition> }> = {
  "de-tenses": {
    title: "Zeiten: Perfekt, Präteritum und Futur",
    skills: {
      perfekt_aux: {
        name: "Das Perfekt: haben oder sein?",
        explanation:
          "Das Perfekt hat zwei Teile: ein Hilfsverb (haben oder sein) auf Position 2 und das Partizip II am Satzende: «Ich habe Fußball gespielt». Mit sein bilden wir das Perfekt bei Verben der Bewegung (gehen, fahren, kommen, fliegen), bei Verben der Veränderung (aufstehen, einschlafen, werden) und bei sein und bleiben. Alle anderen Verben bilden das Perfekt mit haben.",
        example: {
          problem: "Ergänze: «Wir ___ gestern nach Oran gefahren.»",
          steps: ["fahren ist ein Verb der Bewegung.", "Also nehmen wir sein.", "sein mit wir: sind."],
          answer: "Wir sind gestern nach Oran gefahren.",
        },
        dialogue: {
          opening: "Im Perfekt sagen wir: «Ich habe Fußball gespielt». Das sind zwei Teile: ein Hilfsverb und das Partizip II am Ende.",
          steps: [
            { ask: "Im Satz «Ich habe Fußball gespielt»: Welches Wort ist das Hilfsverb?", answer: "habe", accept: ["haben"], hint: "Es ist das Wort direkt nach «Ich»." },
            { ask: "Und hier: «Ich bin nach Hause gegangen». Welches Wort ist das Hilfsverb?", answer: "bin", hint: "Schau auf das zweite Wort im Satz." },
            { ask: "gehen ist ein Verb der Bewegung. Nehmen Verben der Bewegung haben oder sein?", answer: "sein", hint: "Denk an den Satz mit gegangen." },
            { ask: "Ergänze: «Er ___ einen Apfel gegessen». (essen ist keine Bewegung)", answer: "hat", hint: "Die meisten Verben nehmen das andere Hilfsverb. Konjugiere es mit er." },
          ],
          rule: "Perfekt = haben oder sein (Position 2) + Partizip II (am Ende). sein: Bewegung (gehen, fahren, kommen), Veränderung (aufstehen, werden), sein und bleiben. haben: alle anderen Verben.",
        },
      },
      partizip: {
        name: "Das Partizip II bilden",
        explanation:
          "Regelmäßige Verben: ge + Stamm + t (machen: gemacht, kaufen: gekauft). Unregelmäßige Verben: ge + Stamm + en, oft mit neuem Vokal (schreiben: geschrieben, gehen: gegangen). Verben auf -ieren: ohne ge (studieren: studiert). Untrennbare Verben mit be-, ver-, er-, ent-: ohne ge (besuchen: besucht). Trennbare Verben: ge in der Mitte (einkaufen: eingekauft).",
        example: {
          problem: "Wie heißt das Partizip II von «einkaufen»?",
          steps: ["ein ist ein trennbares Präfix.", "kaufen ist regelmäßig: gekauft.", "ein + gekauft = eingekauft."],
          answer: "eingekauft",
        },
        dialogue: {
          opening: "Das Partizip II steht am Ende vom Perfekt-Satz. Es gibt nur wenige Muster, und du findest sie selbst.",
          steps: [
            { ask: "Schau: «machen: gemacht» und «spielen: gespielt». Wie heißt das Partizip II von kaufen?", answer: "gekauft", hint: "Gleicher Anfang und gleicher Buchstabe am Ende wie in den Beispielen." },
            { ask: "Unregelmäßige Verben enden auf -en: «schreiben: geschrieben», «lesen: gelesen». Und sehen?", answer: "gesehen", hint: "Vorne ge-, hinten -en, der Stamm bleibt gleich." },
            { ask: "Verben auf -ieren haben kein ge-: «studieren: studiert». Und telefonieren?", answer: "telefoniert", hint: "Nimm -en weg und schreib -t, ohne Präfix." },
            { ask: "Trennbare Verben haben ge- in der Mitte: «einkaufen: eingekauft». Und aufmachen?", answer: "aufgemacht", hint: "Trenne auf ab, bilde das Partizip von machen und setze auf wieder vorne hin." },
          ],
          rule: "Partizip II: regelmäßig ge…t (gemacht), unregelmäßig ge…en (gesehen), -ieren ohne ge (studiert), be-/ver-/er- ohne ge (besucht), trennbar: ge in der Mitte (aufgemacht).",
        },
      },
      praeteritum_futur: {
        name: "Präteritum und Futur I",
        explanation:
          "Das Präteritum ist die Zeit für Texte und Geschichten, auch im BAC-Text. Regelmäßig: Stamm + te + Endung (ich machte, wir wohnten). Unregelmäßig: neuer Stamm (gehen: ging, kommen: kam, fahren: fuhr, sehen: sah). Wichtig: sein: war, haben: hatte, werden: wurde, können: konnte. Das Futur I: werden + Infinitiv am Ende: «Ich werde in Deutschland studieren».",
        example: {
          problem: "Setze ins Präteritum: «Er geht ins Kino.»",
          steps: ["gehen ist unregelmäßig.", "Präteritum: ging.", "Mit er ohne Endung."],
          answer: "Er ging ins Kino.",
        },
        dialogue: {
          opening: "In Texten und Geschichten findest du das Präteritum: «Er ging nach Hause». Für die Zukunft nehmen wir werden + Infinitiv.",
          steps: [
            { ask: "sein im Präteritum: ich war, er war. Und mit wir?", answer: "waren", hint: "Gib war dieselbe Endung wie in «wir spielen»." },
            { ask: "Regelmäßige Verben bekommen -te: ich machte. Und wohnen mit ich?", answer: "wohnte", hint: "Stamm wohn + die Silbe aus machte." },
            { ask: "Wie heißt haben im Präteritum mit er?", answer: "hatte", hint: "Es klingt wie das englische had, aber mit -e am Ende." },
            { ask: "Die Zukunft: «Ich ___ morgen lernen». Welches Hilfsverb mit ich?", answer: "werde", hint: "Das Verb der Zukunft, für ich konjugiert, ohne n am Ende." },
          ],
          rule: "Präteritum: regelmäßig Stamm + te + Endung (machte, wohnten), unregelmäßig mit neuem Stamm (ging, kam, sah, fuhr); sein: war, haben: hatte, werden: wurde. Futur I: werden + Infinitiv am Satzende.",
        },
      },
    },
  },
  "de-sentences": {
    title: "Satzbau: Verbposition, Konnektoren und Relativsätze",
    skills: {
      verb_second: {
        name: "Das Verb auf Position 2 und die Konnektoren",
        explanation:
          "Im Hauptsatz steht das konjugierte Verb immer auf Position 2: «Ich spiele heute Fußball». Beginnt der Satz mit einem anderen Wort (heute) oder mit deshalb oder trotzdem, bleibt das Verb auf Position 2 und das Subjekt kommt danach (Inversion): «Heute spiele ich Fußball», «Es regnet, trotzdem gehen wir spazieren». und, aber, oder, denn, sondern zählen nicht: «…, denn ich bin krank».",
        example: {
          problem: "Beginne mit «deshalb»: «Ich bin müde. Ich gehe früh ins Bett.»",
          steps: ["deshalb steht auf Position 1.", "Das Verb gehe steht auf Position 2.", "Dann kommt das Subjekt ich."],
          answer: "Ich bin müde, deshalb gehe ich früh ins Bett.",
        },
        dialogue: {
          opening: "Eine goldene Regel im Deutschen: Im Hauptsatz steht das konjugierte Verb immer auf Position 2.",
          steps: [
            { ask: "«Ich spiele heute Fußball». Welches Wort steht auf Position 2?", answer: "spiele", hint: "Es ist das konjugierte Verb nach dem Pronomen." },
            { ask: "Wir beginnen mit heute: «Heute ___ ich Fußball». Welches Wort kommt direkt nach Heute?", answer: "spiele", hint: "Das Verb bleibt auf Position 2, das Subjekt kommt danach." },
            { ask: "deshalb steht auf Position 1: «Ich bin müde, deshalb ___ ich früh». (schlafen mit ich)", answer: "schlafe", hint: "Konjugiere das Verb für ich und stelle es direkt nach den Konnektor." },
            { ask: "Aber denn zählt nicht: «Ich bleibe zu Hause, denn ich ___ krank». (sein mit ich)", answer: "bin", hint: "Nach denn kommt erst das Subjekt, dann das Verb, wie in einem normalen Satz." },
          ],
          rule: "Das konjugierte Verb steht immer auf Position 2. Nach heute, deshalb, trotzdem … kommt das Subjekt nach dem Verb (Inversion). und, aber, oder, denn, sondern ändern die Wortstellung nicht.",
        },
      },
      subordinate_clause: {
        name: "Nebensätze mit weil, dass, wenn, obwohl",
        explanation:
          "Nach weil, dass, wenn, obwohl, als und ob steht das konjugierte Verb am Ende: «Ich lerne Deutsch, weil ich in Deutschland studieren will». Steht der Nebensatz am Anfang, ist er Position 1, und das Verb des Hauptsatzes kommt direkt nach dem Komma: «Wenn ich Zeit habe, gehe ich ins Kino».",
        example: {
          problem: "Verbinde mit «weil»: «Ich bleibe zu Hause. Ich bin krank.»",
          steps: ["weil beginnt den Nebensatz.", "Das Verb bin geht ans Ende."],
          answer: "Ich bleibe zu Hause, weil ich krank bin.",
        },
        dialogue: {
          opening: "Im Nebensatz mit weil, dass, wenn oder obwohl springt das konjugierte Verb ans Ende.",
          steps: [
            { ask: "«Ich bleibe zu Hause, weil ich krank ___». (sein mit ich)", answer: "bin", hint: "Konjugiere sein für ich und stelle es ans Ende." },
            { ask: "«Ich weiß, dass er gut Deutsch ___». (sprechen mit er)", answer: "spricht", hint: "Bei diesem Verb wird e mit er zu i." },
            { ask: "Welcher Konnektor drückt einen Gegensatz aus: weil oder obwohl?", answer: "obwohl", hint: "Nicht der Konnektor für den Grund." },
            { ask: "Der Nebensatz steht vorne: «Wenn ich Zeit habe, ___ ich ins Kino». (gehen mit ich)", answer: "gehe", hint: "Der ganze Nebensatz ist Position 1, also kommt das Verb direkt nach dem Komma." },
          ],
          rule: "Nach weil, dass, wenn, obwohl, als, ob steht das konjugierte Verb am Ende. Steht der Nebensatz vorne, kommt das Verb des Hauptsatzes direkt nach dem Komma: «Wenn ich Zeit habe, gehe ich ins Kino».",
        },
      },
      relative_clause: {
        name: "Relativsätze",
        explanation:
          "Ein Relativsatz beschreibt ein Nomen: «der Mann, der in Berlin wohnt». Das Relativpronomen hat das Genus und die Zahl des Nomens; den Kasus bestimmt seine Rolle im Relativsatz: Subjekt: der/die/das, Akkusativ: den/die/das, Dativ: dem/der/dem (Plural denen). Das konjugierte Verb steht am Ende des Relativsatzes.",
        example: {
          problem: "Verbinde: «Das ist der Film. Ich habe den Film gesehen.»",
          steps: ["der Film ist maskulin.", "Im zweiten Satz ist er Akkusativ: den.", "habe steht am Ende."],
          answer: "Das ist der Film, den ich gesehen habe.",
        },
        dialogue: {
          opening: "Ein Relativsatz beschreibt ein Nomen: «der Mann, der in Berlin wohnt». Das Pronomen nimmt das Genus vom Nomen und den Kasus aus dem Relativsatz.",
          steps: [
            { ask: "«die Frau, ___ hier arbeitet». Das Nomen ist feminin und Subjekt. Welches Pronomen?", answer: "die", hint: "Es ist derselbe Artikel wie bei Frau im Nominativ." },
            { ask: "«das Kind, ___ dort spielt». Welches Pronomen?", answer: "das", hint: "Schau auf den Artikel von Kind." },
            { ask: "«der Film, ___ ich gesehen habe». Der Film ist hier Akkusativ. Welches Pronomen?", answer: "den", hint: "Nur das Maskulinum ändert sich im Akkusativ: r wird zu n." },
            { ask: "Wo steht das konjugierte Verb im Relativsatz: am Anfang oder am Ende?", answer: "Ende", accept: ["am Ende"], hint: "Ein Relativsatz ist ein Nebensatz. Denk an die Regel mit weil." },
          ],
          rule: "Das Relativpronomen ist meist wie der Artikel (der, die, das, den, dem …), mit Genus und Zahl vom Nomen und dem Kasus im Relativsatz. Das konjugierte Verb steht am Ende des Relativsatzes.",
        },
      },
    },
  },
  "de-cases": {
    title: "Kasus und Präpositionen",
    skills: {
      akkusativ: {
        name: "Der Akkusativ",
        explanation:
          "Das direkte Objekt steht im Akkusativ, auch nach «es gibt». Nur das Maskulinum ändert sich: der wird den, ein wird einen, mein wird meinen, kein wird keinen. Feminin (die/eine), Neutrum (das/ein) und Plural (die) bleiben wie im Nominativ. Pronomen: ich: mich, du: dich, er: ihn, sie: sie.",
        example: {
          problem: "Ergänze: «Ich habe ___ Bruder und ___ Schwester.»",
          steps: ["Bruder ist maskulin und Objekt: einen.", "Schwester ist feminin: eine bleibt gleich."],
          answer: "Ich habe einen Bruder und eine Schwester.",
        },
        dialogue: {
          opening: "Im Deutschen ändert sich der Artikel mit der Rolle im Satz. Das Subjekt steht im Nominativ: «Der Hund schläft».",
          steps: [
            { ask: "«Ich sehe ___ Hund». Der Hund ist hier Objekt (Akkusativ). Was wird aus der?", answer: "den", hint: "Nur der letzte Buchstabe ändert sich: r wird zu n." },
            { ask: "Und der unbestimmte Artikel ein, maskulin, im Akkusativ?", answer: "einen", hint: "Hänge -en an ein." },
            { ask: "«Ich kaufe ___ Tasche». (die Tasche) Was wird aus die?", answer: "die", hint: "Feminin und Neutrum bleiben im Akkusativ gleich." },
            { ask: "Nach «es gibt» steht immer Akkusativ: «Es gibt ___ Park in meiner Stadt». (der Park, unbestimmt)", answer: "einen", hint: "Unbestimmt, maskulin, Akkusativ: wie in Frage 2." },
          ],
          rule: "Akkusativ (direktes Objekt und nach es gibt): nur das Maskulinum ändert sich: der wird den, ein wird einen, mein wird meinen. Feminin, Neutrum und Plural bleiben wie im Nominativ.",
        },
      },
      dativ: {
        name: "Der Dativ",
        explanation:
          "Das indirekte Objekt (wem?) steht im Dativ, ebenso nach Verben wie helfen, danken, gefallen, gehören, antworten. Artikel: der und das werden dem, die wird der, Plural die wird den + n am Nomen (den Kindern); ein wird einem, eine wird einer. Pronomen: ich: mir, du: dir, er: ihm, sie: ihr.",
        example: {
          problem: "Ergänze: «Der Lehrer gibt ___ Schüler ein Buch.» (der Schüler)",
          steps: ["Wem gibt er das Buch? Dem Schüler: indirektes Objekt.", "Maskulin im Dativ: dem."],
          answer: "Der Lehrer gibt dem Schüler ein Buch.",
        },
        dialogue: {
          opening: "Der Dativ antwortet auf die Frage «wem?» und steht nach Verben wie helfen, danken und gefallen.",
          steps: [
            { ask: "Im Dativ werden der und das zu …?", answer: "dem", hint: "Der letzte Buchstabe wird zu m." },
            { ask: "Und die (feminin) im Dativ?", answer: "der", hint: "Gleiche Form wie bei «Mann» im Nominativ." },
            { ask: "Und der Plural: «mit ___ Kindern»?", answer: "den", hint: "Wie das Maskulinum im Akkusativ, und das Nomen bekommt ein n." },
            { ask: "ich im Dativ: «Kannst du ___ helfen?»", answer: "mir", hint: "Nicht mich, das ist Akkusativ." },
          ],
          rule: "Dativ: der und das werden dem, die wird der, Plural den + n, ein wird einem, eine wird einer; ich: mir, du: dir, er: ihm, sie: ihr. Dativ-Verben: helfen, danken, gefallen, gehören, antworten.",
        },
      },
      prepositions: {
        name: "Präpositionen und ihr Kasus",
        explanation:
          "Immer Dativ: mit, nach, bei, von, zu, aus, seit (zu dem = zum, zu der = zur). Immer Akkusativ: für, durch, gegen, ohne, um. Wechselpräpositionen (in, an, auf, über, unter, vor, hinter, neben, zwischen): wo? (fester Ort) braucht Dativ, wohin? (Richtung) braucht Akkusativ: «Ich bin in der Schule», «Ich gehe in die Schule».",
        example: {
          problem: "Ergänze: «Ich lege das Buch auf ___ Tisch.» (der Tisch)",
          steps: ["Wohin lege ich das Buch? Eine Richtung.", "auf mit wohin braucht Akkusativ.", "Maskulin im Akkusativ: den."],
          answer: "Ich lege das Buch auf den Tisch.",
        },
        dialogue: {
          opening: "Manche Präpositionen haben immer denselben Kasus, andere wechseln: wo? oder wohin?",
          steps: [
            { ask: "mit, nach, bei, von, zu, aus, seit: immer Akkusativ oder Dativ?", answer: "Dativ", hint: "Denk an «mit dem Bus»." },
            { ask: "Und für, durch, gegen, ohne, um?", answer: "Akkusativ", hint: "Denk an «für den Vater»." },
            { ask: "«Ich gehe in ___ Schule» (wohin? Richtung). Was wird aus die Schule?", answer: "die", hint: "Richtung bedeutet Akkusativ, und feminin bleibt dort gleich." },
            { ask: "«Ich bin in ___ Schule» (wo? fester Ort). Was wird aus die Schule?", answer: "der", hint: "Ein fester Ort bedeutet Dativ. Denk an feminin im Dativ." },
          ],
          rule: "Dativ: mit, nach, bei, von, zu, aus, seit. Akkusativ: für, durch, gegen, ohne, um. Wechselpräpositionen (in, an, auf …): wo? braucht Dativ, wohin? braucht Akkusativ.",
        },
      },
    },
  },
  "de-verbs": {
    title: "Passiv, Modalverben und Konjunktiv II",
    skills: {
      passiv: {
        name: "Das Passiv",
        explanation:
          "Im Passiv ist die Handlung wichtig, nicht die Person: werden (konjugiert) + Partizip II am Ende. Präsens: «Das Haus wird gebaut». Präteritum: «Das Haus wurde gebaut». Die Person nennen wir mit von + Dativ: «Die Tests werden vom Lehrer korrigiert». Das Objekt des Aktivsatzes wird zum Subjekt, und werden passt sich ihm an.",
        example: {
          problem: "Setze ins Passiv: «Der Lehrer korrigiert die Tests.»",
          steps: ["die Tests werden Subjekt (Plural).", "werden im Plural: werden.", "korrigieren wird korrigiert, am Ende.", "der Lehrer wird vom Lehrer."],
          answer: "Die Tests werden vom Lehrer korrigiert.",
        },
        dialogue: {
          opening: "Im Passiv ist die Handlung wichtig, nicht wer sie macht: «Das Auto wird repariert».",
          steps: [
            { ask: "Welches Hilfsverb steht im Passiv Präsens: «Das Auto ___ repariert»?", answer: "wird", hint: "Es ist werden, konjugiert für es." },
            { ask: "Und im Präteritum: «Das Auto ___ gestern repariert»?", answer: "wurde", hint: "Das Präteritum von werden für er, sie, es." },
            { ask: "Welche Form hat das Verb am Ende: Infinitiv oder Partizip II?", answer: "Partizip", accept: ["Partizip II", "Partizip 2"], hint: "Dieselbe Form wie im Perfekt." },
            { ask: "Die Person nennen wir mit einer Präposition + Dativ: «Das Auto wird ___ dem Mechaniker repariert»?", answer: "von", hint: "Eine Präposition für «wer es macht»." },
          ],
          rule: "Passiv = werden (konjugiert) + Partizip II am Ende. Präsens: wird gebaut, Präteritum: wurde gebaut. Die Person: von + Dativ.",
        },
      },
      modalverben: {
        name: "Die Modalverben",
        explanation:
          "Modalverben geben dem Verb eine Bedeutung: können = Fähigkeit, müssen = Pflicht, dürfen = Erlaubnis (nicht dürfen = Verbot), wollen = Wille, sollen = Auftrag von einer anderen Person, möchten = höflicher Wunsch. Das Modalverb steht auf Position 2, das Hauptverb im Infinitiv am Ende: «Ich kann gut Deutsch sprechen». Mit ich und er, sie, es gibt es keine Endung: ich kann, er kann.",
        example: {
          problem: "Ein Verbot: «Hier ___ man nicht rauchen.»",
          steps: ["Verbot = nicht dürfen.", "Mit man: darf."],
          answer: "Hier darf man nicht rauchen.",
        },
        dialogue: {
          opening: "Modalverben geben dem Verb eine Bedeutung: Fähigkeit, Pflicht, Erlaubnis, Wille … Das Hauptverb bleibt im Infinitiv am Ende.",
          steps: [
            { ask: "«Ich kann schwimmen». Was bedeutet können: Fähigkeit oder Pflicht?", answer: "Fähigkeit", accept: ["Faehigkeit", "Fahigkeit"], hint: "Denk an das englische can." },
            { ask: "«Ich muss lernen». Was bedeutet müssen: Fähigkeit oder Pflicht?", answer: "Pflicht", hint: "Denk an das englische must." },
            { ask: "«Hier darf man nicht parken». Ist das eine Erlaubnis oder ein Verbot?", answer: "Verbot", hint: "dürfen ist eine Erlaubnis, und nicht dreht sie um." },
            { ask: "«Ich will Deutsch ___». (lernen) Welche Form steht am Ende?", answer: "lernen", hint: "Nach dem Modalverb bleibt das Verb ohne Konjugation." },
          ],
          rule: "können = Fähigkeit, müssen = Pflicht, dürfen = Erlaubnis (nicht dürfen = Verbot), wollen = Wille, sollen = Auftrag, möchten = höflicher Wunsch. Modalverb auf Position 2, Infinitiv am Ende.",
        },
      },
      konjunktiv2: {
        name: "Der Konjunktiv II",
        explanation:
          "Den Konjunktiv II brauchen wir für Wünsche, irreale Bedingungen und höfliche Bitten. sein: wäre, haben: hätte, können: könnte; alle anderen Verben: würde + Infinitiv. Bedingung: «Wenn ich reich wäre, würde ich reisen». Wunsch: «Ich hätte gern mehr Zeit». Rat: «An deiner Stelle würde ich mehr lernen». Bitte: «Könnten Sie mir helfen?»",
        example: {
          problem: "Formuliere einen Wunsch: «Ich habe keine Zeit. Ich besuche dich nicht.»",
          steps: ["Irreale Bedingung: wenn + hätte.", "Folge: würde + besuchen am Ende."],
          answer: "Wenn ich Zeit hätte, würde ich dich besuchen.",
        },
        dialogue: {
          opening: "Mit dem Konjunktiv II träumen wir und sind höflich: «Wenn ich Zeit hätte, würde ich reisen».",
          steps: [
            { ask: "Konjunktiv II von sein mit ich? (aus war)", answer: "wäre", accept: ["waere"], hint: "Nimm war, setze Punkte auf das a und hänge ein e an." },
            { ask: "Und von haben? (aus hatte)", answer: "hätte", accept: ["haette"], hint: "Nimm hatte und setze Punkte auf das a." },
            { ask: "Für die anderen Verben nehmen wir ein Hilfsverb aus werden + Infinitiv: «Ich ___ gern reisen». Welches?", answer: "würde", accept: ["wuerde"], hint: "Es ist wurde mit Punkten auf dem u." },
            { ask: "«Wenn ich reich ___, würde ich ein Haus kaufen». (sein)", answer: "wäre", accept: ["waere"], hint: "Eine irreale Bedingung: die Wunschform von sein." },
          ],
          rule: "Konjunktiv II: sein: wäre, haben: hätte, können: könnte, sonst würde + Infinitiv. Bedingung: «Wenn ich … wäre / hätte, würde ich …». Bitte: «Könnten Sie …?», «Ich hätte gern …».",
        },
      },
    },
  },
  "de-text": {
    title: "Textverständnis, Wortschatz und schriftlicher Ausdruck",
    skills: {
      comprehension: {
        name: "Leseverstehen",
        explanation:
          "Lies zuerst die Frage und finde das Fragewort: Wer, Was, Wo, Wann, Warum, Wie, Seit wann. Such dann im Text den Satz mit der Information und antworte mit einem ganzen Satz in deinen Worten. Auf Warum antworten wir oft mit weil + Verb am Ende.",
        example: {
          problem: "Text: «Lina bleibt zu Hause, weil sie krank ist.» Warum bleibt Lina zu Hause?",
          steps: ["Warum fragt nach dem Grund.", "Der Grund steht nach weil: sie krank ist."],
          answer: "Weil sie krank ist.",
        },
        dialogue: {
          opening: "Im BAC liest du einen Text und beantwortest Fragen. Der Trick: Finde das Fragewort und dann den passenden Satz im Text.",
          steps: [
            { ask: "Welches Fragewort fragt nach der Zeit: Wo oder Wann?", answer: "Wann", hint: "Nicht das Wort für den Ort." },
            { ask: "Und welches Fragewort fragt nach dem Grund?", answer: "Warum", accept: ["Wieso", "Weshalb"], hint: "Die Antwort beginnt oft mit dem Konnektor, der das Verb ans Ende schickt." },
            { ask: "Text: «Karim wohnt in Tlemcen.» Frage: «Wo wohnt Karim?» Die Antwort?", answer: "Tlemcen", hint: "Such das Wort nach der Präposition in." },
            { ask: "«Warum bleibt Lina zu Hause?» Text: «Lina bleibt zu Hause, weil sie krank ist.» Mit welchem Wort beginnt die Antwort?", answer: "Weil", hint: "Derselbe Konnektor für den Grund wie im Text." },
          ],
          rule: "Lies zuerst die Frage, finde das Fragewort (Wer, Was, Wo, Wann, Warum, Wie), such den passenden Satz im Text und antworte mit einem ganzen Satz (Warum: Weil …).",
        },
      },
      vocabulary: {
        name: "Wortschatz nach Themen",
        explanation:
          "Der BAC-Wortschatz kommt aus Themen wie Umwelt (die Verschmutzung, schützen), Medien (die Zeitung, das Internet), Gesundheit (gesund, krank) und Arbeit und Studium (der Beruf, studieren). Oft fragt man nach Synonymen (beginnen = anfangen) und Gegenteilen (alt und jung, billig und teuer). Ein Kompositum versteht man aus seinen Teilen; der Artikel kommt vom letzten Teil: die Umwelt + die Verschmutzung = die Umweltverschmutzung.",
        example: {
          problem: "Was ist das Gegenteil von «billig»?",
          steps: ["billig: es kostet wenig.", "Das Gegenteil: es kostet viel."],
          answer: "teuer",
        },
        dialogue: {
          opening: "Wörter lernst du am besten in Themen und in Paaren: Synonyme und Gegenteile.",
          steps: [
            { ask: "Was ist das Gegenteil von «alt», wenn wir über eine Person sprechen?", answer: "jung", hint: "Ein Adjektiv für Kinder und Teenager." },
            { ask: "Was ist das Gegenteil von «billig»?", answer: "teuer", hint: "Ein Adjektiv für etwas, das viel Geld kostet." },
            { ask: "Ein Synonym für «beginnen»: anfangen oder aufhören?", answer: "anfangen", hint: "Wähle das Verb, das nicht «stoppen» bedeutet." },
            { ask: "«Umweltproblem» kommt aus die Umwelt + das Problem. Welcher Artikel?", answer: "das", hint: "Der Artikel kommt immer vom letzten Teil des Wortes." },
          ],
          rule: "Lerne Wörter in Themen und Paaren: alt und jung, billig und teuer, beginnen = anfangen. Ein Kompositum versteht man aus seinen Teilen; der Artikel kommt vom letzten Teil: das Umweltproblem.",
        },
      },
      writing: {
        name: "Schriftlicher Ausdruck: Brief und Aufsatz",
        explanation:
          "Der Brief: Ort und Datum, die Anrede (privat: Lieber Ali, Liebe Sara; formell: Sehr geehrter Herr …, Sehr geehrte Frau …), der Text, der Gruß (privat: Viele Grüße, Liebe Grüße; formell: Mit freundlichen Grüßen) und die Unterschrift. Der Aufsatz: Einleitung (das Thema), Hauptteil (die Ideen mit Konnektoren: erstens, außerdem, deshalb, trotzdem, zum Schluss) und Schluss (deine Meinung).",
        example: {
          problem: "Schreib Anrede und Gruß für einen formellen Brief an Herrn Müller.",
          steps: ["Formell, maskulin: Sehr geehrter Herr Müller,", "Formeller Gruß: Mit freundlichen Grüßen"],
          answer: "Sehr geehrter Herr Müller, … Mit freundlichen Grüßen",
        },
        dialogue: {
          opening: "Im BAC schreibst du oft einen Brief oder einen kurzen Aufsatz. Beide haben feste Regeln.",
          steps: [
            { ask: "Ein Brief an eine Freundin, Sara: «Lieber Sara» oder «Liebe Sara»?", answer: "Liebe Sara", hint: "Für feminin fällt das r am Ende weg." },
            { ask: "Ein formeller Brief an Herrn Müller: «Sehr ___ Herr Müller»?", answer: "geehrter", hint: "Ein Adjektiv für «respektiert», mit -er beim Maskulinum." },
            { ask: "Der Gruß im formellen Brief: «Mit freundlichen …»?", answer: "Grüßen", accept: ["Gruessen", "Grussen"], hint: "Ein Wort für viele Hallos am Ende des Briefes." },
            { ask: "Im Aufsatz: Einleitung, Hauptteil und …?", answer: "Schluss", accept: ["Schluß"], hint: "Ein Wort für den letzten Teil." },
          ],
          rule: "Brief: Ort und Datum, Anrede (Lieber / Liebe … privat, Sehr geehrter / Sehr geehrte … formell), Text, Gruß (Viele Grüße / Mit freundlichen Grüßen) und Unterschrift. Aufsatz: Einleitung, Hauptteil mit Konnektoren, Schluss mit deiner Meinung.",
        },
      },
    },
  },
};

/** The bank items' prompts in German (the oral quiz in "Deutsch"). */
export const GERMAN_PROMPTS: Record<string, string> = {
  "de-ten-1": "Ergänze: «Ich ___ gestern Fußball gespielt.»",
  "de-ten-2": "Ergänze: «Wir ___ nach Oran gefahren.»",
  "de-ten-3": "Ergänze: «Mein Bruder ___ um 6 Uhr aufgestanden.»",
  "de-ten-4": "Ergänze: «Der Schüler ___ zwei Stunden in der Bibliothek geblieben.»",
  "de-ten-5": "Wie heißt das Partizip II von «machen»?",
  "de-ten-6": "Ergänze: «Er hat einen Brief ___.» (schreiben)",
  "de-ten-7": "Wie heißt das Partizip II von «besuchen»?",
  "de-ten-8": "Ergänze: «Sie ist um 7 Uhr ___.» (aufstehen)",
  "de-ten-9": "Wie heißt «sein» im Präteritum mit «ich»?",
  "de-ten-10": "Ergänze: «Früher ___ wir in Algier.» (wohnen)",
  "de-ten-11": "Ergänze: «Gestern ___ er ins Kino.» (gehen)",
  "de-ten-12": "Ergänze: «Nächstes Jahr ___ ich an der Universität studieren.»",
  "de-sen-1": "Welcher Satz ist richtig?",
  "de-sen-2": "Ergänze: «Ich bin krank, ___ bleibe ich zu Hause.»",
  "de-sen-3": "Ergänze: «Es regnet. ___ gehen wir spazieren.»",
  "de-sen-4": "Welcher Satz ist richtig?",
  "de-sen-5": "Welcher Satz drückt den Grund richtig aus?",
  "de-sen-6": "Was bedeutet «obwohl» auf Arabisch?",
  "de-sen-7": "Welcher Satz ist richtig?",
  "de-sen-8": "Ergänze: «Wenn ich Zeit habe, ___ Fußball.»",
  "de-sen-9": "Ergänze: «Das ist der Mann, ___ in Berlin wohnt.»",
  "de-sen-10": "Ergänze: «Das ist die Lehrerin, ___ ich gestern gesehen habe.»",
  "de-sen-11": "Ergänze: «Das Buch, ___ ich lese, ist spannend.»",
  "de-sen-12": "Ergänze: «Der Freund, ___ ich das Buch gegeben habe, wohnt in Oran.»",
  "de-cas-1": "Ergänze: «Ich habe ___ Bruder.» (der Bruder)",
  "de-cas-2": "Ergänze: «Ich sehe ___ Lehrer.» (der Lehrer)",
  "de-cas-3": "Ergänze: «Wir kaufen ___ neue Tasche.» (die Tasche)",
  "de-cas-4": "Ergänze: «Es gibt hier ___ guten Arzt.» (der Arzt)",
  "de-cas-5": "Ergänze: «Ich helfe ___ Mutter.» (die Mutter)",
  "de-cas-6": "Ergänze: «Das Buch gefällt ___ Kind.» (das Kind)",
  "de-cas-7": "Ergänze: «Der Lehrer erklärt ___ Schülern die Regel.» (Plural)",
  "de-cas-8": "Ergänze: «Ich danke ___ für die Hilfe.» (du)",
  "de-cas-9": "Ergänze: «Ich fahre ___ dem Bus zur Schule.»",
  "de-cas-10": "Ergänze: «Das Geschenk ist für ___ Vater.» (der Vater)",
  "de-cas-11": "Ergänze: «Seit ___ Jahr lerne ich Deutsch.» (das Jahr)",
  "de-cas-12": "Ergänze: «Ich lege das Buch auf ___ Tisch.» (der Tisch)",
  "de-cas-13": "Ergänze: «Das Buch liegt auf ___ Tisch.» (der Tisch)",
  "de-ver-1": "Ergänze (Passiv, Präsens): «Das Haus ___ gebaut.»",
  "de-ver-2": "Ergänze (Passiv, Präteritum): «Der Brief ___ gestern geschrieben.»",
  "de-ver-3": "Setze ins Passiv: «Der Lehrer korrigiert die Tests.»",
  "de-ver-4": "Ergänze: «In Algerien ___ viel Couscous gegessen.»",
  "de-ver-5": "Was bedeutet «Ich muss lernen» auf Arabisch?",
  "de-ver-6": "Ergänze: «Ich kann gut Deutsch ___.»",
  "de-ver-7": "Ergänze (Rauchen ist verboten): «Hier ___ man nicht rauchen.»",
  "de-ver-8": "Ergänze: «Er ___ Arzt werden, das ist sein Traum.»",
  "de-ver-9": "Ergänze: «Wenn ich reich ___, würde ich reisen.»",
  "de-ver-10": "Höfliche Bitte im Café: «Ich ___ gern einen Kaffee.»",
  "de-ver-11": "Ein Rat: «An deiner Stelle ___ ich mehr lernen.»",
  "de-ver-12": "Ergänze: «Wenn ich Zeit hätte, ___ ich dich besuchen.»",
  "de-txt-1": "Laut Text: «Wo wohnt Karim?»",
  "de-txt-2": "Laut Text: «Seit wann lernt Karim Deutsch?»",
  "de-txt-3": "Laut Text: «Warum hat Karim wenig Freizeit?»",
  "de-txt-4": "Welche Aussage ist laut Text richtig?",
  "de-txt-5": "Das Gegenteil von «groß» ist:",
  "de-txt-6": "Was bedeutet «die Umwelt» auf Arabisch?",
  "de-txt-7": "Ein Synonym für «beginnen» ist:",
  "de-txt-8": "Ergänze: «Die Luft wird durch Autos und Fabriken ___.»",
  "de-txt-9": "Welches Wort gehört nicht zum Thema «Medien»?",
  "de-txt-10": "Wie beginnst du einen privaten Brief an deinen Freund Ali?",
  "de-txt-11": "Wie endet ein formeller Brief?",
  "de-txt-12": "Welcher Konnektor passt, um eine neue Idee hinzuzufügen?",
  "de-txt-13": "Was ist die richtige Reihenfolge in einem Aufsatz?",
};

/** The misconceptions of the German lessons, in German. */
export const GERMAN_MISCONCEPTIONS: Record<string, string> = {
  wrong_auxiliary: "das falsche Hilfsverb (haben statt sein oder umgekehrt)",
  participle_form: "eine falsche Form des Partizips II",
  irregular_as_regular: "ein unregelmäßiges Verb wie ein regelmäßiges konjugiert",
  tense_confusion: "die Zeiten verwechselt",
  conjugation_error: "die Verbform passt nicht zum Subjekt",
  verb_position: "das Verb an der falschen Position",
  connector_meaning: "die Bedeutung des Konnektors verwechselt",
  relative_pronoun: "das falsche Relativpronomen (Genus oder Kasus)",
  case_confusion: "Akkusativ und Dativ verwechselt",
  nominative_default: "den Artikel im Nominativ gelassen",
  gender_error: "das falsche Genus oder die falsche Zahl",
  preposition_case: "die Präposition mit dem falschen Kasus",
  passive_aux: "sein oder haben statt werden im Passiv",
  modal_meaning: "die Bedeutung der Modalverben verwechselt",
  modal_structure: "das Hauptverb nach dem Modalverb konjugiert",
  konjunktiv_form: "eine falsche Form des Konjunktivs II",
  comprehension_error: "eine Information im Text falsch verstanden",
  vocab_confusion: "ähnliche Wörter verwechselt",
  letter_convention: "eine falsche Anrede oder ein falscher Gruß im Brief",
  structure_error: "ein Fehler im Aufbau oder beim Konnektor",
};

/** How to fix them, in German. */
export const GERMAN_REMEDIES: Record<string, string> = {
  wrong_auxiliary: "Frag dich: Bewegt sich die Person von einem Ort zum anderen oder ändert sich ihr Zustand? Ja: sein (ist gegangen, ist aufgestanden). Nein: haben.",
  participle_form: "Regelmäßig ge…t, unregelmäßig ge…en, -ieren und be-/ver-/er- ohne ge, trennbare Verben: das Präfix vor ge.",
  verb_position: "Hauptsatz: das Verb auf Position 2 (nach deshalb oder trotzdem kommt das Subjekt danach). Nebensatz mit weil, dass, wenn, obwohl: das Verb am Ende.",
  connector_meaning: "weil und denn: Grund. deshalb: Folge. obwohl und trotzdem: Gegensatz.",
  case_confusion: "Direktes Objekt (was? wen?): Akkusativ, den und einen. Indirektes Objekt (wem?) und helfen, danken, gefallen: Dativ, dem, der, einem.",
  preposition_case: "mit, nach, bei, von, zu, aus, seit: Dativ. für, durch, gegen, ohne, um: Akkusativ. in, an, auf: wo? Dativ, wohin? Akkusativ.",
  passive_aux: "Passiv = werden: wird gebaut (Präsens), wurde gebaut (Präteritum).",
  modal_structure: "Das Modalverb ist konjugiert, das Hauptverb bleibt im Infinitiv am Ende: «Ich kann … sprechen».",
  comprehension_error: "Geh zurück in den Text: Such das Schlüsselwort der Frage und lies den ganzen Satz, bevor du antwortest.",
  letter_convention: "Freund: Lieber (maskulin) oder Liebe (feminin) … Viele Grüße. Formell: Sehr geehrter Herr oder Sehr geehrte Frau … Mit freundlichen Grüßen.",
};
