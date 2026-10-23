// The English lessons in English: what the teacher says when the student
// chooses to be taught in English (simple A2–B1 sentences). Each skill gets
// its English edition — name, explanation, worked example and discovery
// dialogue — each bank item an English prompt, and each misconception and
// remedy an English label. Attached in ./index.ts; answers never appear in
// their own hints (server/tafawoq/dialogue.test.ts).
import type { SkillEdition } from "../../curriculum";

export const ENGLISH_EDITIONS: Record<string, { title: string; skills: Record<string, SkillEdition> }> = {
  "en-tenses": {
    title: "Tenses: present perfect, past simple, past continuous, past perfect and the future",
    skills: {
      perfect_past: {
        name: "Present perfect or past simple",
        explanation:
          "The present perfect is have / has + past participle: «I have lived in Algiers since 2020». We use it for an action that started in the past and continues now, or that is connected to now, with since (a starting point: since 2020), for (a period: for three years), ever, never, already, just and yet. The past simple is for a finished action at a definite time in the past: yesterday, last year, ago, in 2010: «She went to Oran two years ago». Regular verbs take -ed (visited); learn the irregular ones: go, went, gone; see, saw, seen; write, wrote, written.",
        example: {
          problem: "Complete: «We ___ English for seven years.» (study)",
          steps: ["«For seven years» is a period that continues now: present perfect.", "With we: have.", "Study is regular: studied."],
          answer: "We have studied English for seven years.",
        },
        dialogue: {
          opening: "English has two tenses that often confuse students: the present perfect (have / has + past participle) links the past to now; the past simple is for a finished action at a definite time. Let's find the difference.",
          steps: [
            { ask: "«I ___ lived in Algiers since 2020» (I still live there). Which auxiliary goes with I?", answer: "have", hint: "With I, you, we and they, we use a different form from the one for he and she." },
            { ask: "And with she: «She ___ lived here for ten years». Which auxiliary?", answer: "has", hint: "The form for he, she and it ends in the letter s." },
            { ask: "«We have studied English ___ seven years». Seven years is a period. Which word do we use?", answer: "for", hint: "Since comes before a starting point like 2020; a period needs the other word." },
            { ask: "«She went to Oran two years ago». «Ago» shows a finished time. What is the tense of «went»?", answer: "past simple", accept: ["simple"], hint: "With yesterday, ago and last year, we use the one-word past form of the verb." },
          ],
          rule: "Present perfect = have / has + past participle: for an action connected to now or continuing until now (since + starting point, for + period, ever, never, already, just, yet). Past simple: for a finished action at a definite time (yesterday, last year, ago, in 2010).",
        },
      },
      past_narrative: {
        name: "Past continuous and past perfect in a story",
        explanation:
          "The past continuous is was / were + verb-ing: an action in progress at a moment in the past, often interrupted by a short action in the past simple: «I was watching TV when the phone rang». We use was with I, he, she, it and were with you, we, they; while comes before the action in progress. The past perfect is had + past participle: the earlier of two past actions: «When we arrived, the train had already left» (the train left first).",
        example: {
          problem: "Complete: «While they ___ in the desert, they found an old coin.» (walk)",
          steps: ["«While» introduces an action in progress: past continuous.", "With they: were.", "Walk + ing: walking."],
          answer: "While they were walking in the desert, they found an old coin.",
        },
        dialogue: {
          opening: "In a story we mix past tenses: the past continuous for an action in progress, and the past perfect for the earlier action. Let's see how we build them.",
          steps: [
            { ask: "«I ___ watching TV when the phone rang». Which past form of «be» goes with I?", answer: "was", hint: "It is the singular past form of the verb be." },
            { ask: "And with they: «They ___ walking in the desert».", answer: "were", hint: "It is the plural past form of the verb be." },
            { ask: "The past perfect is had + past participle. What is the past participle of «leave»?", answer: "left", hint: "It is irregular: its second and third forms are the same and end in t." },
            { ask: "«When we arrived, the train ___ already left». The train left first. Which auxiliary?", answer: "had", hint: "It is the past form of the verb have." },
          ],
          rule: "Past continuous = was / were + verb-ing: an action in progress in the past (often with while, interrupted by the past simple). Past perfect = had + past participle: the earlier of two past actions.",
        },
      },
      future: {
        name: "The future: will, be going to and the present continuous",
        explanation:
          "Will + base verb: a decision made at the moment of speaking, or a general prediction: «The phone is ringing. — I will answer it». Be going to + base verb: an intention decided before, or a prediction based on present evidence: «Look at those clouds! It is going to rain». The present continuous (am / is / are + verb-ing): a fixed plan or arrangement: «We are travelling to Oran tomorrow; we have bought the tickets». After will, no to, no -ing and no -s.",
        example: {
          problem: "Complete: «Look at those dark clouds! It ___ rain.»",
          steps: ["There is present evidence (the clouds): be going to.", "With it: is.", "Is going to + base verb."],
          answer: "Look at those dark clouds! It is going to rain.",
        },
        dialogue: {
          opening: "English has three common ways to talk about the future: will, be going to and the present continuous. Each one has its use.",
          steps: [
            { ask: "«Look at those clouds! It is ___ to rain». A prediction from evidence. What is the missing word?", answer: "going", hint: "It is the -ing form of the verb go." },
            { ask: "After this word there is always a small word before the verb: «It is going ___ rain». What is it?", answer: "to", hint: "The little word that comes before a verb in its infinitive form." },
            { ask: "«The phone is ringing. — I ___ answer it». A decision at the moment of speaking. What is the word?", answer: "will", hint: "A short future word followed by the base verb." },
            { ask: "A fixed plan (we bought the tickets): «We ___ travelling to Oran tomorrow». Which present form of «be» goes with we?", answer: "are", hint: "It is the plural present form of the verb be." },
          ],
          rule: "Will + base verb: a decision made now or a general prediction. Be going to + base verb: an intention or a prediction from evidence. Am / is / are + verb-ing: a fixed plan.",
        },
      },
    },
  },
  "en-grammar": {
    title: "The passive voice, reported speech and relative clauses",
    skills: {
      passive: {
        name: "The passive voice",
        explanation:
          "The passive is be (in the tense of the active sentence) + past participle. The object becomes the subject, and the doer, if we mention it, comes after by: «The Phoenicians founded the city» → «The city was founded by the Phoenicians». Tenses: present: is / are built; past: was / were built; present perfect: has / have been built; future: will be built; with a modal: can be built. «Be» agrees with the new subject: «Dates are grown in Biskra».",
        example: {
          problem: "Put into the passive: «They have built a new university.»",
          steps: ["The tense is the present perfect: has / have been + past participle.", "The new subject, a new university, is singular: has been.", "Build is irregular: built."],
          answer: "A new university has been built.",
        },
        dialogue: {
          opening: "In the passive, the object becomes the subject: «They grow dates» → «Dates are grown». Let's see how it is built.",
          steps: [
            { ask: "«They grow dates in Biskra» → «Dates ___ grown in Biskra». It is the present and «dates» is plural. Which form of «be»?", answer: "are", hint: "It is the plural present form of the verb be." },
            { ask: "What is the past participle of «build»?", answer: "built", hint: "It is an irregular verb; its past participle ends in t." },
            { ask: "«The Phoenicians founded the city» → «The city ___ founded by the Phoenicians». Past tense, singular subject.", answer: "was", hint: "It is the singular past form of the verb be." },
            { ask: "Which small word introduces the doer (the Phoenicians)?", answer: "by", hint: "A two-letter word that means «done from the side of»." },
          ],
          rule: "Passive = be (in the tense of the active sentence, agreeing with the new subject) + past participle, with the doer after by: is / are built, was / were built, has / have been built, will be built.",
        },
      },
      reported: {
        name: "Reported speech",
        explanation:
          "After a reporting verb in the past (said, told, asked), the tense goes one step back: am / is → was, are → were, present simple → past simple, present perfect and past simple → past perfect, will → would, can → could. Pronouns and time words change too: I → he / she, today → that day, tomorrow → the next day. A reported question becomes a statement (subject before verb, no do / does / did, no question mark): «Where do you live?» → «She asked me where I lived». A yes / no question is reported with if or whether.",
        example: {
          problem: "Report: «We will visit Djemila,» they said.",
          steps: ["«Said» is in the past: the tense goes one step back.", "Will → would.", "We → they."],
          answer: "They said that they would visit Djemila.",
        },
        dialogue: {
          opening: "In reported speech, after said or asked, the tense goes one step back and the pronouns change. Let's try.",
          steps: [
            { ask: "«I am tired», said Karim → «Karim said that he ___ tired». What does «am» become?", answer: "was", hint: "Take the verb be one step back into the past, singular form." },
            { ask: "«We will visit Djemila», they said → «They said that they ___ visit Djemila».", answer: "would", hint: "It is the past form of will." },
            { ask: "«Where do you live?» → «She asked me where I ___». (live)", answer: "lived", hint: "No «do» in a reported question, and the verb goes one step back." },
            { ask: "A yes / no question: «Are you ready?» → «He asked ___ I was ready». Which linking word?", answer: "if", accept: ["whether"], hint: "A very short word meaning «in case it is true that»." },
          ],
          rule: "After said / asked: am / is → was, are → were, present → past, will → would, can → could, present perfect → past perfect. A reported question is a statement without do / did; a yes / no question is reported with if or whether.",
        },
      },
      relative: {
        name: "Relative clauses",
        explanation:
          "Who for people (the man who…), which for things (the book which…), that for people and things in defining clauses only, where for places (the village where I was born), whose for possession (a historian whose books…). In a non-defining clause (between commas, extra information about a known noun) we never use that: «The pyramids, which were built about 4,500 years ago, attract many tourists».",
        example: {
          problem: "Join the sentences: «Ibn Khaldoun is a famous historian. His books are still read today.»",
          steps: ["«His books» shows possession: whose.", "Whose replaces his and is followed directly by the noun."],
          answer: "Ibn Khaldoun is a famous historian whose books are still read today.",
        },
        dialogue: {
          opening: "Relative pronouns join two sentences about the same noun. We choose the pronoun according to the noun: a person, a thing, a place or possession.",
          steps: [
            { ask: "«The man ___ discovered the cave was a shepherd». The noun is a person. Which pronoun?", answer: "who", hint: "The relative pronoun for people." },
            { ask: "«The book ___ I bought is about Carthage». The noun is a thing. Which pronoun?", answer: "which", accept: ["that"], hint: "The relative pronoun for objects and animals." },
            { ask: "«This is the village ___ I was born». The noun is a place. Which pronoun?", answer: "where", hint: "It is also the question word for places." },
            { ask: "«Ibn Khaldoun is a historian ___ books are famous» (his books). Which pronoun?", answer: "whose", hint: "The pronoun of possession; it replaces his or her." },
          ],
          rule: "Who for people, which for things, that for both in defining clauses only (never after a comma), where for places, whose + noun for possession.",
        },
      },
    },
  },
  "en-structures": {
    title: "Conditionals, wishes and regrets, and modals",
    skills: {
      conditionals: {
        name: "Conditionals",
        explanation:
          "Type 0 (a general truth): If + present, present: «If you heat ice, it melts». Type 1 (a real possibility): If + present, will + base verb: «If it rains, we will stay at home». Type 2 (an unreal situation now): If + past simple, would + base verb: «If I were rich, I would build a school» (were is preferred with every subject). Type 3 (a past that did not happen): If + past perfect, would have + past participle: «If he had revised, he would have passed». Never put will or would right after if.",
        example: {
          problem: "Complete: «If I had more time, I ___ more books.» (read)",
          steps: ["If + past simple (had): type 2.", "The result of type 2: would + base verb."],
          answer: "If I had more time, I would read more books.",
        },
        dialogue: {
          opening: "English conditionals have types, and each type has two fixed tenses: one after if and one in the result.",
          steps: [
            { ask: "Type 1 (a real possibility): «If it rains, we ___ stay at home». What comes before «stay»?", answer: "will", hint: "The simple future word." },
            { ask: "Type 2 (an unreal situation): «If I were rich, I ___ build a school».", answer: "would", hint: "The past form of the simple future word." },
            { ask: "In type 2, which form of «be» is preferred with I after if? «If I ___ rich…»", answer: "were", accept: ["was"], hint: "A past form of be; the preferred one here is the plural form, for every subject." },
            { ask: "Type 3 (a past that did not happen): «If he had revised, he would ___ passed».", answer: "have", hint: "The auxiliary before a past participle, in its base form." },
          ],
          rule: "Type 0: If + present, present. Type 1: If + present, will + verb. Type 2: If + past (were), would + verb. Type 3: If + past perfect, would have + past participle. No will or would after if.",
        },
      },
      wishes: {
        name: "Wishes and regrets: I wish / If only",
        explanation:
          "To wish that the present were different: I wish / If only + past simple: «I don't have a car» → «I wish I had a car»; can → could: «I wish I could swim»; be → were. To regret the past: I wish / If only + past perfect: «I didn't revise» → «If only I had revised». So we always go one step back into the past, and we don't use will after I wish to express regret.",
        example: {
          problem: "Express regret: «I didn't listen to my teacher.» → «I wish …»",
          steps: ["A regret about a past action: past perfect.", "Had + listened."],
          answer: "I wish I had listened to my teacher.",
        },
        dialogue: {
          opening: "After I wish and If only, we always go one step back into the past: the past simple for the present, the past perfect for a regret about the past.",
          steps: [
            { ask: "«I don't have a car» → «I wish I ___ a car».", answer: "had", hint: "It is the past form of the verb have." },
            { ask: "«I can't swim» → «I wish I ___ swim».", answer: "could", hint: "It is the past form of can." },
            { ask: "«I am not tall» → «I wish I ___ taller».", answer: "were", accept: ["was"], hint: "A past form of be; the preferred one is the plural form." },
            { ask: "A regret: «I didn't revise» → «If only I ___ revised».", answer: "had", hint: "Past perfect = the past form of have + past participle." },
          ],
          rule: "I wish / If only + past simple (had, could, were) for a wish about the present; I wish / If only + past perfect (had revised) for a regret about the past.",
        },
      },
      modals: {
        name: "Modals: obligation, advice and deduction",
        explanation:
          "After a modal, the verb is in its base form, without to and without -s. Obligation: must (from the speaker), have to (from outside: a law, a rule), with he / she: has to. Prohibition: mustn't. No obligation: don't have to (it is not necessary). Advice: should / shouldn't. Possibility: might / may. Deduction: must = I am sure it is true («The lights are off. They must be out»); can't = I am sure it is impossible («He can't be in Paris; I saw him here an hour ago»).",
        example: {
          problem: "Complete: «You look tired. You ___ go to bed early.»",
          steps: ["The sentence gives advice: should.", "After should, the base verb: go."],
          answer: "You look tired. You should go to bed early.",
        },
        dialogue: {
          opening: "Modals show the speaker's attitude: obligation, advice or deduction. After them, the verb is always in its base form.",
          steps: [
            { ask: "Advice to a sick friend: «You ___ see a doctor».", answer: "should", hint: "The modal that means «it is a good idea to»." },
            { ask: "A sure deduction: «The lights are off. They ___ be out».", answer: "must", hint: "The modal that means «I am sure that»." },
            { ask: "An impossible deduction: «He ___ be in Paris; I saw him here an hour ago».", answer: "can't", accept: ["cannot", "cant", "can not"], hint: "The short negative of the modal of ability." },
            { ask: "No obligation: «Tomorrow is a holiday. You don't ___ to wake up early».", answer: "have", hint: "The verb that means «to own», in its base form." },
          ],
          rule: "Should = advice, must / have to = obligation, mustn't = prohibition, don't have to = not necessary, might = possibility, must = sure deduction, can't = impossible deduction. After a modal: base verb without to.",
        },
      },
    },
  },
  "en-linking": {
    title: "Linking words, word formation and the pronunciation of -ed and -s",
    skills: {
      linkers: {
        name: "Linking words",
        explanation:
          "Cause: because, since, as + clause (subject and verb), and because of / due to + noun: «He failed because of his laziness». Result: so, therefore, as a result, consequently. Contrast: although / even though + clause, despite / in spite of + noun, however at the start of a sentence followed by a comma, whereas / while to compare two things. Addition: moreover, furthermore, in addition, besides. First find the relation between the two ideas, then check what follows the linker: a clause or a noun.",
        example: {
          problem: "Join the sentences: «It was raining. They went out.» (contrast)",
          steps: ["The relation is contrast.", "Although + a full clause."],
          answer: "Although it was raining, they went out.",
        },
        dialogue: {
          opening: "Linking words show the relation between two ideas: cause, result, contrast or addition. Let's find the most important ones.",
          steps: [
            { ask: "Cause: «She stayed at home ___ she was ill».", answer: "because", accept: ["since"], hint: "The most common linker of cause; a question with why is often answered with it." },
            { ask: "Contrast at the start of a new sentence: «It was raining. ___, they went out».", answer: "however", accept: ["nevertheless"], hint: "A contrast linker followed by a comma, meaning «but still»." },
            { ask: "Result: «Pollution is increasing; ___, many species are disappearing».", answer: "therefore", accept: ["as a result", "consequently"], hint: "A formal linker meaning «for this reason, so»." },
            { ask: "Adding a new idea: «___, advertising can be dishonest».", answer: "moreover", accept: ["furthermore", "in addition", "besides"], hint: "A formal linker meaning «and also»." },
          ],
          rule: "Cause: because, since, as (+ clause), because of (+ noun). Result: so, therefore, as a result. Contrast: although (+ clause), despite (+ noun), however, whereas. Addition: moreover, furthermore, in addition.",
        },
      },
      word_formation: {
        name: "Word formation",
        explanation:
          "Prefixes give the opposite: un- (happy → unhappy), dis- (honest → dishonest), im- before p and m (possible → impossible, mature → immature), in- (correct → incorrect), ir- before r and il- before l (regular → irregular, legal → illegal). Suffixes change the type of word: nouns with -ment (develop → development), -tion (construct → construction), -ness (happy → happiness); adjectives with -ful (care → careful, with care) and -less (care → careless, without care). Choose the form from its place in the sentence: after the, a noun; before a noun, an adjective.",
        example: {
          problem: "Complete with the right form: «The ___ of the pyramids took many years.» (construct)",
          steps: ["After «the» and before «of» we need a noun.", "Construct + -tion."],
          answer: "The construction of the pyramids took many years.",
        },
        dialogue: {
          opening: "We make new words with a prefix (it changes the meaning) or a suffix (it changes the type of word).",
          steps: [
            { ask: "What is the opposite of «honest»?", answer: "dishonest", hint: "A negative prefix of three letters starting with d." },
            { ask: "What is the opposite of «possible»?", answer: "impossible", hint: "Before the letter p, the prefix in- changes its form." },
            { ask: "What is the noun from the verb «develop»?", answer: "development", hint: "A noun suffix of four letters starting with m." },
            { ask: "What is the adjective from «care» that means «paying attention»?", answer: "careful", hint: "The suffix that means «full of», the opposite of -less." },
          ],
          rule: "Opposites with prefixes: un-, dis-, im- (before p and m), in-, ir-, il-. Nouns with suffixes: -ment, -tion, -ness. Adjectives: -ful (with) and -less (without).",
        },
      },
      pronunciation: {
        name: "Pronouncing final -ed and -s",
        explanation:
          "-ed is pronounced /ɪd/ after the sounds /t/ and /d/ (wanted, needed, visited), /t/ after the voiceless sounds /p/ /k/ /f/ /s/ /ʃ/ /tʃ/ (stopped, looked, laughed, washed, watched), and /d/ after the other voiced sounds and vowels (played, lived, cleaned). -s is pronounced /ɪz/ after /s/ /z/ /ʃ/ /tʃ/ /dʒ/ (boxes, watches, pages), /s/ after /p/ /t/ /k/ /f/ (maps, books), and /z/ after the other sounds (dogs, pens, cars). What counts is the last sound, not the written letter: «laughed» ends in the sound /f/, so -ed is /t/.",
        example: {
          problem: "Classify by the sound of -ed: wanted, stopped, played",
          steps: ["Wanted: the verb ends in /t/, so /ɪd/.", "Stopped: /p/ is voiceless, so /t/.", "Played: a vowel sound, so /d/."],
          answer: "wanted /ɪd/, stopped /t/, played /d/",
        },
        dialogue: {
          opening: "The pronunciation of final -ed and -s depends on the last sound before them, not on the written letter.",
          steps: [
            { ask: "After the sounds /t/ and /d/ (want, need), -ed is a full extra syllable. Write it in Latin letters.", answer: "id", accept: ["ɪd"], hint: "A short vowel sound followed by the sound of the letter d." },
            { ask: "In which verb is -ed pronounced /t/: «played» or «washed»?", answer: "washed", hint: "Look for the verb that ends in a voiceless sound (sh)." },
            { ask: "After /s/ /z/ /ʃ/ /tʃ/ (box, watch), -s is a full extra syllable. Write it in Latin letters.", answer: "iz", accept: ["ɪz"], hint: "A short vowel sound followed by the sound of the letter z." },
            { ask: "In which word is -s pronounced /z/: «books» or «dogs»?", answer: "dogs", hint: "After a voiced sound like /g/, the -s is voiced too." },
          ],
          rule: "-ed: /ɪd/ after /t/ and /d/; /t/ after voiceless sounds (p, k, f, s, sh, ch); /d/ after the others. -s: /ɪz/ after /s/ /z/ /ʃ/ /tʃ/ /dʒ/; /s/ after /p/ /t/ /k/ /f/; /z/ after the others.",
        },
      },
    },
  },
  "en-text": {
    title: "Reading comprehension, vocabulary and written expression",
    skills: {
      comprehension: {
        name: "Reading comprehension",
        explanation:
          "Read the question first and find the question word: Who, What, Where, When, Why (the answer often starts with Because…), How. Find the sentence in the text that contains the information, then answer with a full sentence. For «What does … refer to?», look for the noun before the pronoun (it, they, which…) in the text. For true or false statements, correct the false ones with a sentence from the text.",
        example: {
          problem: "Text: «Lina stayed at home because she was ill.» — Why did Lina stay at home?",
          steps: ["Why asks for a reason.", "The reason comes after because: she was ill."],
          answer: "Because she was ill.",
        },
        dialogue: {
          opening: "To understand a text: read the question first, find the question word, then look for the sentence in the text that contains the answer.",
          steps: [
            { ask: "Which question word asks about a place?", answer: "where", hint: "It starts with wh and asks for a location." },
            { ask: "And which question word asks for a reason?", answer: "why", hint: "It starts with wh; the answer often begins with «Because»." },
            { ask: "Which word usually begins the answer to a question about a reason?", answer: "because", hint: "The linking word of cause, used for a reason." },
            { ask: "«Timgad is in the Aurès. It was founded by Trajan». What does «It» refer to?", answer: "timgad", hint: "Look for the name of the thing that was founded, not the mountains." },
          ],
          rule: "Find the question word (Who, What, Where, When, Why, How), look for the right sentence in the text, and answer with a full sentence (Why → Because…). A pronoun refers to a noun before it.",
        },
      },
      vocabulary: {
        name: "Vocabulary by theme",
        explanation:
          "BAC vocabulary follows themes: ancient civilisations (ancient, civilisation, ruins, heritage, archaeologist), ethics in business (ethics, honest, corruption, fair trade), education (education, school, learner, degree), advertising and consumers (advertisement, consumer, brand, product, safety), astronomy (planet, star, the solar system, astronaut). Questions ask for synonyms (begin = start) and opposites (ancient ↔ modern, honest ↔ dishonest).",
        example: {
          problem: "What is the opposite of «ancient»?",
          steps: ["Ancient means very old.", "The opposite: modern."],
          answer: "modern",
        },
        dialogue: {
          opening: "BAC vocabulary questions usually ask for a synonym, an opposite, or a word from the theme of the unit.",
          steps: [
            { ask: "What is the opposite of «ancient»?", answer: "modern", hint: "A word that means new and of our time." },
            { ask: "What is a synonym of «begin»?", answer: "start", hint: "A five-letter verb beginning with s." },
            { ask: "What does «heritage» mean in Arabic?", answer: "التراث", accept: ["تراث"], hint: "What we receive from our ancestors: monuments, customs and traditions." },
            { ask: "Which word does not belong to the theme of advertising: consumer, brand, planet, advertisement?", answer: "planet", hint: "It is a word from astronomy." },
          ],
          rule: "Learn vocabulary by theme (civilisations, ethics, education, advertising, astronomy) with synonyms and opposites: ancient ↔ modern, begin = start, honest ↔ dishonest.",
        },
      },
      writing: {
        name: "Written expression: the formal letter and the essay",
        explanation:
          "A formal letter: your address and the date, then the greeting: «Dear Sir or Madam,» if you don't know the name, ending with «Yours faithfully,»; or «Dear Mr Benali,» / «Dear Mrs Benali,» if you know the name, ending with «Yours sincerely,», then your full name. An essay or paragraph: introduction (present the topic with a topic sentence), body (ideas with examples and linkers: first, moreover, however, therefore), conclusion (sum up and give your opinion: to sum up, in conclusion).",
        example: {
          problem: "Write the greeting and the ending of a formal letter to a company manager whose name you don't know.",
          steps: ["Name unknown: Dear Sir or Madam,", "Its ending: Yours faithfully,"],
          answer: "Dear Sir or Madam, … Yours faithfully,",
        },
        dialogue: {
          opening: "A formal letter has fixed rules for the greeting and the ending, and an essay has a fixed plan in three parts.",
          steps: [
            { ask: "You don't know the name of the person: «Dear Sir or ___,». What is the missing word?", answer: "madam", hint: "A polite word for a woman." },
            { ask: "This letter ends with «Yours ___,».", answer: "faithfully", hint: "The ending used when the greeting has no name." },
            { ask: "If you begin with «Dear Mr Benali,», you end with «Yours ___,».", answer: "sincerely", hint: "The other ending, used when you know the name." },
            { ask: "The parts of an essay: introduction, body and…?", answer: "conclusion", hint: "The last part, which sums up and gives your opinion." },
          ],
          rule: "Dear Sir or Madam → Yours faithfully; Dear Mr / Mrs + name → Yours sincerely. An essay: introduction, then body, then conclusion.",
        },
      },
    },
  },
};

/** Every bank item's prompt, in English. */
export const ENGLISH_PROMPTS: Record<string, string> = {
  "en-ten-1": "Complete: «I ___ in Algiers since 2020.» (live)",
  "en-ten-2": "Complete: «She ___ to Tamanrasset last year.» (go)",
  "en-ten-3": "Complete: «We have studied English ___ seven years.»",
  "en-ten-4": "Complete: «The students ___ the ruins of Djemila two weeks ago.» (visit)",
  "en-ten-5": "Complete: «I ___ TV when the phone rang.» (watch)",
  "en-ten-6": "Complete: «When we arrived at the station, the train ___.» (already, leave)",
  "en-ten-7": "Complete: «While they ___ in the desert, they found an old coin.» (walk)",
  "en-ten-8": "Complete: «After the Romans ___ the city, they built a theatre.» (found)",
  "en-ten-9": "Complete: «Look at those dark clouds! It ___ rain.»",
  "en-ten-10": "«The phone is ringing.» Complete the answer with a decision made now: «I ___ answer it.»",
  "en-ten-11": "Complete (the tickets are bought): «We ___ to Oran tomorrow.» (travel)",
  "en-ten-12": "Which sentence is correct for a meeting already arranged with your friend?",
  "en-gra-1": "Put into the passive: «They grow dates in Biskra.» → «Dates ___ in Biskra.»",
  "en-gra-2": "Put into the passive: «The Phoenicians founded the city.» → «The city ___ by the Phoenicians.»",
  "en-gra-3": "Put into the passive: «They have built a new university.» → «A new university ___.»",
  "en-gra-4": "Put into the passive: «They will open the museum next month.» → «The museum ___ next month.»",
  "en-gra-5": "«I am tired,» said Karim. → «Karim said that he ___ tired.»",
  "en-gra-6": "«We will visit Djemila,» they said. → «They said that they ___ Djemila.»",
  "en-gra-7": "«Where do you live?» she asked me. → «She asked me where ___.»",
  "en-gra-8": "«Have you finished your project?» the teacher asked me. → «The teacher asked me if I ___ my project.»",
  "en-gra-9": "Complete: «The man ___ discovered the cave was a shepherd.»",
  "en-gra-10": "Complete: «This is the village ___ my grandfather was born.»",
  "en-gra-11": "Complete: «Ibn Khaldoun is a historian ___ books are still read today.»",
  "en-gra-12": "Complete: «The pyramids, ___ were built about 4,500 years ago, attract many tourists.»",
  "en-str-1": "Complete: «If it rains, we ___ at home.» (stay)",
  "en-str-2": "Complete: «If I ___ rich, I would build a school in my village.» (be)",
  "en-str-3": "A scientific fact: «If you heat ice, it ___.» (melt)",
  "en-str-4": "Complete: «If he had revised, he ___ the exam.» (pass)",
  "en-str-5": "«I don't have a car.» → «I wish I ___ a car.»",
  "en-str-6": "«I didn't listen to my teacher.» → «If only I ___ to her.»",
  "en-str-7": "«I can't swim.» → «I wish I ___ swim.»",
  "en-str-8": "Which sentence expresses a regret about the past?",
  "en-str-9": "Advice: «You look tired. You ___ go to bed early.»",
  "en-str-10": "An obligation from the law: «In Algeria, drivers ___ wear a seat belt.»",
  "en-str-11": "«Tomorrow is a holiday. You ___ wake up early.» (it is not necessary)",
  "en-str-12": "«The lights are off and nobody answers the door. They ___ be out.»",
  "en-str-13": "«He ___ be in Paris; I saw him in Algiers an hour ago.»",
  "en-lnk-1": "Complete: «She stayed at home ___ she was ill.»",
  "en-lnk-2": "Complete: «___ it was raining, they went out.»",
  "en-lnk-3": "Complete: «Pollution is increasing. ___, many species are disappearing.»",
  "en-lnk-4": "Which sentence is correct?",
  "en-lnk-5": "What is the opposite of «honest»?",
  "en-lnk-6": "Complete: «The ___ of the pyramids took many years.» (construct)",
  "en-lnk-7": "What is the opposite of «possible»?",
  "en-lnk-8": "Complete: «Money doesn't always bring ___.» (happy)",
  "en-lnk-9": "In which word is the final -ed pronounced /ɪd/?",
  "en-lnk-10": "In which word is the final -ed pronounced /t/?",
  "en-lnk-11": "In which word is the final -s pronounced /ɪz/?",
  "en-lnk-12": "Which word has a different final -ed sound from the others?",
  "en-lnk-13": "In which word is the final -s pronounced /s/?",
  "en-txt-1": "According to the text: «Where is Timgad?»",
  "en-txt-2": "In the second sentence, «It was founded by the Emperor Trajan», what does «It» refer to?",
  "en-txt-3": "According to the text: «Why must visitors respect the site?»",
  "en-txt-4": "Which statement is true according to the text?",
  "en-txt-5": "What is the opposite of «ancient»?",
  "en-txt-6": "What does «heritage» mean in Arabic?",
  "en-txt-7": "What is a synonym of «build»?",
  "en-txt-8": "Which word does not belong to the theme «Advertising, consumers and safety»?",
  "en-txt-9": "How do you begin a formal letter to a person whose name you don't know?",
  "en-txt-10": "You began your letter with «Dear Sir or Madam,». How do you end it?",
  "en-txt-11": "You began your letter with «Dear Mr Benali,». How do you end it?",
  "en-txt-12": "What is the correct order of the parts of an essay?",
  "en-txt-13": "Which phrase begins the conclusion?",
};

/** Every misconception of the English lessons, in English. */
export const ENGLISH_MISCONCEPTIONS: Record<string, string> = {
  tense_confusion: "Confusing the tenses",
  time_marker: "Ignoring the time markers (since, for, ago, yesterday, while)",
  participle_form: "Wrong past participle, or the base verb instead of it",
  auxiliary_error: "The auxiliary does not agree with the subject (have / has, was / were, is / are)",
  future_form: "Wrong form of the future",
  passive_form: "Wrong passive form (be is missing or does not agree with the subject)",
  passive_tense: "Changing the tense when turning the sentence into the passive",
  reported_tense: "Not moving the tense back in reported speech",
  reported_order: "Keeping the question word order (do / did, verb before subject) in a reported question",
  reported_pronoun: "Not changing the pronoun in reported speech",
  relative_choice: "A relative pronoun that does not fit the noun (person, thing, place), or that after a comma",
  whose_confusion: "Confusing whose (possession) and who",
  conditional_tense: "A tense that does not fit the type of conditional",
  if_will: "Putting will or would right after if",
  wish_tense: "Wrong tense after I wish / If only (not going back into the past)",
  modal_meaning: "Confusing the meanings of modals (obligation, prohibition, no obligation, advice, deduction)",
  modal_form: "Wrong form after a modal (to, -s or -ed after it, or have to not agreeing with the subject)",
  connector_meaning: "A linking word that does not fit the relation between the ideas (cause, result, contrast, addition)",
  connector_grammar: "A linking word that does not fit what follows it (a clause or a noun) or its place in the sentence",
  prefix_error: "Wrong negative prefix",
  suffix_error: "A suffix or word type that does not fit its place in the sentence",
  ed_sound: "Wrong pronunciation of the final -ed",
  s_sound: "Wrong pronunciation of the final -s",
  comprehension_error: "Information in the text misunderstood",
  reference_error: "Wrong noun for the pronoun's reference",
  vocab_confusion: "Confusing words with a similar form or meaning",
  letter_convention: "Wrong greeting or ending in the letter",
  structure_error: "Wrong essay structure or wrong expression",
};

/** The remedies of the English lessons, in English. */
export const ENGLISH_REMEDIES: Record<string, string> = {
  tense_confusion: "Ask yourself: is the action finished at a definite time (yesterday, ago)? Past simple. Does it continue until now (since, for)? Present perfect. Is it the earlier of two past actions? Past perfect.",
  time_marker: "Since + a starting point (since 2020), for + a period (for two years); ago, yesterday and last year go only with the past simple.",
  future_form: "Will + base verb (will go); am / is / are going to + base verb; am / is / are + verb-ing for a fixed plan.",
  passive_form: "Passive = be (agreeing with the new subject, in the tense of the active sentence) + past participle: is built, were built, has been built, will be built.",
  reported_tense: "After said / asked in the past, go one step back: is → was, do → did, will → would, have done → had done.",
  reported_order: "A reported question is a statement: question word (or if) + subject + verb, with no do / does / did and no question mark.",
  relative_choice: "A person → who, a thing → which, a place → where, possession → whose; never that after a comma.",
  conditional_tense: "Type 1: present → will + verb. Type 2: past → would + verb. Type 3: past perfect → would have + past participle.",
  wish_tense: "I wish about the present → past simple (had, could, were); I wish about the past → past perfect (had done).",
  modal_meaning: "Mustn't = it is forbidden, don't have to = it is not necessary, should = advice, must = sure deduction, can't = impossible deduction.",
  connector_grammar: "Because / although + clause (subject and verb); because of / despite + noun; however and therefore start a new sentence, followed by a comma.",
  prefix_error: "Im- before p and m, ir- before r, il- before l; dis- with honest, agree and appear; un- with happy, known and able.",
  ed_sound: "Look at the last sound before -ed: /t/ or /d/ → /ɪd/; a voiceless sound (p, k, f, s, sh, ch) → /t/; any other sound → /d/.",
  comprehension_error: "Go back to the text: find the key word of the question, then read the whole sentence before you answer.",
  reference_error: "A pronoun refers to a noun before it: put the noun in place of the pronoun and check that the sentence still makes sense.",
  letter_convention: "Dear Sir or Madam → Yours faithfully; Dear Mr / Mrs + name → Yours sincerely; Love and See you soon are only for friends.",
};
