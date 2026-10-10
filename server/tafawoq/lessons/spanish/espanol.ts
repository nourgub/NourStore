// The Spanish lessons in Spanish: what the teacher says when the student
// chooses to be taught in Spanish (simple A2–B1 sentences). Each skill gets
// its Spanish edition — name, explanation, worked example and discovery
// dialogue — each bank item a Spanish prompt, and each misconception and
// remedy a Spanish label. Attached in ./index.ts; answers never appear in
// their own hints (server/tafawoq/dialogue.test.ts).
import type { SkillEdition } from "../../curriculum";

export const SPANISH_EDITIONS: Record<string, { title: string; skills: Record<string, SkillEdition> }> = {
  "es-tenses": {
    title: "Los tiempos: pretérito perfecto, indefinido, imperfecto y futuro",
    skills: {
      perfecto: {
        name: "El pretérito perfecto",
        explanation:
          "El pretérito perfecto tiene dos partes: el verbo haber (he, has, ha, hemos, habéis, han) y el participio: «He estudiado mucho hoy». Lo usamos con un tiempo que no ha terminado: hoy, esta semana, este año, ya, todavía no. Participio regular: -ar → -ado (hablado), -er / -ir → -ido (comido, vivido). Participios irregulares: hecho, dicho, escrito, visto, puesto, vuelto, abierto. Con haber, el participio no cambia.",
        example: {
          problem: "Completa: «Esta semana nosotros ___ una carta.» (escribir)",
          steps: ["«Esta semana» no ha terminado: pretérito perfecto.", "Haber con nosotros: hemos.", "Escribir es irregular: escrito."],
          answer: "Esta semana nosotros hemos escrito una carta.",
        },
        dialogue: {
          opening: "El pretérito perfecto tiene dos partes: haber y el participio. Por ejemplo: «He estudiado mucho hoy».",
          steps: [
            { ask: "Haber con yo es «he». ¿Y con nosotros? «Nosotros ___ comido».", answer: "hemos", hint: "Empieza con la forma de yo y añade la terminación de nosotros." },
            { ask: "Mira: «hablar, hablado». ¿Cuál es el participio de trabajar?", answer: "trabajado", hint: "Verbos en -ar: quita -ar y añade -ado." },
            { ask: "Y «comer, comido». ¿Cuál es el participio de vivir?", answer: "vivido", hint: "Los verbos en -er y en -ir tienen la misma terminación: -ido." },
            { ask: "Algunos son irregulares: «hacer, hecho», «decir, dicho». ¿Y el participio de escribir?", answer: "escrito", hint: "No termina en -ido; la forma irregular termina en -to.", then: "Igual: visto, puesto, vuelto, abierto." },
          ],
          rule: "Pretérito perfecto = haber (he, has, ha, hemos, habéis, han) + participio. Regular: -ado, -ido. Irregular: hecho, dicho, escrito, visto, puesto, vuelto, abierto. Lo usamos con hoy, esta semana, ya.",
        },
      },
      indefinido_imperfecto: {
        name: "Indefinido o imperfecto",
        explanation:
          "El indefinido cuenta una acción terminada en un momento concreto del pasado (ayer, el año pasado, en 2020): hablé, comí, viví; irregulares: fui, fue, tuve, hice, estuve. El imperfecto describe y cuenta costumbres o acciones en desarrollo (antes, siempre, de niño, mientras): -ar → -aba (hablaba), -er / -ir → -ía (comía, vivía); irregulares: era, iba, veía. En un relato: «Mientras leía (fondo), sonó el teléfono (acción)».",
        example: {
          problem: "Completa: «Cuando yo era niño, ___ en Tlemcen.» (vivir)",
          steps: ["«Cuando era niño» es una descripción del pasado: imperfecto.", "Vivir es un verbo en -ir: terminación -ía.", "Con yo: vivía."],
          answer: "Cuando yo era niño, vivía en Tlemcen.",
        },
        dialogue: {
          opening: "En español hay dos tiempos principales para el pasado: el indefinido y el imperfecto. Vamos a ver la diferencia.",
          steps: [
            { ask: "«Ayer comí cuscús». Es una acción terminada. ¿Qué tiempo es: indefinido o imperfecto?", answer: "indefinido", hint: "«Ayer» es un momento concreto que ya terminó." },
            { ask: "«De niño, jugaba en la calle todos los días». ¿Qué tiempo es?", answer: "imperfecto", hint: "La frase describe una costumbre del pasado." },
            { ask: "El imperfecto de los verbos en -ar termina en -aba: «hablar, hablaba». ¿Y estudiar con yo?", answer: "estudiaba", hint: "Quita -ar y añade la terminación del ejemplo." },
            { ask: "Ir es irregular en indefinido. Completa: «Ayer Karim ___ a Orán».", answer: "fue", hint: "Tiene la misma forma que el verbo ser en este tiempo, con él." },
          ],
          rule: "Indefinido: acción terminada en un momento concreto (ayer, el año pasado): hablé, comí, fue, tuve, hice. Imperfecto: descripción, costumbre, acción en desarrollo (antes, siempre, mientras): hablaba, comía, era, iba.",
        },
      },
      futuro_condicional: {
        name: "El futuro y el condicional",
        explanation:
          "El futuro: infinitivo + -é, -ás, -á, -emos, -éis, -án: «Mañana viajaré a Argel». El condicional (consejos, cortesía, deseos): infinitivo + -ía, -ías, -ía, -íamos, -íais, -ían: «Yo en tu lugar estudiaría más», «¿Podría ayudarme?». Algunos verbos cambian la raíz en los dos tiempos: tendr-, har-, podr-, dir-, saldr-, vendr-.",
        example: {
          problem: "Completa: «El año que viene ___ en la universidad.» (estar, yo)",
          steps: ["«El año que viene» es futuro.", "Estar es regular: usamos el infinitivo entero.", "Terminación de yo: -é. Estaré."],
          answer: "El año que viene estaré en la universidad.",
        },
        dialogue: {
          opening: "El futuro y el condicional son fáciles: infinitivo entero + terminación. «Hablar: hablaré, hablaría».",
          steps: [
            { ask: "La terminación de yo en futuro es -é. Completa: «Mañana ___ a Argel». (viajar)", answer: "viajaré", accept: ["viajare"], hint: "Toma el infinitivo entero y añade la terminación." },
            { ask: "Con nosotros es -emos. Completa: «Mañana ___ juntos». (estudiar)", answer: "estudiaremos", hint: "El infinitivo entero y la terminación, sin quitar nada." },
            { ask: "Algunos verbos cambian la raíz: tener, tendr-. ¿Cuál es el futuro de tener con yo?", answer: "tendré", accept: ["tendre"], hint: "La raíz nueva más la terminación de yo." },
            { ask: "El condicional para un consejo termina en -ía: «Yo en tu lugar, ___ más». (estudiar)", answer: "estudiaría", accept: ["estudiaria"], hint: "Infinitivo entero más la terminación del condicional." },
          ],
          rule: "Futuro = infinitivo + -é, -ás, -á, -emos, -éis, -án. Condicional = infinitivo + -ía, -ías, -ía, -íamos, -íais, -ían. Raíces irregulares: tendr-, har-, podr-, dir-, saldr-, vendr-.",
        },
      },
    },
  },
  "es-verbs": {
    title: "Ser, estar y hay; verbos como gustar; pronombres de objeto",
    skills: {
      ser_estar: {
        name: "Ser, estar y hay",
        explanation:
          "Ser: identidad y características permanentes: nacionalidad, profesión, carácter, origen, la hora («Karim es argelino», «Son las tres»). Estar: estados temporales y lugar de una persona o cosa concreta («Estoy cansado», «Orán está en el oeste»). Hay: existencia de algo no concreto, igual en singular y plural («Hay un museo», «Hay muchas playas»). Regla práctica: hay + un / una / número / sin artículo; estar + el / la / nombre propio.",
        example: {
          problem: "Completa: «En Argel ___ un puerto grande. El puerto ___ cerca del centro.»",
          steps: ["Primera frase: existencia de algo no concreto (un puerto): hay.", "Segunda frase: lugar de algo concreto (el puerto): está."],
          answer: "En Argel hay un puerto grande. El puerto está cerca del centro.",
        },
        dialogue: {
          opening: "En español, el verbo «to be» tiene tres formas: ser, estar y hay. Vamos a descubrir cuándo usamos cada una.",
          steps: [
            { ask: "«Karim ___ argelino». La nacionalidad es permanente. ¿Qué infinitivo: ser o estar?", answer: "ser", hint: "La nacionalidad es parte de la identidad." },
            { ask: "«Hoy Amina ___ cansada». Es un estado temporal. Conjuga el verbo correcto con ella.", answer: "está", accept: ["esta"], hint: "El cansancio pasa: elige el verbo de las situaciones temporales." },
            { ask: "«En Orán ___ muchas playas». ¿Qué palabra expresa la existencia?", answer: "hay", hint: "Una palabra corta que no cambia en plural." },
            { ask: "«La playa ___ cerca de mi casa». Es el lugar de algo concreto. ¿Qué verbo?", answer: "está", accept: ["esta", "estar"], hint: "Para el lugar de algo conocido no usamos la palabra de la existencia ni el verbo de la identidad." },
          ],
          rule: "Ser: identidad y características permanentes (es argelino). Estar: estados temporales y lugar de algo concreto (está cansada, está cerca). Hay: existencia de algo no concreto (hay una playa, hay muchas playas).",
        },
      },
      gustar: {
        name: "Verbos como gustar",
        explanation:
          "Con gustar, encantar, interesar y doler, la cosa que gusta es el sujeto y la persona es un pronombre: me, te, le, nos, os, les. El verbo concuerda con la cosa: «Me gusta el fútbol» (singular o infinitivo), «Me gustan los libros» (plural). Podemos añadir «a mí, a ti, a él, a Karim…» para insistir o aclarar, pero el pronombre se queda: «A Karim le gusta leer».",
        example: {
          problem: "Completa: «A mis hermanos ___ ___ los videojuegos.»",
          steps: ["A mis hermanos = ellos: pronombre les.", "La cosa que gusta, los videojuegos, es plural: gustan."],
          answer: "A mis hermanos les gustan los videojuegos.",
        },
        dialogue: {
          opening: "Gustar funciona al revés: la cosa que gusta es el sujeto y la persona es un pronombre. «Me gusta el fútbol».",
          steps: [
            { ask: "«Me ___ los libros». Los libros es plural. ¿Gusta o gustan?", answer: "gustan", hint: "El verbo concuerda con la cosa, y aquí es plural." },
            { ask: "«A Karim y a Amina ___ gusta viajar». ¿Qué pronombre para ellos?", answer: "les", hint: "El pronombre de él, con la letra del plural al final." },
            { ask: "«A nosotros ___ encanta la música». ¿Qué pronombre?", answer: "nos", hint: "Es la forma corta de la primera persona del plural." },
            { ask: "En «A mí me gusta», ¿«a mí» es el sujeto o sirve para insistir?", answer: "insistir", accept: ["énfasis", "enfasis"], hint: "La frase «Me gusta» ya es correcta sin estas dos palabras." },
          ],
          rule: "Gustar, encantar, interesar: pronombre (me, te, le, nos, os, les) + gusta (una cosa o un infinitivo) o gustan (varias cosas). «A mí, a Karim…» solo sirve para insistir o aclarar.",
        },
      },
      pronouns: {
        name: "Pronombres de objeto: lo, la, le, se lo",
        explanation:
          "Objeto directo (la cosa o la persona que recibe la acción): lo (masculino), la (femenino), los, las. Objeto indirecto (¿a quién?): le, les. El pronombre va delante del verbo conjugado («Lo compro») o detrás del infinitivo, unido a él («Quiero comprarlo»). Si le / les va con lo / la / los / las, le se cambia por se, y el indirecto va primero: «Le doy el libro» → «Se lo doy».",
        example: {
          problem: "Cambia los objetos por pronombres: «Doy la carta a Amina.»",
          steps: ["La carta: objeto directo femenino, la.", "A Amina: objeto indirecto, le.", "Le + la: se la, delante del verbo."],
          answer: "Se la doy.",
        },
        dialogue: {
          opening: "El pronombre de objeto evita repetir un nombre y va delante del verbo conjugado: «¿El pan? Lo compro».",
          steps: [
            { ask: "«¿Compras los libros? — Sí, ___ compro». ¿Qué pronombre?", answer: "los", hint: "Masculino plural, como el artículo." },
            { ask: "«¿Lees las revistas? — Sí, ___ leo».", answer: "las", hint: "Femenino plural, como el artículo." },
            { ask: "«Escribo a mis padres: ___ escribo una carta». Es un objeto indirecto plural.", answer: "les", hint: "El pronombre indirecto plural termina en -s." },
            { ask: "Le y lo no van juntos: «Le doy el libro» → «___ doy». ¿Qué dos pronombres?", answer: "se lo", hint: "El pronombre indirecto cambia, y después va el pronombre de el libro." },
          ],
          rule: "Directo: lo, la, los, las. Indirecto: le, les. Delante del verbo conjugado (lo compro) o unido al infinitivo (comprarlo). Le / les + lo / la → se lo, se la.",
        },
      },
    },
  },
  "es-subjunctive": {
    title: "El presente de subjuntivo y las frases con si",
    skills: {
      subj_forms: {
        name: "Las formas del presente de subjuntivo",
        explanation:
          "Empezamos con la forma de yo en presente, quitamos la -o y ponemos la terminación «contraria»: los verbos en -ar toman -e (hablo → hable, hables, hable, hablemos, habléis, hablen); los verbos en -er / -ir toman -a (como → coma, vivo → viva). Por eso se quedan las irregularidades de yo: tengo → tenga, hago → haga, digo → diga, salgo → salga. Totalmente irregulares: ser → sea, ir → vaya, estar → esté, haber → haya, saber → sepa, dar → dé.",
        example: {
          problem: "¿Cuál es el subjuntivo de «salir» con «tú»?",
          steps: ["Yo en presente: salgo.", "Quitamos la -o: salg-.", "Salir es un verbo en -ir: terminación -a; con tú: -as."],
          answer: "salgas",
        },
        dialogue: {
          opening: "El subjuntivo expresa deseo, objetivo y duda. Se forma desde yo en presente: quitamos la -o y ponemos la terminación contraria.",
          steps: [
            { ask: "«Hablo»: quitamos la -o y ponemos -e. ¿Cuál es el subjuntivo con yo?", answer: "hable", hint: "La raíz habl- más la terminación contraria de los verbos en -ar." },
            { ask: "«Como» (comer): quitamos la -o y ponemos -a. ¿Cuál es la forma?", answer: "coma", hint: "Los verbos en -er toman la terminación de los verbos en -ar." },
            { ask: "«Tengo» (tener): quitamos la -o y ponemos -a. ¿Cuál es la forma?", answer: "tenga", hint: "Guarda la g de la forma de yo y cambia la terminación." },
            { ask: "Algunos verbos son totalmente irregulares: ser → sea. ¿Y el subjuntivo de ir?", answer: "vaya", hint: "Empieza con v, como va." },
          ],
          rule: "Presente de subjuntivo: yo en presente sin la -o + terminación contraria: -ar → -e (hable); -er / -ir → -a (coma, viva, tenga, haga). Irregulares: sea, vaya, esté, haya, sepa.",
        },
      },
      subj_uses: {
        name: "¿Cuándo usamos el subjuntivo?",
        explanation:
          "Usamos el subjuntivo en la segunda frase cuando los sujetos son diferentes, después de un deseo o una petición: «Quiero que vengas» (pero «Quiero venir» con el mismo sujeto); después de para que (objetivo): «Te lo explico para que lo entiendas»; después de cuando con una acción futura: «Cuando termine, saldré»; y después de ojalá: «Ojalá haga buen tiempo». Con creo que y pienso que (seguridad) usamos el indicativo: «Creo que tiene razón».",
        example: {
          problem: "Completa: «Mis padres quieren que yo ___ medicina.» (estudiar)",
          steps: ["Quieren que + otro sujeto (yo): subjuntivo.", "Estudio → estudi- + e."],
          answer: "Mis padres quieren que yo estudie medicina.",
        },
        dialogue: {
          opening: "¿Cuándo necesitamos el subjuntivo? Después de un deseo para otra persona, un objetivo, cuando + futuro y ojalá.",
          steps: [
            { ask: "«Quiero que tú ___ más». (estudiar) ¿Cuál es el subjuntivo con tú?", answer: "estudies", hint: "La terminación contraria de los verbos en -ar, con la letra de tú." },
            { ask: "«Ojalá ___ buen tiempo mañana». (hacer)", answer: "haga", hint: "Empieza desde «hago» y cambia la terminación." },
            { ask: "«Cuando ___ dinero, viajaré». (tener, yo) La acción es futura.", answer: "tenga", hint: "Cuando + futuro: subjuntivo, con la raíz de tengo." },
            { ask: "«Creo que Karim tiene razón». ¿Qué modo es «tiene»: indicativo o subjuntivo?", answer: "indicativo", hint: "«Creo que» expresa seguridad; mira el verbo de la frase." },
          ],
          rule: "Subjuntivo después de: querer que (otro sujeto), para que, cuando + futuro, ojalá. Con creo que y pienso que usamos el indicativo.",
        },
      },
      conditional_si: {
        name: "Las frases condicionales con si",
        explanation:
          "Condición posible: si + presente de indicativo → futuro (o presente): «Si estudias, aprobarás». Después de si nunca usamos el futuro ni el presente de subjuntivo. Condición poco probable o imaginaria: si + imperfecto de subjuntivo → condicional: «Si tuviera dinero, viajaría». El imperfecto de subjuntivo se forma desde ellos en indefinido: quitamos -ron y ponemos -ra: tuvieron → tuviera, fueron → fuera, hablaron → hablara.",
        example: {
          problem: "Completa: «Si ___ (ser) rico, ___ (ayudar) a los pobres.»",
          steps: ["Condición imaginaria: si + imperfecto de subjuntivo.", "Fueron → fuera.", "La consecuencia en condicional: ayudaría."],
          answer: "Si fuera rico, ayudaría a los pobres.",
        },
        dialogue: {
          opening: "Hay dos tipos de condición: posible, «Si estudias, aprobarás», e imaginaria, «Si tuviera dinero, viajaría».",
          steps: [
            { ask: "«Si estudias, ___ el examen». (aprobar) La consecuencia va en futuro, con tú.", answer: "aprobarás", hint: "El infinitivo entero y la terminación de tú en futuro." },
            { ask: "Después de si no usamos el futuro: «Si ___ buen tiempo, iremos a la playa». (hacer, presente)", answer: "hace", hint: "El verbo del tiempo atmosférico en presente normal, con él." },
            { ask: "Condición imaginaria: «Si ___ dinero, viajaría». (tener) Quita -ron de tuvieron y pon -ra.", answer: "tuviera", hint: "La raíz del indefinido de tener con ellos, y después la terminación nueva." },
            { ask: "La consecuencia en condicional: «Si tuviera tiempo, ___ a Madrid». (ir, yo)", answer: "iría", accept: ["iria"], hint: "El infinitivo corto más la terminación del condicional." },
          ],
          rule: "Si + presente → futuro (Si estudias, aprobarás). Si + imperfecto de subjuntivo → condicional (Si tuviera dinero, viajaría). Nunca futuro ni condicional justo después de si.",
        },
      },
    },
  },
  "es-sentences": {
    title: "La frase: conectores, pronombres relativos y estilo indirecto",
    skills: {
      connectors: {
        name: "Los conectores",
        explanation:
          "Causa: porque («No salgo porque llueve»). Oposición: aunque («Aunque llueve, salgo») y sin embargo, al principio de una frase nueva. Consecuencia: por eso y así que («Llueve, así que no salgo»). Añadir una idea: además. Primero busca la relación entre las dos frases y después elige el conector.",
        example: {
          problem: "Completa: «Karim estudia mucho; ___, saca buenas notas.»",
          steps: ["La segunda frase es una consecuencia de la primera.", "Conector de consecuencia: por eso."],
          answer: "Karim estudia mucho; por eso, saca buenas notas.",
        },
        dialogue: {
          opening: "Los conectores unen las ideas: causa, oposición, consecuencia, añadir. Vamos a ver los más importantes.",
          steps: [
            { ask: "«No salgo ___ llueve». (causa)", answer: "porque", hint: "Es la palabra que responde a la pregunta «¿Por qué?»." },
            { ask: "«Estudio mucho, ___ apruebo». (consecuencia) ¿Por eso o aunque?", answer: "por eso", hint: "El conector que significa «a causa de esto»." },
            { ask: "«___ está cansado, Karim trabaja». (oposición)", answer: "aunque", hint: "Un conector de oposición que puede empezar la frase." },
            { ask: "¿Qué conector sirve para añadir una idea nueva?", answer: "además", accept: ["ademas"], hint: "Empieza con las letras ad." },
          ],
          rule: "Causa: porque. Oposición: aunque, sin embargo. Consecuencia: por eso, así que. Añadir: además.",
        },
      },
      relatives: {
        name: "Pronombres relativos: que, quien, donde, lo que, el que",
        explanation:
          "Que es el más usado, para personas y cosas: «El chico que vive aquí». Donde para lugares: «La ciudad donde nací». Lo que = la cosa que, sin nombre delante: «No entiendo lo que dices». Después de una preposición usamos quien / quienes para personas, o el que, la que, los que, las que, según el nombre: «La profesora con la que (con quien) hablé».",
        example: {
          problem: "Completa: «Este es el instituto ___ estudia Amina.»",
          steps: ["El nombre de delante es un lugar: el instituto.", "Relativo de lugar: donde."],
          answer: "Este es el instituto donde estudia Amina.",
        },
        dialogue: {
          opening: "Los relativos unen dos frases sin repetir el nombre: «El chico vive aquí. Es mi primo» → «El chico que vive aquí es mi primo».",
          steps: [
            { ask: "«El chico ___ vive aquí es mi primo». ¿Cuál es el relativo más simple?", answer: "que", hint: "El relativo más usado, para personas y cosas." },
            { ask: "«Orán es la ciudad ___ nací». (lugar)", answer: "donde", hint: "Es el relativo de los lugares." },
            { ask: "«No entiendo ___ dices». (la cosa que)", answer: "lo que", hint: "Un artículo neutro delante del relativo más simple." },
            { ask: "«El amigo con ___ hablo es Karim». (persona, después de preposición, una palabra)", answer: "quien", accept: ["el que"], hint: "Un relativo solo para personas, parecido a una palabra interrogativa." },
          ],
          rule: "Que: personas y cosas. Donde: lugares. Lo que: la cosa que (sin nombre delante). Después de preposición: quien para personas, o el que / la que según el nombre.",
        },
      },
      reported: {
        name: "El estilo indirecto",
        explanation:
          "Contamos lo que dice otra persona con dice que / dijo que y cambiamos los pronombres: «Estoy cansado» → «Karim dice que está cansado». Si el verbo está en presente (dice), el tiempo no cambia. Si está en pasado (dijo), cambia: presente → imperfecto (tengo → tenía), futuro → condicional (iré → iría), indefinido → pluscuamperfecto (fui → había ido). También: mañana → al día siguiente.",
        example: {
          problem: "Pasa al estilo indirecto: Amina: «Estudio en Orán.» → «Amina dijo que…»",
          steps: ["Dijo está en pasado: el presente pasa a imperfecto.", "Yo → ella: estudiaba."],
          answer: "Amina dijo que estudiaba en Orán.",
        },
        dialogue: {
          opening: "El estilo indirecto: «Karim dice: Estoy cansado» → «Karim dice que está cansado». Cambiamos los pronombres y, a veces, el tiempo.",
          steps: [
            { ask: "Karim: «Estoy cansado». → «Karim dice que ___ cansado».", answer: "está", accept: ["esta"], hint: "Cambia solo la persona, de yo a él; el tiempo es el mismo." },
            { ask: "Después de dijo (un verbo en pasado), ¿en qué tiempo se pone el presente?", answer: "imperfecto", hint: "El tiempo de la descripción en el pasado, con -aba o -ía." },
            { ask: "Amina: «Tengo un examen». → «Amina dijo que ___ un examen».", answer: "tenía", accept: ["tenia"], hint: "Tener en el tiempo que acabas de descubrir, con ella." },
            { ask: "Karim: «Vivo en Orán». → «Karim dijo que ___ en Orán».", answer: "vivía", accept: ["vivia"], hint: "El mismo cambio con un verbo en -ir." },
          ],
          rule: "Dice que: el mismo tiempo, cambiando los pronombres. Dijo que: presente → imperfecto (tengo → tenía), futuro → condicional (iré → iría), mañana → al día siguiente.",
        },
      },
    },
  },
  "es-text": {
    title: "Comprensión del texto, vocabulario y expresión escrita",
    skills: {
      comprehension: {
        name: "Comprensión del texto escrito",
        explanation:
          "Primero lee la pregunta y busca la palabra interrogativa: ¿Quién?, ¿Qué?, ¿Dónde?, ¿Cuándo?, ¿Por qué?, ¿Cómo?, ¿Desde cuándo? Después busca en el texto la frase con la información y responde con una frase completa, con tus palabras. A la pregunta ¿Por qué? respondemos normalmente con Porque…",
        example: {
          problem: "Texto: «Lina se queda en casa porque está enferma.» ¿Por qué se queda Lina en casa?",
          steps: ["¿Por qué? Buscamos la causa.", "La causa está después de porque: está enferma."],
          answer: "Porque está enferma.",
        },
        dialogue: {
          opening: "En el BAC lees un texto y respondes a preguntas. El truco: busca la palabra interrogativa y después la frase del texto.",
          steps: [
            { ask: "¿Qué palabra interrogativa pregunta por el lugar: ¿Dónde? o ¿Cuándo?", answer: "Dónde", accept: ["donde"], hint: "No es la palabra que pregunta por el tiempo." },
            { ask: "¿Y qué palabra interrogativa pregunta por la causa?", answer: "Por qué", accept: ["por que"], hint: "La respuesta empieza con un conector que suena casi igual." },
            { ask: "Texto: «Amina vive en Orán». Pregunta: «¿Dónde vive Amina?» ¿La respuesta?", answer: "Orán", accept: ["Oran"], hint: "Busca el nombre después de la preposición en." },
            { ask: "«¿Por qué estudia Amina medicina?» Texto: «… porque desea ayudar a los enfermos». ¿Con qué palabra empieza la respuesta?", answer: "Porque", hint: "El mismo conector de causa que en el texto." },
          ],
          rule: "Lee la pregunta, busca la palabra interrogativa (¿Quién?, ¿Qué?, ¿Dónde?, ¿Cuándo?, ¿Por qué?, ¿Cómo?), encuentra la frase del texto y responde con una frase completa (¿Por qué? → Porque…).",
        },
      },
      vocabulary: {
        name: "El vocabulario por temas",
        explanation:
          "El vocabulario del BAC viene de temas como el medio ambiente (la contaminación, proteger, reciclar), los medios de comunicación (el periódico, la prensa, internet), la salud (sano, enfermo, el médico) y el trabajo (el paro, el sueldo, la empresa). Muchas veces preguntan sinónimos (empezar = comenzar) y contrarios (grande y pequeño, caro y barato). Cuidado: «el medio» es el centro, pero «el medio ambiente» es la naturaleza que nos rodea.",
        example: {
          problem: "¿Cuál es el contrario de «caro»?",
          steps: ["Caro: cuesta mucho dinero.", "El contrario: cuesta poco dinero."],
          answer: "barato",
        },
        dialogue: {
          opening: "Las palabras se aprenden mejor por temas y por parejas: sinónimos y contrarios.",
          steps: [
            { ask: "¿Cuál es el contrario de «grande»?", answer: "pequeño", accept: ["pequeno"], hint: "Un adjetivo para algo de poco tamaño." },
            { ask: "¿Cuál es el contrario de «caro»?", answer: "barato", hint: "Un adjetivo para algo que cuesta poco dinero." },
            { ask: "Un sinónimo de «empezar»: ¿comenzar o terminar?", answer: "comenzar", hint: "Elige el verbo que no significa acabar." },
            { ask: "«El medio ambiente»: ¿habla de la naturaleza o de la economía?", answer: "naturaleza", hint: "Piensa en el aire, el agua y los árboles." },
          ],
          rule: "Aprende las palabras por temas y por parejas: grande y pequeño, caro y barato, empezar = comenzar. Cuidado: el medio es el centro; el medio ambiente es la naturaleza.",
        },
      },
      writing: {
        name: "Expresión escrita: la carta y la redacción",
        explanation:
          "La carta: lugar y fecha (Orán, 10 de mayo de 2026), el saludo con dos puntos (personal: Querido Karim:, Querida Amina:; formal: Estimado señor:, Estimada señora:), el texto, la despedida (personal: Un abrazo, Besos; formal: Atentamente) y la firma. La redacción: introducción (el tema), desarrollo (las ideas con conectores: en primer lugar, además, sin embargo, por eso) y conclusión (tu opinión: en conclusión, para terminar).",
        example: {
          problem: "Escribe el saludo y la despedida de una carta formal a la directora de un instituto.",
          steps: ["Formal, femenino: Estimada señora:", "Despedida formal: Atentamente"],
          answer: "Estimada señora: … Atentamente",
        },
        dialogue: {
          opening: "En el BAC escribes a menudo una carta o una redacción corta. Las dos tienen reglas fijas.",
          steps: [
            { ask: "Una carta a una amiga, Amina: ¿«Querido Amina» o «Querida Amina»?", answer: "Querida Amina", hint: "Para el femenino, el adjetivo termina en a." },
            { ask: "Una carta formal al señor García: «___ señor García:»", answer: "Estimado", hint: "Un adjetivo formal que significa «respetado», en masculino." },
            { ask: "La despedida de una carta formal, en una palabra:", answer: "Atentamente", hint: "Un adverbio que termina en -mente." },
            { ask: "En la redacción: introducción, desarrollo y…", answer: "conclusión", accept: ["conclusion"], hint: "Una palabra para la última parte, con tu opinión." },
          ],
          rule: "Carta: lugar y fecha, saludo (Querido / Querida… personal; Estimado señor / Estimada señora… formal) con dos puntos, texto, despedida (Un abrazo / Atentamente) y firma. Redacción: introducción, desarrollo con conectores, conclusión con tu opinión.",
        },
      },
    },
  },
};

/** The bank items' prompts in Spanish (the oral quiz in "Español"). */
export const SPANISH_PROMPTS: Record<string, string> = {
  "es-ten-1": "Completa: «Yo ___ estudiado mucho esta semana.»",
  "es-ten-2": "¿Cuál es el participio de «escribir»?",
  "es-ten-3": "Completa: «Hoy nosotros ___ la ventana.» (abrir)",
  "es-ten-4": "Completa: «¿Ya ___ la película, Amina?» (ver)",
  "es-ten-5": "Completa: «Ayer Karim ___ a Orán.» (ir)",
  "es-ten-6": "Completa: «Cuando yo era niño, ___ al fútbol todos los días.» (jugar)",
  "es-ten-7": "Completa: «Ayer yo ___ una carta a mi abuela.» (escribir)",
  "es-ten-8": "Completa: «Mientras mi madre ___ la cena, sonó el teléfono.» (preparar)",
  "es-ten-9": "Completa: «Mañana nosotros ___ a Tlemcen.» (viajar)",
  "es-ten-10": "¿Cuál es el futuro de «tener» con «yo»?",
  "es-ten-11": "Un consejo: «Yo en tu lugar, ___ más.» (estudiar)",
  "es-ten-12": "Una petición cortés: «¿___ usted abrir la ventana, por favor?» (poder)",
  "es-ten-13": "Completa: «El año que viene yo ___ el bachillerato.» (hacer)",
  "es-ver-1": "Completa: «Karim ___ argelino.»",
  "es-ver-2": "Completa: «Hoy Amina ___ cansada porque ha trabajado mucho.»",
  "es-ver-3": "Completa: «En mi ciudad ___ un museo muy bonito.»",
  "es-ver-4": "Completa: «El museo ___ en el centro de Orán.»",
  "es-ver-5": "Completa: «A mí me ___ el fútbol.»",
  "es-ver-6": "Completa: «A Karim le ___ los libros de historia.»",
  "es-ver-7": "Completa: «A nosotros ___ encanta la música andalusí.»",
  "es-ver-8": "Completa: «A mis padres ___ interesan las noticias.»",
  "es-ver-9": "Completa: «¿Compras el pan? — Sí, ___ compro.»",
  "es-ver-10": "Completa: «¿Has visto a Amina? — Sí, ___ he visto esta mañana.»",
  "es-ver-11": "Completa: «Escribo una carta a mi abuelo: ___ escribo una carta.»",
  "es-ver-12": "Completa: «¿Le das el libro a Karim? — Sí, ___ doy.»",
  "es-ver-13": "Cambia «este libro» por un pronombre: «Quiero comprar este libro.» → «Quiero ___.»",
  "es-sub-1": "¿Cuál es el presente de subjuntivo de «hablar» con «yo»?",
  "es-sub-2": "¿Cuál es el presente de subjuntivo de «comer» con «nosotros»?",
  "es-sub-3": "¿Cuál es el presente de subjuntivo de «tener» con «yo»?",
  "es-sub-4": "¿Cuál es el presente de subjuntivo de «ir» con «él»?",
  "es-sub-5": "Completa: «Quiero que tú ___ conmigo.» (venir)",
  "es-sub-6": "Completa: «Te explico la regla para que la ___.» (entender)",
  "es-sub-7": "Completa: «Cuando ___ el bachillerato, estudiaré en Argel.» (aprobar, yo)",
  "es-sub-8": "Completa: «Ojalá ___ buen tiempo mañana.» (hacer)",
  "es-sub-9": "Completa: «Creo que Karim ___ razón.» (tener)",
  "es-sub-10": "Completa: «Si estudias, ___ el examen.» (aprobar)",
  "es-sub-11": "Completa: «Si yo ___ dinero, viajaría a España.» (tener)",
  "es-sub-12": "Completa: «Si tuviera tiempo, ___ a mis abuelos.» (visitar, yo)",
  "es-sub-13": "¿Qué frase es correcta?",
  "es-sen-1": "Completa: «No voy al instituto ___ estoy enfermo.»",
  "es-sen-2": "Completa: «Estoy muy cansado. ___, voy a terminar mis deberes.»",
  "es-sen-3": "¿Qué significa «aunque» en árabe?",
  "es-sen-4": "Completa: «Llovía mucho, ___ nos quedamos en casa.»",
  "es-sen-5": "Completa: «El chico ___ vive en Tlemcen es mi primo.»",
  "es-sen-6": "Completa: «Esta es la ciudad ___ nací.»",
  "es-sen-7": "Completa: «No entiendo ___ dices.»",
  "es-sen-8": "Completa: «La profesora con ___ hablé es muy simpática.»",
  "es-sen-9": "Karim: «Estoy cansado.» Completa: «Karim dice que ___ cansado.»",
  "es-sen-10": "Amina: «Tengo un examen.» Completa: «Amina dijo que ___ un examen.»",
  "es-sen-11": "Karim: «Vivo en Orán.» Completa: «Karim dijo que ___ en Orán.»",
  "es-sen-12": "Karim: «Mañana iré a Argel.» Completa: «Karim dijo que al día siguiente ___ a Argel.»",
  "es-txt-1": "Según el texto: «¿Dónde vive Amina?»",
  "es-txt-2": "Según el texto: «¿Desde cuándo estudia Amina español?»",
  "es-txt-3": "Según el texto: «¿Por qué quiere Amina estudiar medicina?»",
  "es-txt-4": "¿Qué frase es correcta según el texto?",
  "es-txt-5": "El contrario de «grande» es:",
  "es-txt-6": "¿Qué significa «el medio ambiente» en árabe?",
  "es-txt-7": "Un sinónimo de «empezar» es:",
  "es-txt-8": "Completa: «Los coches y las fábricas ___ el aire.»",
  "es-txt-9": "¿Qué palabra no pertenece al tema «medios de comunicación»?",
  "es-txt-10": "¿Cómo empiezas una carta personal a tu amiga Amina?",
  "es-txt-11": "¿Cómo termina una carta formal?",
  "es-txt-12": "¿Qué conector sirve para añadir una idea nueva en la redacción?",
  "es-txt-13": "¿Cuál es el orden correcto de una redacción?",
};

/** Every misconception of the Spanish lessons, in Spanish. */
export const SPANISH_MISCONCEPTIONS: Record<string, string> = {
  wrong_auxiliary: "Usar ser, estar o tener en lugar del auxiliar haber",
  participle_form: "Forma incorrecta del participio",
  irregular_as_regular: "Conjugar un verbo irregular como si fuera regular",
  tense_confusion: "Confundir los tiempos verbales",
  conjugation_error: "La forma del verbo no concuerda con el sujeto",
  ser_estar_confusion: "Confundir ser (identidad, características permanentes) y estar (estado temporal, lugar)",
  hay_confusion: "Confundir hay (existencia) con estar, ser o tener",
  gustar_agreement: "Gustar no concuerda con la cosa que gusta (gusta o gustan)",
  gustar_subject: "Usar a la persona como sujeto de gustar",
  gustar_pronoun: "Pronombre incorrecto con gustar (me, te, le, nos, les)",
  pronoun_choice: "Confundir los pronombres de objeto lo, la y le",
  pronoun_position: "Pronombre de objeto en un lugar incorrecto",
  se_lo: "No cambiar le por se delante de lo o la",
  indicative_instead: "Usar el indicativo donde hace falta el subjuntivo",
  wrong_ending: "Terminación incorrecta: la de -ar con -er / -ir, o al revés",
  subjunctive_overuse: "Usar el subjuntivo donde hace falta el indicativo",
  infinitive_instead: "Dejar el verbo en infinitivo en lugar de conjugarlo",
  si_tense: "Tiempos incorrectos en una frase con si",
  connector_meaning: "Confundir el sentido de los conectores (causa, oposición, consecuencia, añadir)",
  relative_choice: "Relativo inadecuado (persona, cosa, lugar, después de preposición)",
  lo_que_confusion: "Confundir que y lo que",
  relative_agreement: "El que o la que no concuerda con el nombre",
  reported_tense: "Error en el cambio de tiempo del estilo indirecto",
  reported_person: "No cambiar la persona en el estilo indirecto",
  comprehension_error: "Información del texto mal comprendida",
  vocab_confusion: "Confundir palabras de forma o sentido parecidos",
  letter_convention: "Error en el saludo o la despedida de la carta",
  structure_error: "Error en la estructura de la redacción o en el conector",
};

/** The remedies of the Spanish lessons, in Spanish. */
export const SPANISH_REMEDIES: Record<string, string> = {
  participle_form: "Con haber, el participio no cambia: -ado para los verbos en -ar, -ido para -er / -ir. Aprende los irregulares: hecho, dicho, escrito, visto, puesto, vuelto, abierto.",
  tense_confusion: "Pregúntate: ¿acción terminada en un momento concreto (ayer)? Indefinido. ¿Descripción o costumbre (antes, siempre)? Imperfecto. ¿Tiempo no terminado (hoy, ya)? Pretérito perfecto.",
  ser_estar_confusion: "Pregúntate: ¿es identidad o característica permanente (nacionalidad, profesión, carácter)? Ser. ¿Es un estado que cambia o un lugar? Estar.",
  gustar_subject: "Gira la frase: la cosa que gusta es el sujeto: «Me gusta el libro». El verbo sigue a la cosa y la persona es un pronombre (me, te, le…).",
  se_lo: "Le / les + lo / la / los / las → se: «Le doy el libro» → «Se lo doy». Nunca decimos «le lo».",
  indicative_instead: "Después de querer que (otro sujeto), para que, cuando + futuro y ojalá: subjuntivo, con la terminación contraria (hable, coma, viva).",
  si_tense: "Si + presente → futuro; si + imperfecto de subjuntivo (tuviera) → condicional (iría). Nunca futuro ni condicional justo después de si.",
  connector_meaning: "Primero busca la relación: causa → porque; oposición → aunque, sin embargo; consecuencia → por eso, así que; añadir → además.",
  reported_tense: "Dice que → el mismo tiempo. Dijo que → el presente pasa a imperfecto y el futuro a condicional.",
  comprehension_error: "Vuelve al texto: busca la palabra clave de la pregunta y lee la frase entera antes de responder.",
  letter_convention: "Amigo: Querido (masculino) o Querida (femenino)… Un abrazo. Formal: Estimado señor o Estimada señora… Atentamente.",
};
