// The Italian lessons in Italian: what the teacher says when the student
// chooses "Italiano" (the teacher speaks Italian, simple A2–B1 sentences).
// Each skill gets its Italian edition — name, explanation, worked example
// and discovery dialogue — each bank item an Italian prompt (oral quiz),
// and each misconception / remedy its Italian label. Attached in
// ./index.ts; answers never appear in their own hints
// (server/tafawoq/dialogue.test.ts).
import type { SkillEdition } from "../../curriculum";

export const ITALIAN_EDITIONS: Record<string, { title: string; skills: Record<string, SkillEdition> }> = {
  "it-tenses": {
    title: "I tempi: passato prossimo, imperfetto e futuro",
    skills: {
      passato_prossimo: {
        name: "Il passato prossimo: avere o essere?",
        explanation:
          "Il passato prossimo ha due parti: un verbo ausiliare (avere o essere) e il participio passato: «Ho mangiato una pizza». Usiamo essere con i verbi di movimento (andare, venire, partire, arrivare, tornare), con i verbi di cambiamento (nascere, diventare, morire), con essere, stare, restare e con i verbi riflessivi (alzarsi, svegliarsi). Tutti gli altri verbi prendono avere. Con essere il participio si accorda con il soggetto: «Amina è andata», «I ragazzi sono partiti».",
        example: {
          problem: "Completa: «Amina ___ a Orano.» (andare)",
          steps: ["andare è un verbo di movimento: ausiliare essere.", "essere con lei: è.", "Il soggetto è femminile singolare: andata."],
          answer: "Amina è andata a Orano.",
        },
        dialogue: {
          opening: "Nel passato prossimo diciamo: «Ho mangiato una pizza». Ci sono due parti: un ausiliare e il participio passato.",
          steps: [
            { ask: "Nella frase «Ho mangiato una pizza» l'ausiliare è ho. Di quale verbo è: avere o essere?", answer: "avere", hint: "ho viene dal verbo del possesso, come in «ho un libro»." },
            { ask: "E qui: «Sono andato a Orano». Qual è l'ausiliare?", answer: "sono", hint: "È la prima parola della frase, coniugata con io." },
            { ask: "andare è un verbo di movimento. I verbi di movimento prendono avere o essere?", answer: "essere", hint: "Pensa all'ausiliare della frase con andato." },
            { ask: "Con questo ausiliare il participio si accorda: «Amina è ___ a Tlemcen». (andare)", answer: "andata", hint: "Il soggetto è femminile singolare: cambia la vocale finale di andato." },
          ],
          rule: "Passato prossimo = avere o essere + participio passato. essere: verbi di movimento e di cambiamento, verbi riflessivi (andare, partire, nascere, alzarsi), con accordo del participio (andato, andata, andati, andate). avere: tutti gli altri verbi.",
        },
      },
      participio: {
        name: "Il participio passato",
        explanation:
          "Verbi regolari: -are diventa -ato (parlare: parlato), -ere diventa -uto (avere: avuto, ricevere: ricevuto), -ire diventa -ito (dormire: dormito, finire: finito). Participi irregolari importanti: fare: fatto, dire: detto, scrivere: scritto, leggere: letto, vedere: visto, prendere: preso, mettere: messo, venire: venuto, essere: stato, aprire: aperto.",
        example: {
          problem: "Qual è il participio passato di «scrivere»?",
          steps: ["scrivere è irregolare.", "Non diciamo scrivuto.", "La forma giusta è scritto."],
          answer: "scritto",
        },
        dialogue: {
          opening: "Il participio passato viene dopo l'ausiliare. Per i verbi regolari ci sono solo tre modelli; alcuni verbi irregolari vanno imparati a memoria.",
          steps: [
            { ask: "Guarda: «parlare: parlato» e «mangiare: mangiato». Qual è il participio di comprare?", answer: "comprato", hint: "Togli -are e metti la stessa fine dei due esempi." },
            { ask: "«avere: avuto» e «vendere: venduto». Qual è il participio di ricevere?", answer: "ricevuto", hint: "Verbi in -ere: togli -ere e metti la fine di avuto." },
            { ask: "«dormire: dormito». Qual è il participio di finire?", answer: "finito", hint: "Verbi in -ire: togli -ire e metti la fine di dormito." },
            { ask: "Alcuni sono irregolari: «fare: fatto», «dire: detto». Qual è il participio di scrivere?", answer: "scritto", hint: "Come fatto e detto, finisce in -tto e perde la v." },
          ],
          rule: "Participio passato: -are: -ato (parlato), -ere: -uto (ricevuto), -ire: -ito (finito). Irregolari: fatto, detto, scritto, letto, visto, preso, messo, venuto, stato.",
        },
      },
      imperfetto_futuro: {
        name: "Imperfetto o passato prossimo? E il futuro semplice",
        explanation:
          "L'imperfetto descrive e racconta le abitudini del passato: radice + -avo, -evo, -ivo (io parlavo, lui leggeva, noi dormivamo); essere è irregolare: ero, eri, era, eravamo. Usiamo l'imperfetto per le abitudini («Da bambino giocavo a calcio»), le descrizioni e le azioni in corso («Mentre studiavo…»), il passato prossimo per un fatto preciso e finito («… è arrivato mio fratello»). Il futuro semplice: -are e -ere: -erò (parlerò, leggerò), -ire: -irò (dormirò); irregolari: sarò, avrò, andrò, farò.",
        example: {
          problem: "Completa: «Da bambino, Karim ___ a calcio ogni giorno.» (giocare)",
          steps: ["ogni giorno indica un'abitudine nel passato: imperfetto.", "Radice gioc + -ava con lui."],
          answer: "Da bambino, Karim giocava a calcio ogni giorno.",
        },
        dialogue: {
          opening: "In italiano ci sono due tempi per il passato: l'imperfetto per le abitudini e le descrizioni («Da bambino giocavo a calcio») e il passato prossimo per un fatto finito. Per il futuro usiamo il futuro semplice.",
          steps: [
            { ask: "Imperfetto: «parlare: io parlavo, lui parlava». Coniuga giocare con lui all'imperfetto.", answer: "giocava", hint: "Radice gioc + la stessa fine di parlava." },
            { ask: "essere è irregolare all'imperfetto: io ero. E con lui?", answer: "era", hint: "Cambia l'ultima lettera di ero in a." },
            { ask: "«Ogni estate andavamo al mare»: un'abitudine. Come si chiama questo tempo?", answer: "imperfetto", hint: "È lo stesso tempo di parlavo, il tempo delle abitudini nel passato." },
            { ask: "Il futuro: «parlare: io parlerò». Coniuga studiare con io al futuro.", answer: "studierò", accept: ["studiero"], hint: "Radice studi + la stessa fine di parlerò (la a diventa e)." },
          ],
          rule: "Imperfetto (parlavo, leggeva, dormivamo; essere: ero, era): abitudini, descrizioni, azioni in corso. Passato prossimo: un fatto preciso e finito. Futuro semplice: -erò / -irò (parlerò, dormirò); irregolari: sarò, avrò, andrò, farò.",
        },
      },
    },
  },
  "it-articles": {
    title: "Articoli, preposizioni articolate e plurale",
    skills: {
      articles: {
        name: "Gli articoli determinativi e indeterminativi",
        explanation:
          "L'articolo cambia secondo il genere, il numero e la prima lettera del nome. Maschile: il davanti a consonante (il libro), lo davanti a s + consonante, z, gn, ps (lo studente, lo zaino), l' davanti a vocale (l'amico); plurale: i (i libri) e gli (gli studenti, gli amici). Femminile: la (la casa), l' davanti a vocale (l'amica); plurale: le (le case, le amiche). Indeterminativi: un (un libro, un amico), uno (uno studente), una (una casa), un' davanti a femminile con vocale (un'amica).",
        example: {
          problem: "Metti l'articolo determinativo: «___ zaino».",
          steps: ["zaino è maschile singolare.", "Comincia con z.", "Quindi l'articolo è lo."],
          answer: "lo zaino",
        },
        dialogue: {
          opening: "In italiano l'articolo cambia secondo il genere, il numero e la prima lettera del nome: il libro, lo zaino, l'amico, la casa.",
          steps: [
            { ask: "«il libro», «il ragazzo». Ma davanti a s + consonante o z usiamo lo: «lo zaino». Metti l'articolo: «___ studente» (scrivi articolo e nome).", answer: "lo studente", hint: "Come zaino, perché questa parola comincia con s + consonante." },
            { ask: "Il plurale di il è i (i libri). Qual è il plurale di «lo studente»?", answer: "gli studenti", hint: "Il plurale di lo è un articolo di tre lettere che comincia con g; il nome finisce in -i." },
            { ask: "Articolo indeterminativo: «un libro», «uno zaino». Quale articolo indeterminativo va con un nome femminile che comincia con consonante: «___ casa»?", answer: "una", hint: "È il femminile di un: aggiungi la vocale femminile alla fine." },
            { ask: "Davanti a un nome femminile con vocale togliamo una lettera e mettiamo l'apostrofo: «___ amica»?", answer: "un'amica", hint: "Come l'amica: togli l'ultima lettera dell'articolo femminile e metti l'apostrofo." },
          ],
          rule: "Maschile: il (il libro), lo davanti a s + consonante e z (lo studente), l' davanti a vocale; plurale i e gli. Femminile: la, l' davanti a vocale; plurale le. Indeterminativi: un, uno, una, un'.",
        },
      },
      prepositions: {
        name: "Le preposizioni articolate",
        explanation:
          "Le preposizioni di, a, da, in, su si uniscono all'articolo: di + il = del, a + il = al, da + il = dal, in + il = nel, su + il = sul. Con lo, la e l' raddoppiamo la l: dello, allo, nella, sulla, dall'. Al plurale: dei, ai, dai, nei, sui (con i), degli, agli, negli (con gli), delle, alle, nelle (con le). La preposizione in diventa ne-.",
        example: {
          problem: "Completa: «Il libro è ___ tavolo.» (su + il)",
          steps: ["su e il si uniscono.", "Il risultato è sul."],
          answer: "Il libro è sul tavolo.",
        },
        dialogue: {
          opening: "Le preposizioni di, a, da, in, su si uniscono all'articolo in una sola parola: di + il = del, in + la = nella, su + il = sul.",
          steps: [
            { ask: "«Vado ___ cinema» (a + il). Scrivi la preposizione articolata con cinema.", answer: "al cinema", hint: "Unisci preposizione e articolo come in di + il = del, poi scrivi il nome." },
            { ask: "in + il = nel. E in + la?", answer: "nella", hint: "Comincia con ne, raddoppia la l e aggiungi la vocale femminile." },
            { ask: "Davanti a lo raddoppiamo la l: di + lo = dello. E su + lo?", answer: "sullo", hint: "Comincia con su e aggiungi quello che abbiamo aggiunto a de in dello." },
            { ask: "Al plurale: da + gli = dagli. E a + gli?", answer: "agli", hint: "Metti la preposizione a davanti all'articolo gli, senza spazio." },
          ],
          rule: "Preposizione + articolo = una parola: del, al, dal, nel, sul (con il); dello, allo, nella, sulla (con lo e la, doppia l); dei, ai, nei, sui (con i); degli, agli, negli (con gli); delle, alle, nelle (con le). in diventa ne-.",
        },
      },
      plurals: {
        name: "Il plurale dei nomi e degli aggettivi",
        explanation:
          "Maschile in -o: -i (il ragazzo: i ragazzi). Femminile in -a: -e (la ragazza: le ragazze). Nomi in -e: -i (il padre: i padri, la lezione: le lezioni). I nomi con l'accento finale non cambiano (la città: le città, l'università: le università). -co / -ca: l'amico: gli amici, ma l'amica: le amiche, simpatica: simpatiche. L'aggettivo si accorda con il nome: «le ragazze italiane».",
        example: {
          problem: "Qual è il plurale di «la lezione difficile»?",
          steps: ["lezione è femminile in -e: lezioni.", "difficile finisce in -e: difficili.", "Articolo femminile plurale: le."],
          answer: "le lezioni difficili",
        },
        dialogue: {
          opening: "In italiano il plurale cambia la fine del nome e dell'aggettivo: -o diventa -i, -a diventa -e, -e diventa -i.",
          steps: [
            { ask: "«il libro: i libri». Qual è il plurale di «il quaderno»?", answer: "quaderni", hint: "Cambia la -o finale con la vocale di libri." },
            { ask: "«la casa: le case». Qual è il plurale di «la ragazza»?", answer: "ragazze", hint: "Cambia la -a finale con la vocale di case." },
            { ask: "Nomi in -e: «il padre: i padri», «la chiave: le chiavi». Qual è il plurale di «la lezione»?", answer: "lezioni", hint: "Come chiavi: la e finale cambia in i, l'articolo resta femminile." },
            { ask: "L'aggettivo segue il nome: «la ragazza simpatica», «le ragazze ___»?", answer: "simpatiche", hint: "-ca diventa -che al femminile plurale, per tenere il suono duro." },
          ],
          rule: "Plurale: -o: -i, -a: -e, -e: -i; -ca: -che; i nomi con l'accento finale non cambiano (le città). L'aggettivo si accorda con il nome nel genere e nel numero.",
        },
      },
    },
  },
  "it-verbs": {
    title: "I modi: congiuntivo, condizionale e periodo ipotetico",
    skills: {
      congiuntivo: {
        name: "Il congiuntivo presente",
        explanation:
          "Usiamo il congiuntivo dopo i verbi di opinione (penso che, credo che), di desiderio (voglio che, spero che), dopo è importante che, è necessario che e dopo benché e affinché. Verbi regolari: -are: -i (che io parli, che loro parlino), -ere e -ire: -a (che io scriva, che lui dorma). Le tre persone singolari sono uguali. Irregolari importanti: essere: sia, avere: abbia, andare: vada, fare: faccia, potere: possa, venire: venga.",
        example: {
          problem: "Completa: «Penso che Karim ___ stanco.» (essere)",
          steps: ["penso che esprime un'opinione: congiuntivo.", "essere è irregolare: che lui sia."],
          answer: "Penso che Karim sia stanco.",
        },
        dialogue: {
          opening: "Dopo penso che, credo che, voglio che, è importante che e benché non usiamo l'indicativo ma il congiuntivo: «Penso che Karim sia a casa».",
          steps: [
            { ask: "«Karim è a casa». Dopo «Penso che…» diventa: «Penso che Karim ___ a casa». (essere)", answer: "sia", hint: "Una forma corta di tre lettere, finisce in a." },
            { ask: "I verbi in -ere e -ire prendono -a: «che io scriva». Qual è il congiuntivo di leggere con lui?", answer: "legga", hint: "Radice legg + la stessa fine di scriva." },
            { ask: "Alcuni verbi sono irregolari: avere: che io abbia. Qual è il congiuntivo di fare con io?", answer: "faccia", hint: "Come abbia: radice fac con la c doppia, poi -ia." },
            { ask: "Dopo «benché» usiamo l'indicativo o il congiuntivo?", answer: "congiuntivo", hint: "Come dopo penso che e voglio che." },
          ],
          rule: "Congiuntivo presente dopo penso che, credo che, voglio che, spero che, è importante che, benché: -are: -i (parli), -ere / -ire: -a (scriva, dorma); irregolari: sia, abbia, vada, faccia, possa, venga.",
        },
      },
      condizionale: {
        name: "Il condizionale: richieste gentili e consigli",
        explanation:
          "Il condizionale presente serve per le richieste gentili («Vorrei un caffè, per favore»), per i consigli («Al tuo posto, studierei di più») e per i desideri. Si forma con la radice del futuro + -ei, -esti, -ebbe, -emmo, -este, -ebbero. Nei verbi in -are la a diventa e: parlare: parlerei. Irregolari: essere: sarei, avere: avrei, volere: vorrei, potere: potrei, dovere: dovrei, andare: andrei, fare: farei.",
        example: {
          problem: "Chiedi gentilmente: «___ un tè, per favore.» (volere)",
          steps: ["Una richiesta gentile: condizionale.", "volere è irregolare: vorrei."],
          answer: "Vorrei un tè, per favore.",
        },
        dialogue: {
          opening: "Il condizionale serve per chiedere in modo gentile, per dare un consiglio o per esprimere un desiderio: «Vorrei un caffè, per favore».",
          steps: [
            { ask: "volere con io al condizionale: vorrei. E potere con io?", answer: "potrei", hint: "Come vorrei: radice pot e poi -rei." },
            { ask: "parlare: io parlerei (la a diventa e). Qual è il condizionale di studiare con io?", answer: "studierei", hint: "Radice studi + -erei, come in parlerei." },
            { ask: "essere al condizionale: io sarei. E con lui?", answer: "sarebbe", hint: "La fine di lui al condizionale è -ebbe: mettila dopo la radice sar." },
            { ask: "Un consiglio: «Al tuo posto, io ___ di più». (dormire)", answer: "dormirei", hint: "Verbi in -ire: radice dorm e poi -irei." },
          ],
          rule: "Condizionale presente = radice del futuro + -ei, -esti, -ebbe, -emmo, -este, -ebbero (parlerei, dormirei). Irregolari: sarei, avrei, vorrei, potrei, dovrei, farei. Serve per richieste gentili, consigli e desideri.",
        },
      },
      periodo_ipotetico: {
        name: "Il periodo ipotetico",
        explanation:
          "Per un'ipotesi non reale nel presente: Se + congiuntivo imperfetto, poi condizionale presente: «Se avessi tempo, viaggerei». Il congiuntivo imperfetto: -are: -assi (parlassi), -ere: -essi (avessi), -ire: -issi (dormissi); essere: fossi, fossi, fosse. Dopo se non usiamo mai il condizionale: «Se sarei» è sbagliato.",
        example: {
          problem: "Completa: «Se ___ ricco, comprerei una casa a Tlemcen.» (essere, io)",
          steps: ["Dopo se: congiuntivo imperfetto.", "essere con io: fossi."],
          answer: "Se fossi ricco, comprerei una casa a Tlemcen.",
        },
        dialogue: {
          opening: "Per un'ipotesi non reale c'è uno schema fisso: Se + congiuntivo imperfetto, poi condizionale: «Se avessi tempo, viaggerei».",
          steps: [
            { ask: "Nella frase «Se avessi tempo, viaggerei», qual è il verbo dopo se?", answer: "avessi", hint: "È la parola che viene subito dopo se." },
            { ask: "avere con io: se io avessi. E essere con io: «Se io ___ ricco»?", answer: "fossi", hint: "Comincia con fo e finisce in -ssi, come il verbo di prima." },
            { ask: "Coniuga potere con io dopo se: «Se io ___, verrei alla festa».", answer: "potessi", hint: "Dopo se: congiuntivo imperfetto come avessi, con la radice pot." },
            { ask: "La seconda parte va al condizionale: «Se fossi ricco, ___ in Italia». (viaggiare, io)", answer: "viaggerei", hint: "Condizionale di un verbo in -are: togli la i di viaggi e aggiungi -erei." },
          ],
          rule: "Periodo ipotetico (ipotesi non reale): Se + congiuntivo imperfetto (avessi, fossi, potessi, parlassi), poi condizionale (farei, sarei, viaggerei). Mai il condizionale dopo se.",
        },
      },
    },
  },
  "it-sentences": {
    title: "La frase: connettivi, pronomi relativi e pronomi complemento",
    skills: {
      connectors: {
        name: "I connettivi",
        explanation:
          "Causa: perché. Conseguenza: quindi, perciò. Opposizione: però, ma. Concessione: anche se, benché (benché vuole il congiuntivo). Contemporaneità o contrasto: mentre. Aggiunta: inoltre. Ordine: prima, poi, infine. Nel tema i connettivi legano le idee.",
        example: {
          problem: "Completa: «Resto a casa ___ sono malato.»",
          steps: ["La seconda frase è la causa della prima.", "Il connettivo della causa è perché."],
          answer: "Resto a casa perché sono malato.",
        },
        dialogue: {
          opening: "I connettivi legano le idee: perché (causa), anche se (concessione), però (opposizione), quindi (conseguenza), mentre (contemporaneità), inoltre (aggiunta).",
          steps: [
            { ask: "«Resto a casa ___ sono malato». Quale connettivo dà la causa?", answer: "perché", accept: ["perche"], hint: "È anche la parola della domanda «Why?» in italiano." },
            { ask: "«Sono stanco, ___ vado a letto». Quale connettivo dà la conseguenza?", answer: "quindi", hint: "Comincia con qu e significa «per questo motivo»." },
            { ask: "«Studio molto, ___ i voti sono bassi». Quale connettivo di opposizione, diverso da ma?", answer: "però", accept: ["pero"], hint: "Significa «ma» e finisce con una vocale accentata." },
            { ask: "Quale connettivo indica due azioni nello stesso momento?", answer: "mentre", hint: "Comincia con me e finisce in -tre." },
          ],
          rule: "perché: causa; quindi: conseguenza; però / ma: opposizione; anche se / benché: concessione; mentre: contemporaneità; inoltre: aggiunta.",
        },
      },
      relatives: {
        name: "I pronomi relativi",
        explanation:
          "che: soggetto o oggetto, per persone e cose («Il ragazzo che parla», «Il libro che leggo»). cui: dopo una preposizione (di cui, a cui, con cui, in cui): «La ragazza con cui parlo». dove: per il luogo («La città dove abito» = in cui abito). il quale / la quale / i quali / le quali: forma più formale. ciò che (= quello che): «Non capisco ciò che dici».",
        example: {
          problem: "Completa: «Questo è il libro ___ ti ho parlato.»",
          steps: ["Si dice parlare di qualcosa: serve di.", "Dopo una preposizione usiamo cui.", "Il risultato è di cui."],
          answer: "Questo è il libro di cui ti ho parlato.",
        },
        dialogue: {
          opening: "I pronomi relativi uniscono due frasi: che (soggetto o oggetto), cui dopo una preposizione, dove per il luogo, ciò che per «la cosa che».",
          steps: [
            { ask: "«Il ragazzo ___ parla è Karim». Qual è il pronome relativo più usato?", answer: "che", hint: "La trovi anche dopo penso: «Penso ___ sia vero»." },
            { ask: "Dopo una preposizione usiamo un altro pronome: «La ragazza con ___ parlo è Amina». Quale?", answer: "cui", hint: "Un pronome di tre lettere che viene dopo di, a, in, con." },
            { ask: "Per il luogo: «La città ___ abito è Orano». Scrivi la parola del luogo.", answer: "dove", hint: "È anche la parola della domanda «Where?» in italiano." },
            { ask: "«Non capisco ___ dici»: la cosa che dici. Quale espressione?", answer: "ciò che", accept: ["cio che", "quello che"], hint: "Una parola corta con l'accento, seguita dal primo pronome relativo." },
          ],
          rule: "che: soggetto o oggetto; cui dopo una preposizione (di cui, a cui, con cui, in cui); dove per il luogo (= in cui); il quale / la quale: forma formale; ciò che = quello che.",
        },
      },
      pronouns: {
        name: "I pronomi diretti, indiretti e ne",
        explanation:
          "Vanno prima del verbo coniugato. Diretti (chi? che cosa?): lo (maschile singolare), la (femminile singolare), li (maschile plurale), le (femminile plurale): «Vedo Karim: Lo vedo». Indiretti (dopo a): gli (a lui, a loro), le (a lei): «Telefono a Karim: Gli telefono». ne per una quantità o per «di questo»: «Quante mele vuoi? Ne voglio tre». Al passato prossimo il participio si accorda con lo, la, li, le: «Le ho viste».",
        example: {
          problem: "Sostituisci con un pronome: «Scrivo ad Amina.»",
          steps: ["ad Amina è un complemento indiretto.", "Femminile singolare: le.", "Il pronome va prima del verbo."],
          answer: "Le scrivo.",
        },
        dialogue: {
          opening: "I pronomi complemento vanno prima del verbo: diretti lo, la, li, le; indiretti (dopo a) gli e le; e ne per la quantità.",
          steps: [
            { ask: "«Vedo Karim» diventa «___ vedo». Scrivi la frase con il pronome.", answer: "lo vedo", hint: "Karim è maschile singolare: il pronome è come l'articolo di zaino." },
            { ask: "«Vedo Amina e Sara» diventa «___ vedo». Scrivi la frase con il pronome.", answer: "le vedo", hint: "Femminile plurale: il pronome è come l'articolo di case." },
            { ask: "«Telefono a Karim» diventa «___ telefono» (a lui).", answer: "gli telefono", accept: ["gli"], hint: "a + maschile: pronome indiretto di tre lettere che comincia con g." },
            { ask: "«Quanti libri hai? ___ ho tre». Il pronome della quantità: scrivi tutta la risposta.", answer: "ne ho tre", hint: "Un pronome di due lettere che comincia con n, poi il verbo e il numero." },
          ],
          rule: "Diretti: lo, la, li, le (Lo vedo); indiretti: gli (a lui, a loro), le (a lei) (Gli telefono); ne per la quantità (Ne ho tre). Tutti prima del verbo coniugato.",
        },
      },
    },
  },
  "it-text": {
    title: "Comprensione del testo, lessico e produzione scritta",
    skills: {
      comprehension: {
        name: "Comprensione del testo scritto",
        explanation:
          "Leggi prima la domanda e trova la parola interrogativa: Chi, Che cosa, Dove, Quando, Perché, Come, Da quanto tempo. Cerca nel testo la frase con l'informazione, poi rispondi con una frase completa e con parole tue. Alla domanda Perché rispondiamo spesso con «Perché…». Per «Vero o falso?» giustifica con una frase del testo.",
        example: {
          problem: "Testo: «Karim resta a casa perché è malato.» Perché Karim resta a casa?",
          steps: ["Perché: cerchiamo la causa.", "La causa viene dopo perché: è malato."],
          answer: "Perché è malato.",
        },
        dialogue: {
          opening: "Per rispondere a una domanda sul testo, trova prima la parola interrogativa: Chi, Che cosa, Dove, Quando, Perché, Come.",
          steps: [
            { ask: "Quale parola interrogativa chiede il luogo?", answer: "dove", hint: "Comincia con d e finisce con e." },
            { ask: "E quale chiede il momento, il tempo?", answer: "quando", hint: "Comincia con qu, come quanto ma con la d." },
            { ask: "Testo: «Amina resta a casa perché è malata». Perché resta a casa Amina? (una parola)", answer: "malata", hint: "Cerca l'aggettivo dopo è." },
            { ask: "«Da quanto tempo…?» chiede la durata. «Studia l'italiano da due anni»: qual è la durata?", answer: "due anni", hint: "Un numero dopo da, poi la parola per «anni»." },
          ],
          rule: "Trova la parola interrogativa (Chi, Che cosa, Dove, Quando, Perché, Come, Da quanto tempo), cerca la frase nel testo e rispondi con una frase completa e con parole tue.",
        },
      },
      vocabulary: {
        name: "Il lessico per temi",
        explanation:
          "Il lessico del BAC riguarda temi come l'ambiente (l'inquinamento, inquinare, proteggere, il riciclaggio), i mezzi di comunicazione (il giornale, la televisione, internet, i social), la salute (sano, malato, lo sport) e il lavoro (la disoccupazione, il mestiere). Ci sono domande su sinonimi (cominciare = iniziare) e contrari (grande / piccolo, caro / economico).",
        example: {
          problem: "Qual è il contrario di «sano»?",
          steps: ["sano: in buona salute.", "Il contrario: malato."],
          answer: "malato",
        },
        dialogue: {
          opening: "Il lessico del BAC riguarda l'ambiente, i mezzi di comunicazione, la salute e il lavoro; ci sono domande su sinonimi e contrari.",
          steps: [
            { ask: "Qual è il contrario di «grande»?", answer: "piccolo", hint: "Comincia con pic e si dice di un bambino o di una cosa non grande." },
            { ask: "Qual è un sinonimo di «cominciare»?", answer: "iniziare", hint: "Assomiglia alla parola francese initier." },
            { ask: "Qual è il nome che viene dal verbo «inquinare»?", answer: "inquinamento", hint: "Aggiungi -amento alla radice inquin." },
            { ask: "«la salute»: il contrario di «sano» è…?", answer: "malato", hint: "Si dice di una persona che va dal medico perché non sta bene." },
          ],
          rule: "Impara il lessico per temi (ambiente, comunicazione, salute, lavoro) con i sinonimi (cominciare = iniziare), i contrari (grande / piccolo, sano / malato) e le parole derivate (inquinare: inquinamento).",
        },
      },
      writing: {
        name: "Produzione scritta: la lettera e il tema",
        explanation:
          "La lettera: luogo e data (Orano, 10 maggio 2026), poi il saluto: informale Caro Karim, / Cara Amina, formale Gentile signore, / Gentile signora, / Egregio direttore, poi il testo, poi la chiusura: informale Un abbraccio / A presto / Baci, formale Distinti saluti / Cordiali saluti, e la firma. Il tema: introduzione (presenta l'argomento), sviluppo (le idee con connettivi: prima di tutto, inoltre, però, quindi), conclusione (la tua opinione: in conclusione, secondo me).",
        example: {
          problem: "Scrivi il saluto e la chiusura di una lettera formale alla direttrice di una scuola.",
          steps: ["Formale, femminile: Gentile signora direttrice,", "Chiusura formale: Distinti saluti"],
          answer: "Gentile signora direttrice, … Distinti saluti",
        },
        dialogue: {
          opening: "Una lettera ha un saluto all'inizio e una chiusura alla fine, diversi per una lettera informale o formale. Il tema ha tre parti.",
          steps: [
            { ask: "Lettera informale a un amico: «___ Karim,»?", answer: "caro", hint: "Significa «my dear» e finisce in o." },
            { ask: "E a un'amica: «___ Amina,»?", answer: "cara", hint: "Cambia l'ultima lettera della parola di prima con la vocale femminile." },
            { ask: "Come si chiude una lettera formale?", answer: "distinti saluti", accept: ["cordiali saluti"], hint: "Un aggettivo che significa «speciali, eleganti» e poi la parola dei saluti." },
            { ask: "Come si chiama l'ultima parte del tema?", answer: "conclusione", hint: "Viene dopo lo sviluppo e lì dai la tua opinione." },
          ],
          rule: "Lettera informale: Caro / Cara … Un abbraccio; formale: Gentile signore / Gentile signora … Distinti saluti (o Cordiali saluti). Tema: introduzione, sviluppo con connettivi, conclusione con la tua opinione.",
        },
      },
    },
  },
};

/** The bank items' prompts in Italian (the oral quiz in "Italiano"). */
export const ITALIAN_PROMPTS: Record<string, string> = {
  "it-ten-1": "Completa: «Ieri io ___ mangiato una pizza.»",
  "it-ten-2": "Completa: «Amina ___ partita per Orano.»",
  "it-ten-3": "Completa: «Le ragazze sono ___ a Tlemcen.» (andare)",
  "it-ten-4": "Completa: «Stamattina Karim ___ alle sei.» (alzarsi)",
  "it-ten-5": "Qual è il participio passato di «parlare»?",
  "it-ten-6": "Completa: «Ho ___ una lettera a mia nonna.» (scrivere)",
  "it-ten-7": "Completa: «Avete ___ il film ieri sera?» (vedere)",
  "it-ten-8": "Completa: «Abbiamo ___ il treno per Orano.» (prendere)",
  "it-ten-9": "Completa: «Da bambino, Karim ___ a calcio ogni giorno.» (giocare)",
  "it-ten-10": "Completa: «Domani noi ___ a Tlemcen in treno.» (andare, futuro)",
  "it-ten-11": "Completa: «Ieri, mentre facevo i compiti, mio fratello ___ a casa all'improvviso.» (arrivare)",
  "it-ten-12": "Completa: «L'anno prossimo Amina ___ all'università.» (essere)",
  "it-art-1": "Quale forma è corretta?",
  "it-art-2": "Quale forma è corretta?",
  "it-art-3": "Completa: «Amina ha ___ a Napoli.» (amica)",
  "it-art-4": "Completa: «___ degli studenti sono pesanti.» (zaini)",
  "it-art-5": "Completa: «Il libro è ___ tavolo.» (su + il)",
  "it-art-6": "Completa: «D'estate vado ___ mare con la mia famiglia.»",
  "it-art-7": "Completa: «Il professore parla ___ studenti.» (a + gli)",
  "it-art-8": "Completa: «Karim abita ___ centro di Algeri.»",
  "it-art-9": "Qual è il plurale di «il ragazzo»?",
  "it-art-10": "Qual è il plurale di «la città»?",
  "it-art-11": "Qual è il plurale di «l'amico»?",
  "it-art-12": "Quale frase è corretta?",
  "it-ver-1": "Completa: «Penso che Karim ___ stanco.» (essere)",
  "it-ver-2": "Completa: «Voglio che tu ___ i compiti.» (fare)",
  "it-ver-3": "Completa: «È importante che voi ___ italiano ogni giorno.» (parlare)",
  "it-ver-4": "Completa: «Benché ___ freddo, Amina esce senza cappotto.» (fare)",
  "it-ver-5": "Una richiesta gentile al bar: «___ un caffè, per favore.»",
  "it-ver-6": "Una richiesta gentile a un amico: «Mi ___ passare il sale?» (potere, tu)",
  "it-ver-7": "Un consiglio: «Al tuo posto, io ___ di più.» (studiare)",
  "it-ver-8": "Completa: «Karim ___ venire alla festa, ma è malato.» (volere)",
  "it-ver-9": "Completa: «Se ___ ricco, viaggerei in Italia.» (essere, io)",
  "it-ver-10": "Completa: «Se avessi tempo, ___ più libri.» (leggere, io)",
  "it-ver-11": "Completa: «Se Amina ___ la macchina, andrebbe a Tlemcen.» (avere)",
  "it-ver-12": "Quale frase è corretta?",
  "it-sen-1": "Completa: «Resto a casa ___ sono malato.»",
  "it-sen-2": "Completa: «Fa molto freddo, ___ Karim esce senza giacca.»",
  "it-sen-3": "Che cosa significa «anche se» in arabo?",
  "it-sen-4": "Completa: «Lo sport fa bene alla salute; ___, aiuta a ridurre lo stress.»",
  "it-sen-5": "Completa: «Il ragazzo ___ parla con Amina è mio fratello.»",
  "it-sen-6": "Completa: «La città ___ abito si chiama Orano.»",
  "it-sen-7": "Completa: «Questo è il libro ___ ti ho parlato.»",
  "it-sen-8": "Completa: «Non capisco ___ dici.» (= la cosa che dici)",
  "it-sen-9": "Completa: «Conosci Karim? Sì, ___ bene.»",
  "it-sen-10": "Completa: «Hai visto Amina e Sara? No, non ___.»",
  "it-sen-11": "Completa: «Telefoni a tuo padre? Sì, ___ stasera.»",
  "it-sen-12": "Completa: «Quante mele vuoi? ___ tre.»",
  "it-txt-1": "Secondo il testo: «Dove abita Amina?»",
  "it-txt-2": "Secondo il testo: «Da quanto tempo Amina studia l'italiano?»",
  "it-txt-3": "Secondo il testo: «Perché Amina vorrebbe diventare medico?»",
  "it-txt-4": "Quale frase è vera secondo il testo?",
  "it-txt-5": "Il contrario di «grande» è:",
  "it-txt-6": "Che cosa significa «l'ambiente» in arabo?",
  "it-txt-7": "Un sinonimo di «cominciare» è:",
  "it-txt-8": "Completa: «Le fabbriche e le macchine ___ l'aria.»",
  "it-txt-9": "Quale parola non appartiene al tema «mezzi di comunicazione»?",
  "it-txt-10": "Come cominci una lettera informale alla tua amica Amina?",
  "it-txt-11": "Come si chiude una lettera formale?",
  "it-txt-12": "Quale connettivo serve per aggiungere una nuova idea nel tema?",
  "it-txt-13": "Qual è l'ordine giusto delle parti del tema?",
};

/** Every misconception key of the Italian lessons, in Italian. */
export const ITALIAN_MISCONCEPTIONS: Record<string, string> = {
  // it-tenses
  wrong_auxiliary: "Ausiliare sbagliato (avere invece di essere o il contrario)",
  agreement_error: "Il participio non si accorda con il soggetto dopo essere",
  participle_form: "Forma sbagliata del participio passato",
  irregular_as_regular: "Un verbo irregolare coniugato come un verbo regolare",
  tense_confusion: "Confusione tra i tempi verbali",
  conjugation_error: "La coniugazione non corrisponde al soggetto",
  // it-articles
  article_choice: "Articolo sbagliato per la prima lettera del nome (il invece di lo, per esempio)",
  gender_error: "Errore di genere (maschile o femminile)",
  number_agreement: "Errore di numero (singolare o plurale)",
  preposition_contraction: "Preposizione non unita all'articolo, o unita male",
  wrong_preposition: "Preposizione sbagliata",
  plural_form: "Forma sbagliata del plurale",
  // it-verbs
  indicative_for_subjunctive: "Indicativo invece del congiuntivo dopo penso che, voglio che, benché",
  mood_confusion: "Confusione tra i modi (congiuntivo, condizionale, indicativo)",
  conditional_after_se: "Condizionale dopo se",
  // it-sentences
  connector_meaning: "Confusione tra i significati dei connettivi (causa, conseguenza, opposizione)",
  relative_choice: "Pronome relativo sbagliato",
  cui_preposition: "Manca la preposizione prima di cui, o la preposizione è sbagliata",
  pronoun_choice: "Errore di genere o di numero nel pronome complemento",
  direct_indirect: "Confusione tra pronome diretto e pronome indiretto",
  ne_partitive: "Manca ne per esprimere una quantità",
  // it-text
  comprehension_error: "Un'informazione del testo capita male",
  vocab_confusion: "Confusione tra parole simili nella forma o nel significato",
  letter_convention: "Errore nel saluto o nella chiusura della lettera",
  structure_error: "Errore nella struttura del tema o nella scelta del connettivo",
};

/** The remedies of the Italian lessons, in Italian. */
export const ITALIAN_REMEDIES: Record<string, string> = {
  wrong_auxiliary: "Chiediti: il soggetto si sposta da un luogo a un altro, cambia stato o il verbo è riflessivo? Sì: essere (è andato, si è alzato). No: avere.",
  agreement_error: "Con essere il participio prende la fine del soggetto: -o (maschile), -a (femminile), -i (maschile plurale), -e (femminile plurale).",
  participle_form: "-are: -ato, -ere: -uto, -ire: -ito; impara gli irregolari: fatto, detto, scritto, letto, visto, preso, messo.",
  article_choice: "Guarda la prima lettera: consonante semplice: il / i; s + consonante o z: lo / gli; vocale: l' / gli.",
  preposition_contraction: "Preposizione + articolo = una parola: a + il = al, in + la = nella, su + lo = sullo, di + gli = degli.",
  plural_form: "-o: -i, -a: -e, -e: -i; le parole con l'accento finale non cambiano.",
  indicative_for_subjunctive: "Dopo penso che, credo che, voglio che, è importante che, benché viene il congiuntivo: che sia, che abbia, che faccia.",
  conditional_after_se: "Dopo se: congiuntivo imperfetto (avessi, fossi); il condizionale (farei, sarei) solo nell'altra parte della frase.",
  connector_meaning: "perché: causa; quindi: conseguenza; però: opposizione; anche se: concessione; mentre: contemporaneità; inoltre: aggiunta.",
  cui_preposition: "Se il verbo vuole una preposizione (parlare di, pensare a, abitare in), mettila prima di cui: di cui, a cui, in cui.",
  direct_indirect: "Senza preposizione: lo, la, li, le; con a: gli (a lui, a loro), le (a lei).",
  comprehension_error: "Torna al testo: cerca la parola chiave della domanda e leggi tutta la frase prima di rispondere.",
  letter_convention: "Amico: Caro (maschile) / Cara (femminile) … Un abbraccio. Formale: Gentile signore / Gentile signora … Distinti saluti.",
};
