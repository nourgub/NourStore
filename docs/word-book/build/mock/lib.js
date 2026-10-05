// Illustrated recreation of the French Word (Microsoft 365) interface, used for the book's figures.
// Each figure is drawn from scratch (no screenshot pixels); numbered gold markers are placed by data-m attributes.
const BLUE = '#2B579A';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const M = (n, pos) => n ? ` data-m="${n}"${pos ? ` data-mp="${pos}"` : ''}` : '';

// ---------- icons ----------
const ICON = {
  coller: '📋', couper: '✂', copier: '⧉', pinceau: '🖌', table: '▦', image: '🖼', forme: '◆', icone: '★', smart: '⛬',
  graph: '📊', capture: '⌗', lien: '🔗', comment: '💬', entete: '▤', pied: '▥', num: '#', zone: 'A', wordart: 'A',
  eq: 'π', sym: 'Ω', marges: '▭', orient: '⇵', taille: '▯', col: '▥', saut: '⤓', theme: 'Aa', fil: '▧', couleur: '🎨',
  bord: '▢', toc: '☰', maj: '⟳', note: 'ab¹', fin: 'ᵢ', cite: '❝', biblio: '📚', leg: '🏷', tdi: '☷', edit: '✔',
  thes: '📖', stat: '¹²³', voix: '🔊', trad: '文', suivi: '✎', accept: '✓', refus: '✗', prev: '◀', next: '▶', comp: '⇆',
  prot: '🔒', lect: '📖', page: '📄', web: '🌐', plan: '☰', zoom: '🔍', fen: '⧉', env: '✉', etiq: '🏷', fusion: '⇶',
  dest: '👥', champ: '«»', apercu: '👁', term: '⇲', search: '🔍', repl: '⇄', select: '⬚', edt: '✒', supp: '✖',
  ins: '⊞', merge: '⊟', split: '⊠', trier: '⇅', formule: 'fx', rogner: '⌗', fond: '✂', corr: '☀', habill: '⊡',
  date: '📅', fermer: '✖', nav: '⇵', aide: '?', dessin: '✏', pdf: '📄', share: '⇪', save: '💾', undo: '↶', redo: '↷',
};
const ic = (k, big) => `<span class="ic${big ? ' big' : ''}">${ICON[k] || k}</span>`;

// ---------- ribbon controls ----------
const big = (label, icon, m, o = {}) => `<div class="btn big${o.on ? ' on' : ''}${o.dd ? ' dd' : ''}"${M(m, o.mp)}>${ic(icon, 1)}<span>${label}${o.dd !== false && o.dd ? ' ▾' : ''}</span></div>`;
const sm = (label, icon, m, o = {}) => `<div class="btn sm${o.on ? ' on' : ''}"${M(m, o.mp)}>${icon ? ic(icon) : ''}<span>${label}${o.dd ? ' ▾' : ''}</span></div>`;
const tiny = (txt, m, o = {}) => `<div class="btn tiny${o.on ? ' on' : ''}" ${o.style ? `style="${o.style}"` : ''}${M(m, o.mp)}>${txt}</div>`;
const col = (...items) => `<div class="col">${items.join('')}</div>`;
const row = (...items) => `<div class="row">${items.join('')}</div>`;
const combo = (val, w, m) => `<div class="combo" style="width:${w}px"${M(m)}>${val}<span>▾</span></div>`;
const chk = (label, on, m) => `<div class="chk"${M(m)}><span class="box">${on ? '✓' : ''}</span>${label}</div>`;
const gal = (items, m, o = {}) => `<div class="gal"${M(m, o.mp)}>${items.map((x, i) => `<div class="gi${i === (o.sel ?? -1) ? ' sel' : ''}" style="${x.st || ''}"${M(x.m, 'b')}>${x.t}</div>`).join('')}<div class="gscroll"${M(o.m2, 'r')}>▴<br>▾<br>⏷</div></div>`;
const grp = (name, body, o = {}) => `<div class="grp"${M(o.m, o.mp)}><div class="gbody">${body}</div><div class="gname">${name}${o.launcher ? `<span class="launch"${M(o.launcher === true ? 0 : o.launcher, "b")}>↘</span>` : ''}</div></div>`;

// ---------- ribbons ----------
const R = {};
R.Accueil = (m = {}) => [
  grp('Presse-papiers', big('Coller', 'coller', 0, { dd: 1 }) + col(sm('', 'couper'), sm('', 'copier'), sm('', 'pinceau', m.pinceau)), { launcher: m.ppl }),
  grp('Police', col(row(combo('Calibri (Corps)', 132, m.font), combo('11', 44, m.size), tiny('A<sup>↑</sup>', m.grow), tiny('A<sub>↓</sub>'), tiny('Aa ▾'), tiny('<s>A</s>✕', m.clear)),
    row(tiny('<b>G</b>', m.bold), tiny('<i>I</i>'), tiny('<u>S</u>'), tiny('<s>ab</s>'), tiny('x₂'), tiny('x²'), tiny('<span style="background:#ff0;padding:0 2px">ab</span>▾', m.hl), tiny('<span style="border-bottom:3px solid #d00">A</span>▾', m.color))),
    { launcher: m.policeL, m: m.police }),
  grp('Paragraphe', col(row(tiny('☰•▾', m.puces), tiny('☰1▾', m.numero), tiny('☰⋮▾'), tiny('⇤', m.ret1), tiny('⇥', m.ret2), tiny('⇅'), tiny('¶', m.pilcrow, { on: m.pilOn })),
    row(tiny('≡', m.al1, { style: 'text-align:left' }), tiny('≣', m.al2), tiny('≡', m.al3), tiny('☰', m.al4), tiny('↕▾', m.inter), tiny('◪▾', m.trame), tiny('⊞▾', m.bord)),
    row(tiny('¶◂ <small>De gauche à droite</small>', m.ltr), tiny('▸¶ <small>De droite à gauche</small>', m.rtl))),
    { launcher: m.paraL, m: m.para }),
  grp('Styles', gal([{ t: 'AaBbCcDd<br><small>¶ Normal</small>', m: m.sNormal }, { t: 'AaBbCcDd<br><small>¶ Sans inter...</small>' }, { t: '<span style="color:#2F5496;font-size:17px">AaBbCc</span><br><small>Titre 1</small>', m: m.sTitre }, { t: '<span style="color:#2F5496;font-size:15px">AaBbCcE</span><br><small>Titre 2</small>' }, { t: '<span style="font-size:20px">AaB</span><br><small>Titre</small>' }], m.styles, { sel: m.styleSel, m2: m.stylesMore }), { launcher: m.stylesL }),
  grp('Édition', col(sm('Rechercher', 'search', m.find, { dd: 1 }), sm('Remplacer', 'repl', m.repl), sm('Sélectionner', 'select', 0, { dd: 1 }))),
  grp('Éditeur', big('Éditeur', 'edt', m.editeur)),
];
R.Insertion = (m = {}) => [
  grp('Pages', col(sm('Page de garde', 'page', 0, { dd: 1 }), sm('Page vierge', 'page'), sm('Saut de page', 'saut'))),
  grp('Tableaux', big('Tableau', 'table', m.tableau, { dd: 1, on: m.tabOn })),
  grp('Illustrations', big('Images', 'image', m.images, { dd: 1, on: m.imgOn }) + col(sm('Formes', 'forme', 0, { dd: 1 }), sm('Icônes', 'icone'), sm('Modèles 3D', '⬢', 0, { dd: 1 })) + col(sm('SmartArt', 'smart', m.smart), sm('Graphique', 'graph'), sm('Capture', 'capture', 0, { dd: 1 }))),
  grp('Liens', col(sm('Lien', 'lien', 0, { dd: 1 }), sm('Signet', '🔖'), sm('Renvoi', '↪'))),
  grp('Commentaires', big('Commentaire', 'comment')),
  grp('En-tête et pied de page', col(sm('En-tête', 'entete', m.entete, { dd: 1 }), sm('Pied de page', 'pied', 0, { dd: 1 }), sm('Numéro de page', 'num', m.numpage, { dd: 1, on: m.numOn }))),
  grp('Texte', big('Zone de texte', 'zone', m.zone, { dd: 1 }) + col(sm('', 'wordart'), sm('', 'A≡'), sm('', '✍'))),
  grp('Symboles', col(sm('Équation', 'eq', 0, { dd: 1 }), sm('Symbole', 'sym', 0, { dd: 1 }))),
];
R.Création = (m = {}) => [
  grp('Mise en forme du document', big('Thèmes', 'theme', m.themes, { dd: 1 }) + gal([{ t: '<b>Titre</b><br><small>Titre 1</small>' }, { t: '<b style="color:#2F5496">TITRE</b><br><small>Titre 1</small>' }, { t: '<b style="color:#C55A11">Titre</b><br><small>TITRE 1</small>' }, { t: '<b>Titre</b><br><small>— Titre 1</small>' }, { t: '<b style="color:#538135">Titre</b><br><small>Titre 1</small>' }], m.gallery) + col(sm('Couleurs', '🎨'), sm('Polices', 'A')), { m: m.miseforme }),
  grp('Arrière-plan de la page', big('Filigrane', 'fil', m.filigrane, { dd: 1, on: m.filOn }) + big('Couleur de page', 'couleur', m.coulpage, { dd: 1 }) + big('Bordures de page', 'bord', m.bordpage)),
];
R['Mise en page'] = (m = {}) => [
  grp('Mise en page', big('Marges', 'marges', m.marges, { dd: 1, on: m.margOn }) + big('Orientation', 'orient', m.orient, { dd: 1 }) + big('Taille', 'taille', m.taille, { dd: 1 }) + big('Colonnes', 'col', m.colonnes, { dd: 1 }) + col(sm('Sauts de page', 'saut', m.sauts, { dd: 1, on: m.sautOn }), sm('Numéros de ligne', '1≡', 0, { dd: 1 }), sm('Coupure de mots', 'a-', 0, { dd: 1 })), { launcher: m.mpL }),
  grp('Paragraphe', col(`<div class="lbl">Retrait</div>`, row('<span class="k">⇥ Gauche :</span>', combo('0 cm', 70)), row('<span class="k">⇤ Droite :</span>', combo('0 cm', 70))) + col(`<div class="lbl">Espacement</div>`, row('<span class="k">↥ Avant :</span>', combo('0 pt', 70)), row('<span class="k">↧ Après :</span>', combo('8 pt', 70)))),
  grp('Organiser', col(sm('Position', '⊡', 0, { dd: 1 }), sm('Habillage', 'habill', 0, { dd: 1 }), sm('Avancer', '⬒', 0, { dd: 1 })) + col(sm('Reculer', '⬓', 0, { dd: 1 }), sm('Volet Sélection', '☰'), sm('Aligner', '⫶', 0, { dd: 1 }))),
];
R.Références = (m = {}) => [
  grp('Table des matières', big('Table des matières', 'toc', m.toc, { dd: 1, on: m.tocOn }) + col(sm('Ajouter le texte', '+', 0, { dd: 1 }), sm('Mettre à jour la table', 'maj')), { m: m.gtoc }),
  grp('Notes de bas de page', big('Insérer une note<br>de bas de page', 'note', m.note) + col(sm('Insérer une note de fin', 'fin', m.fin), sm('Note suivante', 'next', 0, { dd: 1 }), sm('Afficher les notes', '☰')), { m: m.gnote, launcher: true }),
  grp('Recherche', big('Rechercher', 'search') + big('Recherche', '🔎')),
  grp('Citations et bibliographie', big('Insérer une<br>citation', 'cite', m.cite, { dd: 1 }) + col(sm('Gérer les sources', '☷'), sm('Style : APA', '', 0, { dd: 1 }), sm('Bibliographie', 'biblio', 0, { dd: 1 })), { m: m.gcite }),
  grp('Légendes', big('Insérer une<br>légende', 'leg', m.legende) + col(sm('Insérer une table des illustrations', 'tdi', m.tdi), sm('Mettre à jour la table', 'maj'), sm('Renvoi', '↪')), { m: m.gleg }),
  grp('Index', big('Entrée', '⊕')),
];
R.Publipostage = (m = {}) => [
  grp('Créer', big('Enveloppes', 'env') + big('Étiquettes', 'etiq')),
  grp('Démarrer la fusion et le publipostage', big('Démarrer la fusion et<br>le publipostage', 'fusion', m.start, { dd: 1 }) + big('Sélection des<br>destinataires', 'dest', m.dest, { dd: 1 }) + big('Modifier la liste<br>de destinataires', '✎')),
  grp('Champs d’écriture et d’insertion', big('Mettre en surbrillance<br>les champs de fusion', '▦') + big('Bloc<br>d’adresse', '▤') + big('Ligne de<br>salutation', '✉') + big('Insérer un champ<br>de fusion', 'champ', m.champ, { dd: 1 }) + col(sm('Règles', '?', 0, { dd: 1 }), sm('Faire correspondre les champs', '⇆'), sm('Mettre à jour les étiquettes', 'maj'))),
  grp('Aperçu des résultats', big('Aperçu des<br>résultats', 'apercu', m.apercu) + col(row(tiny('⏮'), tiny('◀'), combo('1', 40), tiny('▶'), tiny('⏭')), sm('Rechercher un destinataire', 'search'), sm('Vérification des erreurs', '✔'))),
  grp('Terminer', big('Terminer et<br>fusionner', 'term', m.terminer, { dd: 1 })),
];
R.Révision = (m = {}) => [
  grp('Vérification', big('Éditeur', 'edt', m.editeur, { on: m.edOn }) + col(sm('Thésaurus', 'thes'), sm('Statistiques', 'stat'))),
  grp('Voix', big('Lecture à<br>voix haute', 'voix')),
  grp('Langue', big('Traduire', 'trad', 0, { dd: 1 }) + big('Langue', '🌐', m.langue, { dd: 1 })),
  grp('Commentaires', big('Nouveau<br>commentaire', 'comment', m.newcom) + col(sm('Supprimer', 'supp', 0, { dd: 1 }), sm('Précédent', 'prev'), sm('Suivant', 'next')) + big('Afficher les<br>commentaires', '💬', 0, { dd: 1 })),
  grp('Suivi', big('Suivi des<br>modifications', 'suivi', m.suivi, { dd: 1, on: m.suiviOn }) + col(sm('Toutes les marques', '', 0, { dd: 1 }), sm('Afficher les marques', '', 0, { dd: 1 }), sm('Volet Vérifications', '☰', 0, { dd: 1 }))),
  grp('Modifications', big('Accepter', 'accept', m.accept, { dd: 1 }) + col(sm('Refuser', 'refus', m.refuse, { dd: 1 }), sm('Précédent', 'prev', m.prevnext), sm('Suivant', 'next'))),
  grp('Comparer', big('Comparer', 'comp', 0, { dd: 1 })),
  grp('Protéger', big('Restreindre la<br>modification', 'prot')),
];
R.Affichage = (m = {}) => [
  grp('Affichages', big('Mode<br>Lecture', 'lect', m.lecture) + big('Page', 'page', 0, { on: 1 }) + big('Web', 'web') + col(sm('Plan', 'plan'), sm('Brouillon', '≡')), { m: m.vues }),
  grp('Immersif', big('Focus', '◎') + big('Lecteur<br>immersif', '📖')),
  grp('Déplacement de page', big('Vertical', '⇕', 0, { on: 1 }) + big('Côte à<br>côte', '⇔')),
  grp('Afficher', col(chk('Règle', m.regleOn), chk('Quadrillage', m.quadOn), chk('Volet de navigation', m.navOn)), { m: m.afficher }),
  grp('Zoom', big('Zoom', 'zoom') + big('100 %', '1:1') + col(sm('Une page', '▯'), sm('Plusieurs pages', '▯▯'), sm('Largeur de la page', '↔')), { m: m.zoom }),
  grp('Fenêtre', big('Nouvelle<br>fenêtre', 'fen') + big('Réorganiser<br>tout', '⊟') + big('Fractionner', '⊖')),
  grp('Macros', big('Macros', '▶', 0, { dd: 1 })),
];
R['Création de tableau'] = (m = {}) => [
  grp('Options de style de tableau', col(chk('Ligne d’en-tête', 1), chk('Ligne Total', 0), chk('Lignes à bandes', 1)) + col(chk('Première colonne', 1), chk('Dernière colonne', 0), chk('Colonnes à bandes', 0)), { m: m.opts }),
  grp('Styles de tableau', gal([0, 1, 2, 3, 4, 5].map(i => ({ t: tbl(i) })), m.styles) + big('Trame de<br>fond', '◪', m.trame, { dd: 1 })),
  grp('Bordures', col(sm('Styles de bordure', '', 0, { dd: 1 }), sm('½ pt ———', '', 0, { dd: 1 }), sm('Couleur du stylet', '✎', 0, { dd: 1 })) + big('Bordures', 'bord', m.bord, { dd: 1 }) + big('Reproduire<br>la bordure', '🖌'), { m: m.gbord, launcher: true }),
];
function tbl(i) {
  const c = ['#4472C4', '#ED7D31', '#A5A5A5', '#5B9BD5', '#70AD47', '#264478'][i];
  return `<div style="width:54px">${[0, 1, 2, 3].map(r => `<div style="height:7px;margin:1px 0;background:${r === 0 ? c : r % 2 ? c + '44' : '#fff'};border:1px solid ${c}66"></div>`).join('')}</div>`;
}
R['Disposition (tableau)'] = (m = {}) => [
  grp('Tableau', col(sm('Sélectionner', 'select', 0, { dd: 1 }), sm('Afficher le quadrillage', '⊞'), sm('Propriétés', '⚙'))),
  grp('Dessiner', big('Dessiner un<br>tableau', 'dessin') + big('Gomme', '⌫')),
  grp('Lignes et colonnes', big('Supprimer', 'supp', m.supp, { dd: 1 }) + big('Insérer<br>au-dessus', '⬆') + col(sm('Insérer en dessous', '⬇'), sm('Insérer à gauche', '⬅'), sm('Insérer à droite', '➡')), { m: m.ins, launcher: true }),
  grp('Fusionner', col(sm('Fusionner les cellules', 'merge'), sm('Fractionner les cellules', 'split'), sm('Fractionner le tableau', '⊟')), { m: m.fus }),
  grp('Taille de la cellule', col(row('<span class="k">↕</span>', combo('0,5 cm', 74)), row('<span class="k">↔</span>', combo('4,2 cm', 74)), sm('Ajustement automatique', '↔', 0, { dd: 1 })), { launcher: true }),
  grp('Alignement', `<div class="grid9">${'▤▤▤▤▤▤▤▤▤'.split('').map(x => `<span>${x}</span>`).join('')}</div>` + big('Orientation<br>du texte', '⤵') + big('Marges de<br>la cellule', '▣'), { m: m.align }),
  grp('Données', big('Trier', 'trier') + col(sm('Répéter les lignes d’en-tête', '☰'), sm('Convertir en texte', '⇄'), sm('Formule', 'formule')), { m: m.data }),
];
R['Format de l’image'] = (m = {}) => [
  grp('Ajuster', big('Supprimer<br>l’arrière-plan', 'fond', m.fond) + big('Corrections', 'corr', m.corr, { dd: 1 }) + col(sm('Couleur', '🎨', 0, { dd: 1 }), sm('Effets artistiques', '✦', 0, { dd: 1 }), sm('Transparence', '◌', 0, { dd: 1 }))),
  grp('Styles d’image', gal([0, 1, 2, 3, 4].map(i => ({ t: `<div style="width:44px;height:34px;margin:auto;background:linear-gradient(135deg,#9cc3e6,#4472c4);${['border:3px solid #fff;box-shadow:0 2px 4px #0006', 'border-radius:50%', 'border:4px solid #000', 'transform:rotate(-6deg);border:3px solid #fff;box-shadow:2px 2px 4px #0006', 'border-radius:8px;box-shadow:0 0 6px #4472c4'][i]}"></div>` })), m.styles) + col(sm('Bordure de l’image', '▢', 0, { dd: 1 }), sm('Effets', '✦', 0, { dd: 1 }), sm('Disposition', '⊞', 0, { dd: 1 })), { launcher: true }),
  grp('Accessibilité', big('Texte de<br>remplacement', '💬')),
  grp('Organiser', big('Position', '⊡', 0, { dd: 1 }) + big('Habillage<br>du texte', 'habill', m.habill, { dd: 1 }) + col(sm('Avancer', '⬒', 0, { dd: 1 }), sm('Reculer', '⬓', 0, { dd: 1 }), sm('Volet Sélection', '☰'))),
  grp('Taille', big('Rogner', 'rogner', 0, { dd: 1 }) + col(row('<span class="k">↕</span>', combo('5,2 cm', 74)), row('<span class="k">↔</span>', combo('7,8 cm', 74))), { m: m.taille, launcher: true }),
];
R['En-tête et pied de page'] = (m = {}) => [
  grp('En-tête et pied de page', col(sm('En-tête', 'entete', 0, { dd: 1 }), sm('Pied de page', 'pied', 0, { dd: 1 }), sm('Numéro de page', 'num', m.num, { dd: 1 }))),
  grp('Insérer', big('Date et<br>heure', 'date') + big('Infos sur le<br>document', 'ⓘ', 0, { dd: 1 }) + big('QuickPart', '▦', 0, { dd: 1 }) + big('Images', 'image')),
  grp('Navigation', big('Atteindre<br>l’en-tête', '⬆') + big('Atteindre le<br>pied de page', '⬇') + col(sm('Précédent', 'prev'), sm('Suivant', 'next'), sm('Lier au précédent', 'lien', m.lier))),
  grp('Options', col(chk('Première page différente', 0, m.prem), chk('Pages paires et impaires différentes', 0), chk('Afficher le texte du document', 1))),
  grp('Position', col(row('<span class="k">⤒ En-tête à partir du haut :</span>', combo('1,25 cm', 80)), row('<span class="k">⤓ Pied de page à partir du bas :</span>', combo('1,25 cm', 80)))),
  grp('Fermer', big('Fermer l’en-tête et<br>le pied de page', 'fermer', m.fermer, { mp: 'tr' })),
];
const CONTEXT = { 'Création de tableau': 'tbl', 'Disposition (tableau)': 'tbl', 'Format de l’image': 'img', 'En-tête et pied de page': 'hdr' };

// ---------- window ----------
const TABS = ['Fichier', 'Accueil', 'Insertion', 'Dessin', 'Création', 'Mise en page', 'Références', 'Publipostage', 'Révision', 'Affichage', 'Aide'];
function win(o) {
  const tab = o.tab || 'Accueil';
  const tabs = [...TABS];
  if (o.ctx) tabs.push(...o.ctx);
  const tabsHtml = tabs.map(t => {
    const label = t === 'Disposition (tableau)' ? 'Disposition' : t;
    const ctx = CONTEXT[t] ? ' ctx' : '';
    return `<div class="tab${t === tab ? ' act' : ''}${ctx}"${M(o.tabM && o.tabM[t], 'b')}>${label}</div>`;
  }).join('');
  const ribbon = (R[tab] || R.Accueil)(o.m || {}).join('');
  return `<div class="win">
  <div class="titlebar"${M(o.mTitle, 't')}>
    <div class="tb-left"><span class="autosave">Enregistrement automatique <span class="tog${o.autosave ? ' on' : ''}"><i></i></span></span> ${ic('save')} ${ic('undo')} ${ic('redo')} <span style="opacity:.7">▾</span></div>
    <div class="tb-title">${esc(o.file || 'Document1')} - Word</div>
    <div class="tb-search">🔍 Rechercher</div>
    <div class="tb-right"><span class="avatar">NA</span><span class="wc">—</span><span class="wc">▢</span><span class="wc">✕</span></div>
  </div>
  <div class="tabs"${M(o.mTabs, 'b')}>${tabsHtml}<div class="tabs-right"><span class="pill">💬 Commentaires</span><span class="pill">✎ Édition ▾</span><span class="pill share"${M(o.mShare, 'b')}>⇪ Partager ▾</span></div></div>
  <div class="ribbon"${M(o.mRibbon, 'b')}>${ribbon}<div class="collapse">⌃</div></div>
  <div class="work">${o.side ? `<div class="side">${o.side}</div>` : ''}<div class="canvas"${o.canvasStyle ? ` style="${o.canvasStyle}"` : ''}>${o.doc || ''}</div>${o.right ? `<div class="side right">${o.right}</div>` : ''}</div>
  <div class="status"${M(o.mStatus, 't')}><div>Page 1 sur ${o.pages || 1}&nbsp;&nbsp; ${o.words ?? 12} mots &nbsp;&nbsp; <span>🗎</span> Français (France) &nbsp;&nbsp; Accessibilité : vérification terminée</div>
    <div class="zoomz"${M(o.mZoom, 't')}><span>🎯 Focus</span> <span>📖</span> <span class="vsel">📄</span> <span>🌐</span> &nbsp; — <span class="slider"><i></i></span> + &nbsp; 100 %</div></div>
  ${(o.over || []).join('')}
</div>`;
}
const page = (inner, o = {}) => `<div class="page${o.cls ? ' ' + o.cls : ''}" style="${o.style || ''}"${M(o.m, o.mp)}>${inner}</div>`;
const P = (t, o = {}) => `<p class="${o.cls || ''}" dir="${o.rtl ? 'rtl' : 'ltr'}" style="${o.style || ''}"${M(o.m, o.mp)}>${t}</p>`;
const AR = 'تعلّم Word خطوة بخطوة يجعلك تكتب بحوثك ورسائلك بسرعة وبشكل احترافي.';
const LOREM = 'Le traitement de texte permet de rédiger, de mettre en forme et d’imprimer des documents. Chaque paragraphe peut avoir sa propre police, son alignement et son espacement.';

// ---------- overlays ----------
const menu = (x, y, w, items, o = {}) => `<div class="menu" style="left:${x}px;top:${y}px;width:${w}px"${M(o.m, o.mp)}>${items.join('')}</div>`;
const mi = (t, o = {}) => `<div class="mi${o.sel ? ' sel' : ''}${o.head ? ' head' : ''}"${M(o.m, o.mp || 'r')}>${o.icon ? `<span class="mic">${o.icon}</span>` : ''}${t}</div>`;
const msep = () => '<div class="msep"></div>';
const dialog = (x, y, w, title, body, o = {}) => `<div class="dlg" style="left:${x}px;top:${y}px;width:${w}px"${M(o.m, o.mp)}><div class="dtitle">${title}<span>?&nbsp;&nbsp;&nbsp;✕</span></div><div class="dbody">${body}</div></div>`;
const field = (label, val, o = {}) => `<div class="field"${M(o.m, o.mp || 'r')}><label style="width:${o.lw || 120}px">${label}</label><div class="inp${o.dd ? ' dd' : ''}" style="${o.w ? `width:${o.w}px` : 'flex:1'}">${val}</div></div>`;
const btns = (list, m) => `<div class="dbtns"${M(m, 'l')}>${list.map((b, i) => `<span class="b${i === 0 ? ' pri' : ''}">${b}</span>`).join('')}</div>`;
const fieldset = (title, inner, m) => `<div class="fs"${M(m, 'l')}><div class="fst">${title}</div>${inner}</div>`;
const listbox = (items, sel, h, m) => `<div class="lb" style="height:${h}px"${M(m)}>${items.map((x, i) => `<div class="${i === sel ? 'sel' : ''}">${x}</div>`).join('')}</div>`;

// ---------- backstage (Fichier) ----------
const BS = ['Accueil', 'Nouveau', 'Ouvrir', '|', 'Informations', 'Enregistrer', 'Enregistrer sous', 'Imprimer', 'Partager', 'Exporter', 'Transformer', 'Fermer'];
function backstage(sel, content, o = {}) {
  const items = BS.map(x => x === '|' ? '<div class="bsep"></div>' : `<div class="bsi${x === sel ? ' sel' : ''}"${M(o.navM && o.navM[x], 'r')}>${{ Accueil: '⌂', Nouveau: '🗋', Ouvrir: '📂' }[x] || ''} ${x}</div>`).join('');
  return `<div class="win bs">
  <div class="titlebar"><div class="tb-left"></div><div class="tb-title">${esc(o.file || 'Document1')} - Word</div><div class="tb-search">🔍 Rechercher</div><div class="tb-right"><span class="avatar">NA</span><span class="wc">—</span><span class="wc">▢</span><span class="wc">✕</span></div></div>
  <div class="bswrap"><div class="bsnav"${M(o.mNav, 'r')}>${o.noBack ? '' : '<div class="bsback">⟵</div>'}${items}<div style="flex:1"></div><div class="bsi">Compte</div><div class="bsi">Commentaires</div><div class="bsi">Options</div></div>
  <div class="bscontent">${content}</div></div>${(o.over || []).join('')}</div>`;
}
const tile = (label, inner, m, o = {}) => `<div class="tile"${M(m, o.mp)}><div class="tthumb" style="${o.style || ''}">${inner || ''}</div><div class="tlabel">${label}</div></div>`;
