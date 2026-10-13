// The French lessons in French: what the teacher says when the student
// chooses to be taught in French (simple B1 sentences). Each skill gets its
// French edition — name, explanation, worked example and discovery
// dialogue — each bank item a French prompt, and each misconception and
// remedy a French label. Attached in ./index.ts; answers never appear in
// their own hints (server/tafawoq/dialogue.test.ts).
import type { SkillEdition } from "../../curriculum";

export const FRENCH_EDITIONS: Record<string, { title: string; skills: Record<string, SkillEdition> }> = {
  "fr-tenses": {
    title: "Les temps : passé composé, imparfait, futur et conditionnel",
    skills: {
      passe_compose: {
        name: "Le passé composé",
        explanation:
          "Le passé composé = un auxiliaire (avoir ou être) au présent + le participe passé : «J'ai mangé», «Elle est partie». Participe passé : verbes en -er → é (parlé), finir → fini ; irréguliers : pris, fait, vu, eu, été, venu, écrit. La plupart des verbes se conjuguent avec avoir. Les verbes de mouvement ou de changement d'état (aller, venir, partir, arriver, entrer, sortir, naître, mourir, rester…) et les verbes pronominaux (se lever) prennent être, et le participe s'accorde alors avec le sujet : «Elles sont arrivées».",
        example: {
          problem: "Complète : «Ma sœur ___ à Alger hier.» (aller)",
          steps: ["Aller est un verbe de mouvement : auxiliaire être.", "Être avec elle : est.", "Le participe s'accorde avec le sujet féminin : allée."],
          answer: "Ma sœur est allée à Alger hier.",
        },
        dialogue: {
          opening: "Le passé composé a deux parties : un auxiliaire (avoir ou être) au présent et le participe passé. Par exemple : «J'ai mangé», «Elle est partie».",
          steps: [
            { ask: "Regarde : «manger, mangé». Quel est le participe passé de parler ?", answer: "parlé", accept: ["parle"], hint: "Verbes en -er : enlève la terminaison et mets un é." },
            { ask: "Et «choisir, choisi». Quel est le participe passé de finir ?", answer: "fini", hint: "Pour les verbes du deuxième groupe, le participe se termine par un i seul." },
            { ask: "Les verbes de mouvement (aller, venir, partir…) et les verbes pronominaux ne prennent pas avoir. Quel est leur auxiliaire ?", answer: "être", accept: ["etre"], hint: "C'est le verbe de «je suis» et «tu es»." },
            { ask: "Avec cet auxiliaire, le participe s'accorde avec le sujet. Complète : «Amina est ___ à Alger.» (partir)", answer: "partie", hint: "Le participe «parti» + la marque du féminin.", then: "De même : «Ils sont arrivés», «Elles sont venues»." },
          ],
          rule: "Passé composé = avoir ou être au présent + participe passé (-er → é, finir → fini ; irréguliers : pris, fait, vu, eu, été, venu). Les verbes de mouvement et les verbes pronominaux prennent être et le participe s'accorde avec le sujet : «Elle est partie».",
        },
      },
      imparfait_pc: {
        name: "L'imparfait et le passé composé",
        explanation:
          "L'imparfait sert à décrire, à raconter une habitude ou une action en cours dans le passé (autrefois, chaque jour, quand j'étais petit) : radical de nous au présent + -ais, -ais, -ait, -ions, -iez, -aient (nous finissons → je finissais) ; seul irrégulier : être → j'étais. Le passé composé raconte une action précise et terminée (hier, un jour, soudain). Dans un récit, l'arrière-plan est à l'imparfait et l'action qui l'interrompt au passé composé : «Je lisais quand le téléphone a sonné».",
        example: {
          problem: "Complète : «Quand j'étais petit, je ___ à la plage chaque été.» (aller)",
          steps: ["«Quand j'étais petit» et «chaque été» : une habitude passée, donc l'imparfait.", "Radical de nous allons : all-.", "Terminaison de je : -ais. J'allais."],
          answer: "Quand j'étais petit, j'allais à la plage chaque été.",
        },
        dialogue: {
          opening: "Pour raconter au passé, le français utilise deux temps : l'imparfait pour décrire, le passé composé pour une action précise. Voyons la différence.",
          steps: [
            { ask: "«Quand j'étais petit, je jouais dans la rue.» C'est une habitude passée. Quel temps est-ce ?", answer: "imparfait", hint: "Le temps de la description et de la répétition, avec les terminaisons -ais et -ait." },
            { ask: "«Hier, j'ai visité le musée.» C'est une action unique et terminée. Quel temps est-ce ?", answer: "passé composé", accept: ["passe compose"], hint: "Un temps formé d'un auxiliaire et d'un participe." },
            { ask: "Imparfait = radical de nous au présent + -ais, -ais, -ait, -ions, -iez, -aient. Avec «nous finissons», conjugue finir avec je.", answer: "finissais", hint: "Prends le radical finiss- et ajoute la terminaison de je." },
            { ask: "«Je lisais quand le téléphone ___.» (sonner) Conjugue l'action soudaine qui interrompt la scène.", answer: "a sonné", accept: ["a sonne"], hint: "L'action soudaine est au temps composé : avoir avec il + participe." },
          ],
          rule: "Imparfait (radical de nous + -ais, -ait, -ions, -iez, -aient) : description, habitude, arrière-plan. Passé composé : action précise et terminée. «Je lisais (arrière-plan) quand le téléphone a sonné (action)».",
        },
      },
      futur_conditionnel: {
        name: "Le futur simple et le conditionnel présent",
        explanation:
          "Futur simple = infinitif + -ai, -as, -a, -ons, -ez, -ont : «Demain, je voyagerai» (les verbes en -re perdent le e : prendre → je prendrai). Conditionnel présent = radical du futur + terminaisons de l'imparfait (-ais, -ait, -ions…) : «je voyagerais». Radicaux irréguliers : être → ser-, avoir → aur-, aller → ir-, faire → fer-, pouvoir → pourr-, venir → viendr-, voir → verr-. Le conditionnel exprime la politesse (Pourriez-vous… ?), le conseil et l'hypothèse : «Si j'avais le temps, je lirais». Après quand, pour un fait à venir, on met le futur : «Quand tu auras ton bac…».",
        example: {
          problem: "Complète : «Si j'étais ministre, je ___ des hôpitaux.» (construire)",
          steps: ["Si + imparfait : conditionnel présent.", "Radical du futur : construir-.", "Terminaison de je : -ais. Construirais."],
          answer: "Si j'étais ministre, je construirais des hôpitaux.",
        },
        dialogue: {
          opening: "Le futur simple et le conditionnel présent se construisent sur l'infinitif : «parler : je parlerai, je parlerais».",
          steps: [
            { ask: "Futur = infinitif + -ai, -as, -a, -ons, -ez, -ont. Complète : «Demain, je ___ à Oran.» (voyager)", answer: "voyagerai", hint: "Prends l'infinitif entier et ajoute la terminaison de je." },
            { ask: "Certains radicaux sont irréguliers : être → ser-, avoir → aur-, faire → fer-. Quel est le futur de faire avec nous ?", answer: "ferons", hint: "Le radical donné + la terminaison de nous." },
            { ask: "Conditionnel = radical du futur + terminaisons de l'imparfait. Complète : «Si j'étais riche, je ___ le monde.» (voyager)", answer: "voyagerais", hint: "Le radical du futur + la terminaison de je à l'imparfait." },
            { ask: "Pour être poli, on emploie le conditionnel. Le radical de pouvoir est pourr-. Complète : «___-vous m'aider ?»", answer: "pourriez", hint: "Le radical donné + la terminaison de vous à l'imparfait." },
          ],
          rule: "Futur = infinitif + -ai, -as, -a, -ons, -ez, -ont. Conditionnel = radical du futur + -ais, -ais, -ait, -ions, -iez, -aient (politesse, conseil, si + imparfait). Radicaux irréguliers : ser-, aur-, ir-, fer-, pourr-, viendr-, verr-.",
        },
      },
    },
  },
  "fr-grammar": {
    title: "La voix passive, le discours rapporté et les pronoms relatifs",
    skills: {
      passive: {
        name: "La voix passive",
        explanation:
          "À la voix passive, le complément d'objet devient sujet et l'ancien sujet devient complément d'agent, introduit par par : «Le gardien ferme la porte» → «La porte est fermée par le gardien». Forme : être au temps du verbe actif + participe passé accordé avec le nouveau sujet : présent → est fermée, passé composé → a été fermée, imparfait → était fermée, futur → sera fermée.",
        example: {
          problem: "Mets à la voix passive : «Les élèves ont planté des arbres.»",
          steps: ["Le complément «des arbres» devient sujet.", "Passé composé : ont été + participe passé.", "Accord avec arbres (masculin pluriel) : plantés ; l'ancien sujet vient après par."],
          answer: "Des arbres ont été plantés par les élèves.",
        },
        dialogue: {
          opening: "«Le chat mange la souris» est à la voix active. À la voix passive, la souris devient sujet : «La souris est mangée par le chat».",
          steps: [
            { ask: "Quel auxiliaire sert à former la voix passive en français ?", answer: "être", accept: ["etre"], hint: "C'est le verbe de «je suis» et «tu es»." },
            { ask: "Complète au présent : «La souris ___ mangée par le chat.»", answer: "est", hint: "Conjugue l'auxiliaire au présent avec elle." },
            { ask: "L'ancien sujet «le chat» devient complément d'agent. Quelle préposition le précède ?", answer: "par", hint: "Une préposition de trois lettres qui indique l'auteur de l'action." },
            { ask: "Le participe s'accorde avec le nouveau sujet. Complète : «Les lettres sont ___ par Karim.» (envoyer)", answer: "envoyées", accept: ["envoyees"], hint: "Lettres est féminin pluriel : ajoute à «envoyé» les marques du féminin et du pluriel." },
          ],
          rule: "Voix passive = être au temps du verbe actif + participe passé accordé avec le nouveau sujet + par + l'ancien sujet : «La porte est fermée par le gardien», «Des arbres ont été plantés par les élèves».",
        },
      },
      reported_speech: {
        name: "Le discours rapporté",
        explanation:
          "Du discours direct au discours indirect : on supprime les guillemets et on introduit les paroles par que (déclaration), si (question fermée), ce que (pour qu'est-ce que) ou le mot interrogatif lui-même (où, quand, pourquoi). On change les pronoms : «Je suis fatigué» → «Il dit qu'il est fatigué». Si le verbe introducteur est au passé (il a dit), on applique la concordance des temps : présent → imparfait, passé composé → plus-que-parfait, futur → conditionnel ; et les indicateurs de temps changent : demain → le lendemain, hier → la veille, aujourd'hui → ce jour-là.",
        example: {
          problem: "Rapporte : «Elle a dit : “Je viendrai demain.”»",
          steps: ["Verbe introducteur au passé : le futur devient conditionnel, viendrait.", "Je devient elle.", "Demain devient le lendemain."],
          answer: "Elle a dit qu'elle viendrait le lendemain.",
        },
        dialogue: {
          opening: "Au discours indirect, on rapporte les paroles de quelqu'un sans guillemets : «Il dit : “Je suis malade.”» devient «Il dit qu'il est malade».",
          steps: [
            { ask: "Dans «Il dit qu'___ est malade», quel pronom remplace je ?", answer: "il", hint: "Le locuteur devient une troisième personne masculine." },
            { ask: "Si le verbe introducteur est au passé (Il a dit), en quel temps passe le présent ?", answer: "imparfait", hint: "Le temps de la description au passé, terminé par -ait avec elle." },
            { ask: "Et en quel temps passe le futur après un verbe introducteur au passé ?", answer: "conditionnel", hint: "Le temps de la politesse : je voudrais." },
            { ask: "Une question fermée, «Est-ce que tu viens ?», se rapporte avec un petit mot : «Il demande ___ je viens.»", answer: "si", hint: "Un mot de deux lettres qui introduit aussi une condition." },
            { ask: "Et que devient «demain» après un verbe introducteur au passé ?", answer: "le lendemain", accept: ["lendemain"], hint: "Le jour qui suit ce jour-là, dans le passé." },
          ],
          rule: "Discours indirect : que pour une déclaration, si pour une question fermée, ce que pour qu'est-ce que ; les pronoms changent selon le locuteur. Après un verbe introducteur au passé : présent → imparfait, passé composé → plus-que-parfait, futur → conditionnel, demain → le lendemain, hier → la veille.",
        },
      },
      relatives: {
        name: "Les pronoms relatifs",
        explanation:
          "Qui est sujet et il est suivi du verbe : «L'élève qui parle». Que est complément d'objet direct et il est suivi d'un sujet : «Le livre que je lis». Où exprime le lieu ou le temps : «La ville où je suis né», «Le jour où il est venu». Dont remplace de + nom (parler de, avoir besoin de, être fier de) : «Le livre dont je parle». Lequel, laquelle, lesquels, lesquelles s'emploient après une préposition et s'accordent avec le nom : «La raison pour laquelle je suis venu».",
        example: {
          problem: "Complète : «C'est l'ami ___ je t'ai parlé.»",
          steps: ["Le verbe se construit avec de : parler de quelqu'un.", "De + nom : dont."],
          answer: "C'est l'ami dont je t'ai parlé.",
        },
        dialogue: {
          opening: "Le pronom relatif relie deux phrases et remplace un nom. On le choisit selon sa fonction dans la deuxième phrase.",
          steps: [
            { ask: "«L'élève ___ parle est mon frère.» Le pronom est sujet du verbe parle. Qui ou que ?", answer: "qui", hint: "Le pronom sujet, suivi directement du verbe." },
            { ask: "«Le livre ___ je lis est intéressant.» Le pronom est complément d'objet et il est suivi d'un sujet. Qui ou que ?", answer: "que", hint: "Le pronom complément d'objet direct, suivi du sujet je." },
            { ask: "«La ville ___ je suis né.» Quel pronom exprime le lieu et le temps ?", answer: "où", accept: ["ou"], hint: "Un pronom de deux lettres avec un accent grave." },
            { ask: "«Le livre ___ je parle» (parler de). Quel pronom remplace de + nom ?", answer: "dont", hint: "Un pronom de quatre lettres, employé avec les verbes construits avec de." },
          ],
          rule: "Qui = sujet, que = complément d'objet direct, où = lieu ou temps, dont = de + nom, lequel / laquelle / lesquels / lesquelles après une préposition : «La raison pour laquelle je suis venu».",
        },
      },
    },
  },
  "fr-logic": {
    title: "Les rapports logiques : cause, conséquence, subjonctif, but et opposition",
    skills: {
      cause_consequence: {
        name: "Exprimer la cause et la conséquence",
        explanation:
          "La cause répond à «pourquoi ?» : parce que, car, puisque (cause connue de l'interlocuteur), comme (en début de phrase) et, avec un nom, grâce à (résultat positif) ou à cause de (résultat négatif). La conséquence vient après la cause : donc, c'est pourquoi, alors, si bien que, c'est ainsi que. Attention à ne pas inverser : «Il a révisé, donc il a réussi» (la révision est la cause, la réussite la conséquence).",
        example: {
          problem: "Complète : «Il a beaucoup révisé, ___ il a réussi son examen.» (parce que ou c'est pourquoi)",
          steps: ["La réussite est la conséquence de la révision.", "Connecteur de conséquence : c'est pourquoi."],
          answer: "Il a beaucoup révisé, c'est pourquoi il a réussi son examen.",
        },
        dialogue: {
          opening: "Pour argumenter, on relie les idées par des rapports logiques. Les plus fréquents sont la cause (pourquoi ?) et la conséquence (quel résultat ?).",
          steps: [
            { ask: "«Il est absent ___ il est malade.» La maladie est la cause de l'absence. Parce que ou donc ?", answer: "parce que", accept: ["parce qu"], hint: "Le connecteur qui répond à la question «pourquoi ?»." },
            { ask: "«Il a travaillé, ___ il a réussi.» La réussite est une conséquence. Parce que ou donc ?", answer: "donc", hint: "Le connecteur de conséquence en quatre lettres." },
            { ask: "Pour une cause connue de tous, il existe un connecteur qui commence par puis-. Complète : «___ tu es là, aide-moi.»", answer: "puisque", hint: "Puis- suivi de la petite conjonction qui relie les phrases." },
            { ask: "Une cause au résultat positif : «___ ses efforts, il a réussi.» Grâce à ou à cause de ?", answer: "grâce à", accept: ["grace a"], hint: "Une cause heureuse, dont on remercie l'auteur." },
          ],
          rule: "Cause : parce que, car, puisque (cause connue), comme, grâce à (positif), à cause de (négatif). Conséquence : donc, c'est pourquoi, alors, si bien que.",
        },
      },
      subjonctif: {
        name: "Le subjonctif présent",
        explanation:
          "Formation : radical de ils au présent + -e, -es, -e, -ions, -iez, -ent : ils parlent → que je parle, ils finissent → que tu finisses, ils prennent → qu'il prenne ; avec nous et vous, on prend le radical de nous : que nous prenions, que vous veniez. Irréguliers : être → que je sois, que nous soyons ; avoir → que j'aie, qu'il ait ; faire → que je fasse ; pouvoir → que je puisse ; aller → que j'aille ; savoir → que je sache. On l'emploie après l'obligation (il faut que), la volonté (je veux que), le sentiment (je suis content que), le doute, et après pour que, bien que, avant que. Après je pense que, je sais que et parce que, on met l'indicatif.",
        example: {
          problem: "Complète : «Il faut que vous ___ à l'heure.» (venir)",
          steps: ["Il faut que : subjonctif.", "Avec vous, on prend le radical de nous venons : ven-.", "Terminaison de vous : -iez. Veniez."],
          answer: "Il faut que vous veniez à l'heure.",
        },
        dialogue: {
          opening: "Après «il faut que» ou «je veux que», le verbe se met à un mode spécial : le subjonctif. «Il faut que tu travailles.»",
          steps: [
            { ask: "Subjonctif = radical de ils au présent + -e, -es, -e, -ions, -iez, -ent. Avec «ils parlent», complète : «Il faut que je ___.»", answer: "parle", hint: "Le radical parl- + la terminaison de je." },
            { ask: "Avec «ils finissent», complète : «Il faut que tu ___ ton travail.»", answer: "finisses", hint: "Le radical finiss- + la terminaison de tu." },
            { ask: "Faire est irrégulier, son radical est fass-. Complète : «Il faut que tu ___ attention.»", answer: "fasses", hint: "Le radical donné + la terminaison de tu." },
            { ask: "Après «je pense que» à la forme affirmative, quel mode emploie-t-on : subjonctif ou indicatif ?", answer: "indicatif", hint: "Une opinion affirmée présente un fait comme réel." },
          ],
          rule: "Subjonctif présent = radical de ils + -e, -es, -e, -ions, -iez, -ent (irréguliers : sois, aie, fasse, puisse, aille, sache). On l'emploie après il faut que, je veux que, pour que, bien que, avant que ; après je pense que, je sais que et parce que, on met l'indicatif.",
        },
      },
      but_opposition: {
        name: "Exprimer le but, l'opposition et la concession",
        explanation:
          "Le but : pour ou afin de + infinitif (même sujet) : «Il travaille pour réussir» ; pour que ou afin que + subjonctif (sujet différent) : «Il explique pour que les élèves comprennent». L'opposition : mais, cependant, pourtant, en revanche, alors que. La concession : bien que ou quoique + subjonctif : «Bien qu'il soit malade, il est venu» ; malgré + nom : «malgré la pluie».",
        example: {
          problem: "Complète : «___ il fasse froid, il sort sans manteau.» (Bien qu' ou Parce qu')",
          steps: ["Il sort sans manteau malgré le froid : c'est une concession.", "Le verbe fasse est au subjonctif : Bien qu'."],
          answer: "Bien qu'il fasse froid, il sort sans manteau.",
        },
        dialogue: {
          opening: "On exprime aussi le but (dans quelle intention ?) et l'opposition ou la concession (malgré quoi ?). Certains de ces connecteurs demandent le subjonctif.",
          steps: [
            { ask: "«Il étudie ___ réussir.» Un but suivi d'un infinitif : pour ou parce que ?", answer: "pour", hint: "Une préposition de but, suivie directement d'un infinitif." },
            { ask: "«Pour que» exprime le but avec un autre sujet. Quel mode le suit ?", answer: "subjonctif", hint: "Le mode qui suit aussi «il faut que»." },
            { ask: "«___ il pleuve, il sort.» Une concession avec le subjonctif : bien que ou parce que ?", answer: "bien que", accept: ["bien qu"], hint: "Deux mots ; le premier est le contraire de «mal»." },
            { ask: "«Il est riche ; ___, il n'est pas heureux.» Quel connecteur d'opposition, qui commence par pour-, veut dire «malgré cela» ?", answer: "pourtant", accept: ["cependant"], hint: "Pour- suivi de la syllabe -tant." },
          ],
          rule: "But : pour ou afin de + infinitif, pour que ou afin que + subjonctif. Opposition : mais, pourtant, cependant, en revanche. Concession : bien que + subjonctif, malgré + nom.",
        },
      },
    },
  },
  "fr-discourse": {
    title: "Types de textes, argumentation et énonciation",
    skills: {
      text_types: {
        name: "Les types de textes et leurs indices",
        explanation:
          "Le texte narratif raconte des événements successifs : personnages, passé simple ou passé composé pour les actions et imparfait pour l'arrière-plan, indicateurs de temps (un jour, soudain, puis). Le texte descriptif fait voir un lieu ou une personne : imparfait ou présent, adjectifs, indicateurs de lieu (à gauche, au loin). Le texte argumentatif défend une opinion pour convaincre : thèse, arguments, exemples, connecteurs logiques. Le texte expositif (ou explicatif) informe de façon objective : présent de vérité générale, troisième personne, vocabulaire spécialisé et chiffres.",
        example: {
          problem: "Quel est le type de ce texte : «Le palmier dattier pousse dans les régions chaudes et sèches, comme le Sahara. Ses fruits sont les dattes.» ?",
          steps: ["Pas d'événements, pas d'opinion.", "Des informations objectives, au présent et à la troisième personne.", "Le type : expositif."],
          answer: "Un texte expositif.",
        },
        dialogue: {
          opening: "Chaque texte a une intention et des indices qui la montrent. Reconnaître le type de texte est souvent la première question du BAC.",
          steps: [
            { ask: "Un texte raconte des événements successifs, avec des personnages, au passé simple et à l'imparfait. Quel est son type ?", answer: "narratif", hint: "Un texte qui raconte une histoire." },
            { ask: "Un texte fait voir un lieu avec des adjectifs et des indicateurs de lieu (à gauche, au loin). Quel est son type ?", answer: "descriptif", hint: "Un texte qui peint un lieu ou une personne avec des mots." },
            { ask: "Un texte défend une opinion avec des arguments pour convaincre le lecteur. Quel est son type ?", answer: "argumentatif", hint: "Le texte qui cherche à persuader avec des preuves." },
            { ask: "Un texte explique un phénomène de façon objective (présent, troisième personne, chiffres). Quel est son type ?", answer: "expositif", accept: ["explicatif"], hint: "Le texte qui présente des informations au lecteur." },
          ],
          rule: "Narratif : il raconte (événements, personnages, passé simple et imparfait). Descriptif : il décrit (adjectifs, imparfait, indicateurs de lieu). Argumentatif : il veut convaincre (thèse, arguments, connecteurs). Expositif : il informe et explique (présent, objectivité, vocabulaire spécialisé).",
        },
      },
      argumentation: {
        name: "L'argumentation : thèse, arguments et exemples",
        explanation:
          "La thèse est l'opinion que l'auteur défend. Un argument est une raison qui justifie cette opinion ; un exemple est un cas concret qui illustre l'argument (par exemple, ainsi, comme). Connecteurs : pour ordonner (d'abord, ensuite, enfin), pour ajouter (de plus, en outre), pour s'opposer (mais, cependant), pour conclure (donc, en conclusion). La concession reconnaît l'avis contraire avant de le contester : «Certes…, mais…». L'antithèse est la thèse que l'auteur rejette.",
        example: {
          problem: "«Internet est utile aux élèves (1) car il donne accès à beaucoup d'informations (2). Par exemple, on peut consulter des dictionnaires en ligne (3).» Donne le rôle de chaque partie.",
          steps: ["(1) L'opinion de l'auteur : la thèse.", "(2) Introduite par car, elle justifie l'opinion : un argument.", "(3) Introduite par par exemple : un exemple."],
          answer: "(1) thèse, (2) argument, (3) exemple",
        },
        dialogue: {
          opening: "Un texte argumentatif est construit : une opinion, des raisons qui la soutiennent, des cas concrets qui les illustrent et des connecteurs qui organisent le tout.",
          steps: [
            { ask: "Comment appelle-t-on l'opinion que l'auteur défend dans un texte argumentatif ?", answer: "thèse", accept: ["these"], hint: "Un mot de cinq lettres, comme le travail d'un doctorant." },
            { ask: "Et comment appelle-t-on la raison qui justifie cette opinion ?", answer: "argument", hint: "Une preuve logique qui répond à «pourquoi ?»." },
            { ask: "Et le cas concret qui illustre une raison ?", answer: "exemple", hint: "Il est souvent introduit par «ainsi» ou «comme»." },
            { ask: "Un connecteur pour ajouter une raison : «___, internet permet de communiquer.» De plus ou cependant ?", answer: "de plus", accept: ["en outre"], hint: "Un connecteur d'addition en deux mots ; le second veut dire «davantage»." },
          ],
          rule: "Thèse = l'opinion défendue ; argument = la raison qui la justifie ; exemple = un cas concret. Connecteurs : d'abord, ensuite, enfin (ordre) ; de plus, en outre (addition) ; mais, cependant (opposition) ; donc, en conclusion (conclusion) ; «Certes…, mais…» (concession).",
        },
      },
      enonciation: {
        name: "L'énonciation : subjectivité et objectivité",
        explanation:
          "Les indices de la présence de l'énonciateur (subjectivité) : les pronoms de la première et de la deuxième personne (je, nous, vous), les verbes d'opinion (je pense, je crois), le vocabulaire évaluatif mélioratif (magnifique, chef-d'œuvre) ou péjoratif (catastrophe, médiocre), les phrases exclamatives et les modalisateurs de certitude (certainement, sans doute) ou de doute (peut-être, il semble que). Un texte objectif emploie la troisième personne, le présent, un vocabulaire neutre, des faits et des chiffres.",
        example: {
          problem: "Cette phrase est-elle subjective ou objective : «Je trouve ce film magnifique !» ?",
          steps: ["Le pronom je et le verbe d'opinion trouver.", "L'adjectif mélioratif magnifique et le point d'exclamation.", "La phrase est subjective."],
          answer: "Subjective",
        },
        dialogue: {
          opening: "L'auteur se montre-t-il dans son texte ou se cache-t-il ? Les indices de l'énonciation révèlent la subjectivité ou l'objectivité.",
          steps: [
            { ask: "«Je trouve ce film magnifique !» Cette phrase est-elle subjective ou objective ?", answer: "subjective", accept: ["subjectif"], hint: "On y trouve l'avis personnel du locuteur et une exclamation." },
            { ask: "«Il est peut-être trop tard.» «Peut-être» exprime-t-il la certitude ou le doute ?", answer: "doute", hint: "Le contraire de la certitude." },
            { ask: "Le mot «chef-d'œuvre» fait l'éloge d'une œuvre. Est-il mélioratif ou péjoratif ?", answer: "mélioratif", accept: ["melioratif"], hint: "Le terme qui commence par méli- et exprime un jugement positif." },
            { ask: "Un texte objectif emploie surtout quelle personne : la première ou la troisième ?", answer: "troisième", accept: ["troisieme"], hint: "La personne de il, elle et on." },
          ],
          rule: "Subjectivité : je et nous, verbes d'opinion, mots mélioratifs ou péjoratifs, exclamations, modalisateurs (peut-être pour le doute, certainement pour la certitude). Objectivité : troisième personne, présent, vocabulaire neutre, faits et chiffres.",
        },
      },
    },
  },
  "fr-text": {
    title: "Compréhension de l'écrit, vocabulaire et production écrite",
    skills: {
      comprehension: {
        name: "La compréhension de l'écrit",
        explanation:
          "Lis d'abord la question et repère le mot interrogatif : Qui ? (la personne), Que ou Quoi ? (la chose), Où ? (le lieu), Quand ? (le moment), Pourquoi ? (la cause), Comment ? (la manière). Cherche dans le texte la phrase qui contient l'information, puis réponds par une phrase complète, avec tes mots. On répond souvent à «Pourquoi ?» par «Parce que…». Pour un pronom (à quoi renvoie «la» ?), remonte au nom cité avant, de même genre et de même nombre.",
        example: {
          problem: "Texte : «Lina reste à la maison car elle est malade.» Pourquoi Lina reste-t-elle à la maison ?",
          steps: ["Pourquoi : on cherche la cause.", "La cause est après car : elle est malade.", "On commence la réponse par Parce que."],
          answer: "Parce qu'elle est malade.",
        },
        dialogue: {
          opening: "Pour comprendre un texte, on part de la question : le mot interrogatif dit quelle information chercher dans le texte.",
          steps: [
            { ask: "Quel mot interrogatif demande le lieu ?", answer: "où", accept: ["ou"], hint: "Un mot de deux lettres avec un accent grave." },
            { ask: "Et quel mot interrogatif demande la cause ?", answer: "pourquoi", hint: "On y répond par «Parce que…»." },
            { ask: "Texte : «Yasmine nettoie la plage car elle aime la mer.» Pourquoi Yasmine nettoie-t-elle la plage ? Complète : «Parce qu'…»", answer: "elle aime la mer", hint: "Cherche ce qui vient après le connecteur de cause car." },
            { ask: "«La mer nous donne beaucoup ; nous devons la protéger.» À quoi renvoie le pronom «la» dans «la protéger» ?", answer: "la mer", accept: ["mer"], hint: "Un nom féminin cité au début de la même phrase." },
          ],
          rule: "Qui : la personne. Où : le lieu. Quand : le moment. Pourquoi : la cause (réponse : Parce que…). Comment : la manière. On cherche la phrase dans le texte et on répond par une phrase complète ; un pronom renvoie à un nom cité avant, de même genre et de même nombre.",
        },
      },
      vocabulary: {
        name: "Le vocabulaire : synonymes, antonymes et familles de mots",
        explanation:
          "Les thèmes du BAC : l'environnement (la pollution, protéger, recycler), les médias (la presse, une émission, informer), la solidarité (une association, aider, le bénévolat). On demande le synonyme (protéger = préserver), l'antonyme (propre ≠ sale) et la famille de mots : des mots formés sur le même radical (polluer → pollution, pollué, polluant). Attention aux mots qui se ressemblent : population n'est pas de la famille de polluer.",
        example: {
          problem: "Quel nom appartient à la famille du verbe «informer» ?",
          steps: ["Le radical : inform-.", "Le nom avec le suffixe -ation."],
          answer: "information",
        },
        dialogue: {
          opening: "Les questions de vocabulaire du BAC portent sur le synonyme, l'antonyme, la famille de mots et le sens.",
          steps: [
            { ask: "Quel est l'antonyme de «propre» ?", answer: "sale", hint: "Un adjectif pour une chose couverte de poussière et de taches." },
            { ask: "Un synonyme de «protéger» : préserver ou détruire ?", answer: "préserver", accept: ["preserver"], hint: "Choisis le verbe qui ne veut pas dire casser." },
            { ask: "Quel nom appartient à la famille du verbe «polluer» ?", answer: "pollution", hint: "Le radical pollu- + le suffixe -tion." },
            { ask: "«La solidarité», est-ce s'entraider ou se disputer ?", answer: "s'entraider", accept: ["entraider"], hint: "Aider les autres et être aidé par eux." },
          ],
          rule: "Apprends les mots par thèmes (environnement, médias, solidarité), par paires (propre ≠ sale, protéger = préserver) et par familles (polluer → pollution, pollué, polluant). Attention aux ressemblances : solidarité n'est pas solidité.",
        },
      },
      writing: {
        name: "La production écrite : le plan et la lettre",
        explanation:
          "Le plan : l'introduction présente le sujet, pose la problématique et annonce le plan ; le développement contient un paragraphe par argument, avec des connecteurs (d'abord, ensuite, de plus, enfin) ; la conclusion fait le bilan, donne ton avis et peut ouvrir une perspective. La lettre officielle : expéditeur et destinataire, lieu et date (Béjaïa, le 10 mai 2026), objet (Objet :), formule d'appel (Madame, Monsieur, ou Monsieur le Directeur,), puis formule de politesse : «Veuillez agréer, Monsieur, l'expression de mes salutations distinguées.» et signature. La lettre amicale : Cher Karim, ou Chère Amina, … Je t'embrasse, À bientôt.",
        example: {
          problem: "Écris la formule d'appel et la formule finale d'une lettre à la directrice du lycée.",
          steps: ["Formule d'appel officielle au féminin : Madame la Directrice,", "Formule finale : Veuillez agréer, Madame la Directrice, l'expression de mes salutations distinguées."],
          answer: "Madame la Directrice, … Veuillez agréer, Madame la Directrice, l'expression de mes salutations distinguées.",
        },
        dialogue: {
          opening: "Au BAC, la production écrite est souvent un texte argumentatif ou une lettre. Les deux ont des règles fixes.",
          steps: [
            { ask: "Une lettre officielle au chef du lycée commence par : «Monsieur le ___,»", answer: "Directeur", hint: "Le titre de la personne qui dirige l'établissement." },
            { ask: "La formule finale officielle : «Veuillez ___, Monsieur, l'expression de mes salutations distinguées.»", answer: "agréer", accept: ["agreer"], hint: "Un verbe qui veut dire «accepter, recevoir»." },
            { ask: "Le plan d'un texte : introduction, puis quelle partie, puis conclusion ?", answer: "développement", accept: ["developpement"], hint: "La partie centrale, avec les arguments et les exemples." },
            { ask: "Une lettre amicale à un ami : «___ Karim,»", answer: "Cher", hint: "Un adjectif affectueux de quatre lettres, au masculin." },
          ],
          rule: "Lettre officielle : Madame, Monsieur, ou Monsieur le Directeur, … Veuillez agréer… l'expression de mes salutations distinguées. Lettre amicale : Cher Karim, ou Chère Amina, … Je t'embrasse. Plan : introduction (problématique et annonce du plan), développement (arguments et exemples), conclusion (bilan et avis).",
        },
      },
    },
  },
};

/** The bank items' prompts in French (the oral quiz in "Français"). */
export const FRENCH_PROMPTS: Record<string, string> = {
  "fr-ten-1": "Complète : «Hier, nous ___ un film au cinéma.» (voir)",
  "fr-ten-2": "Complète : «Ma sœur ___ à Alger la semaine dernière.» (aller)",
  "fr-ten-3": "Quel est le participe passé de «prendre» ?",
  "fr-ten-4": "Complète : «Ce matin, les garçons ___ tôt.» (se lever)",
  "fr-ten-5": "Complète : «Quand j'étais petit, je ___ au football tous les jours.» (jouer)",
  "fr-ten-6": "Quel est l'imparfait de «finir» avec «nous» ?",
  "fr-ten-7": "Complète : «Il ___ quand je suis sorti de la maison.» (pleuvoir)",
  "fr-ten-8": "Complète : «Je lisais tranquillement quand le téléphone ___.» (sonner)",
  "fr-ten-9": "Complète : «Demain, nous ___ pour Oran.» (partir)",
  "fr-ten-10": "Quel est le futur simple de «avoir» avec «je» ?",
  "fr-ten-11": "Complète : «Si j'avais le temps, je ___ le Sahara.» (visiter)",
  "fr-ten-12": "Une demande polie : «___-vous m'aider, s'il vous plaît ?» (pouvoir)",
  "fr-ten-13": "Complète : «Quand tu ___ ton bac, tu iras à l'université.» (avoir)",
  "fr-gra-1": "Mets à la voix passive : «Le gardien ferme la porte.»",
  "fr-gra-2": "Mets à la voix passive : «Les élèves ont planté des arbres.»",
  "fr-gra-3": "Complète à la voix passive, au futur : «Cette lettre ___ par le directeur demain.» (signer)",
  "fr-gra-4": "Quelle phrase est à la voix passive ?",
  "fr-gra-5": "Rapporte : «Il dit : “Je suis fatigué.”»",
  "fr-gra-6": "Rapporte : «Elle a dit : “Je viendrai demain.”»",
  "fr-gra-7": "Rapporte : «Il me demande : “Est-ce que tu as faim ?”»",
  "fr-gra-8": "Rapporte : «Le professeur nous a demandé : “Qu'est-ce que vous faites ?”»",
  "fr-gra-9": "Complète : «C'est le livre ___ j'ai lu.»",
  "fr-gra-10": "Complète : «L'élève ___ parle est mon frère.»",
  "fr-gra-11": "Complète : «La ville ___ je suis né est Constantine.»",
  "fr-gra-12": "Complète : «Le projet ___ je te parle est important.»",
  "fr-gra-13": "Complète : «C'est la raison pour ___ je suis venu.»",
  "fr-log-1": "Quel connecteur exprime la cause ?",
  "fr-log-2": "Complète : «Il a beaucoup révisé, ___ il a réussi son examen.»",
  "fr-log-3": "Complète : «La pollution augmente ___ les usines rejettent des fumées.»",
  "fr-log-4": "Complète : «___ ses efforts, il a obtenu son bac avec mention.»",
  "fr-log-5": "Complète : «Il faut que tu ___ tes devoirs.» (faire)",
  "fr-log-6": "Quel est le subjonctif présent de «être» avec «nous» ?",
  "fr-log-7": "Complète : «Je veux que vous ___ à l'heure.» (venir)",
  "fr-log-8": "Complète : «Je sais que tu ___ raison.» (avoir)",
  "fr-log-9": "Complète : «Il travaille dur ___ réussir.»",
  "fr-log-10": "Complète : «Le professeur parle lentement pour que les élèves ___ comprendre.» (pouvoir)",
  "fr-log-11": "Complète : «___ il fasse froid, il sort sans manteau.»",
  "fr-log-12": "Complète : «Bien qu'il ___ malade, il est venu en classe.» (être)",
  "fr-log-13": "Complète : «Il est intelligent ; ___, il a échoué à l'examen.»",
  "fr-dis-1": "Quel est le type du texte qui commence par : «Il était une fois un vieux pêcheur qui vivait à Annaba…» ?",
  "fr-dis-2": "Quel est l'indice dominant du texte descriptif ?",
  "fr-dis-3": "Quel est le type de ce texte : «Le palmier dattier pousse dans les régions chaudes et sèches, comme le Sahara. Ses fruits sont les dattes.» ?",
  "fr-dis-4": "Quelle est l'intention principale d'un texte argumentatif ?",
  "fr-dis-5": "Qu'est-ce que «la thèse» dans un texte argumentatif ?",
  "fr-dis-6": "«Internet est utile aux élèves car il donne accès à beaucoup d'informations. Par exemple, on peut consulter des dictionnaires en ligne.» Quel est le rôle de «il donne accès à beaucoup d'informations» ?",
  "fr-dis-7": "Quel connecteur ajoute un nouvel argument ?",
  "fr-dis-8": "Complète la concession : «Certes, la télévision distrait les jeunes, ___ elle les instruit aussi.»",
  "fr-dis-9": "Quelle phrase est subjective ?",
  "fr-dis-10": "Dans «Il est peut-être trop tard», qu'exprime «peut-être» ?",
  "fr-dis-11": "Quels sont les indices de l'énonciation dans : «Je pense que nous devons protéger notre planète.» ?",
  "fr-dis-12": "Qu'est-ce qui caractérise un texte objectif ?",
  "fr-dis-13": "Dans «Ce projet est une véritable catastrophe», le mot «catastrophe» est un mot :",
  "fr-txt-1": "D'après le texte : «Où habite Yasmine ?»",
  "fr-txt-2": "D'après le texte : «Quel métier Yasmine veut-elle exercer ?»",
  "fr-txt-3": "D'après le texte : «Pourquoi Yasmine veut-elle devenir journaliste ?»",
  "fr-txt-4": "Dans «nous devons la protéger», à quoi renvoie le pronom «la» ?",
  "fr-txt-5": "Quel est l'antonyme de «propre» ?",
  "fr-txt-6": "Quel est le synonyme de «protéger» ?",
  "fr-txt-7": "Quel mot appartient à la famille du verbe «polluer» ?",
  "fr-txt-8": "Que signifie «la solidarité» en arabe ?",
  "fr-txt-9": "Quel mot appartient au champ lexical des médias ?",
  "fr-txt-10": "Quelle formule d'appel convient à une lettre officielle au directeur du lycée ?",
  "fr-txt-11": "Quelle formule finale convient à une lettre officielle ?",
  "fr-txt-12": "Dans quelle partie du texte pose-t-on la problématique et annonce-t-on le plan ?",
  "fr-txt-13": "Quel est le rôle de la conclusion ?",
};

/** The misconception labels of the French lessons, in French. */
export const FRENCH_MISCONCEPTIONS: Record<string, string> = {
  wrong_auxiliary: "Confondre les auxiliaires avoir et être",
  agreement_error: "Erreur d'accord du participe passé avec le sujet",
  participle_form: "Mauvaise forme du participe passé, ou confusion avec le participe présent",
  irregular_as_regular: "Conjuguer un verbe irrégulier comme un verbe régulier",
  tense_confusion: "Confondre les temps",
  conjugation_error: "Conjugaison qui ne correspond pas au sujet",
  passive_agent: "Inverser le sujet et le complément en passant au passif",
  passive_tense: "Mettre être à un autre temps que le verbe actif",
  passive_agreement: "Ne pas accorder le participe avec le nouveau sujet",
  active_form: "Laisser le verbe à la voix active",
  etre_not_passive: "Croire que tout verbe avec être est au passif (passé composé des verbes de mouvement)",
  reported_tense: "Erreur de concordance des temps au discours indirect",
  reported_person: "Ne pas changer les pronoms selon le locuteur",
  reported_time: "Ne pas changer les indicateurs de temps (demain → le lendemain)",
  reported_question: "Mauvais mot pour rapporter une question (que au lieu de si, ou garder est-ce que)",
  relative_choice: "Pronom relatif qui ne correspond pas à sa fonction",
  dont_misuse: "Employer que au lieu de dont après un verbe construit avec de",
  relative_agreement: "Lequel ne s'accorde pas avec le nom",
  cause_consequence_confusion: "Inverser la cause et la conséquence",
  connector_meaning: "Confondre le sens des connecteurs (cause, but, opposition, addition)",
  grace_a_cause_de: "Confondre grâce à (cause positive) et à cause de (cause négative)",
  mood_indicative: "Employer l'indicatif là où il faut le subjonctif",
  subjunctive_overuse: "Employer le subjonctif là où il faut l'indicatif",
  subjonctif_form: "Mauvaise forme du subjonctif",
  type_confusion: "Confondre les types de textes et leurs intentions",
  indice_confusion: "Attribuer les indices d'un type de texte à un autre",
  thesis_argument: "Confondre thèse, argument et exemple",
  connector_function: "Se tromper sur le rôle d'un connecteur dans l'argumentation",
  subjectivity_confusion: "Confondre les indices de subjectivité et d'objectivité",
  modalisation_confusion: "Se tromper sur le sens d'un modalisateur ou d'un mot évaluatif (doute ou certitude, mélioratif ou péjoratif)",
  comprehension_error: "Information du texte mal comprise",
  referent_error: "Se tromper sur le nom que remplace un pronom",
  vocab_confusion: "Confondre des mots de forme ou de sens proches",
  antonym_instead: "Choisir un antonyme au lieu d'un synonyme",
  family_confusion: "Choisir un mot qui ressemble au radical sans être de la même famille",
  letter_convention: "Erreur dans la formule d'appel ou la formule finale de la lettre",
  structure_error: "Erreur sur les parties du plan et leur rôle",
};

/** The remedies of the French lessons, in French. */
export const FRENCH_REMEDIES: Record<string, string> = {
  wrong_auxiliary: "Les verbes de mouvement et de changement d'état (aller, venir, partir, arriver, naître, mourir, rester…) et les verbes pronominaux prennent être ; tous les autres prennent avoir.",
  agreement_error: "Avec être, demande-toi : qui est le sujet ? Féminin → ajoute e ; pluriel → ajoute s : «Elles sont parties».",
  tense_confusion: "Demande-toi : description ou habitude passée → imparfait ; action précise et terminée → passé composé ; hypothèse avec si + imparfait ou politesse → conditionnel ; action à venir → futur.",
  passive_tense: "Regarde le temps du verbe actif et mets être à ce temps : ferme → est fermée, a fermé → a été fermée, fermera → sera fermée.",
  passive_agreement: "Au passif, le participe s'accorde avec le nouveau sujet : féminin → e, pluriel → s.",
  reported_tense: "Après un verbe introducteur au passé : présent → imparfait, passé composé → plus-que-parfait, futur → conditionnel. Après un verbe au présent, le temps ne change pas.",
  reported_question: "Question fermée → si ; qu'est-ce que → ce que ; les mots interrogatifs (où, quand…) restent les mêmes, et on n'emploie jamais est-ce que au discours indirect.",
  relative_choice: "Cherche la fonction du pronom : sujet → qui ; complément d'objet direct → que ; lieu ou temps → où ; après de → dont.",
  dont_misuse: "Si le verbe se construit avec de (parler de, avoir besoin de), le pronom est dont et non que.",
  cause_consequence_confusion: "Demande-toi ce qui arrive en premier : le premier fait est la cause (parce que, car, puisque), le second la conséquence (donc, c'est pourquoi, si bien que).",
  connector_meaning: "Trouve d'abord le rapport : cause → parce que ; conséquence → donc ; but → pour (que) ; opposition → mais, pourtant, cependant ; concession → bien que.",
  mood_indicative: "Après il faut que, je veux que, pour que, bien que, avant que : subjonctif (que je sois, que tu fasses, qu'ils puissent).",
  subjunctive_overuse: "Après je pense que, je sais que, parce que, après que : indicatif, car on présente un fait réel.",
  subjonctif_form: "Prends le radical de ils au présent et ajoute -e, -es, -e, -ions, -iez, -ent ; apprends les irréguliers : sois, aie, fasse, puisse, aille, sache.",
  type_confusion: "Cherche l'intention du texte : il raconte → narratif ; il décrit → descriptif ; il veut convaincre → argumentatif ; il informe et explique → expositif.",
  thesis_argument: "La thèse est une opinion (que pense l'auteur ?), l'argument une raison (pourquoi ?), l'exemple un cas concret (par exemple).",
  subjectivity_confusion: "Cherche je ou nous, les verbes d'opinion, les mots évaluatifs et les exclamations → subjectivité ; la troisième personne, les chiffres et un vocabulaire neutre → objectivité.",
  comprehension_error: "Retourne au texte : cherche le mot clé de la question et lis toute la phrase avant de répondre.",
  referent_error: "Un pronom renvoie à un nom cité avant, de même genre et de même nombre : la → un nom féminin singulier.",
  letter_convention: "Lettre officielle : Madame, Monsieur, … Veuillez agréer… l'expression de mes salutations distinguées. Lettre amicale : Cher ou Chère… Je t'embrasse.",
  structure_error: "Introduction : sujet, problématique, annonce du plan ; développement : arguments et exemples ; conclusion : bilan, avis et ouverture.",
};
