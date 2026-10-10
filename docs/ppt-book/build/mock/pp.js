// PowerPoint-specific parts: tabs, ribbons, window with thumbnails, slide and notes panes.
Object.assign(ICON, { newslide: '▭+', layout: '▦', reset: '⟲', section: '§', textdir: '⇄', smart: '⛬', designer: '✦', theme: 'Aa', bg: '▧', size: '▭', morph: '◐',
  fade: '◌', push: '⇥', wipe: '▶', effect: '⚙', apply: '⧉', time: '⏱', appear: '★', fly: '➶', zoomA: '⊕', bounce: '⤒', pane: '☰', trigger: '⚡', painter: '🖌',
  start: '▶', cur: '▷', custom: '☷', setup: '⚙', hide: '◌', rehearse: '⏱', record: '⏺', presenter: '🖥', normal: '▭', plan: '☰', sorter: '▦', notesv: '▤', reading: '📖',
  master: '▣', video: '🎬', audio: '🔊', screenrec: '⏺', trim: '✂', vol: '🔊', bmark: '🔖' });

const R = {};
R.Accueil = (m = {}) => [
  grp('Presse-papiers', big('Coller', 'coller', 0, { dd: 1 }) + col(sm('', 'couper'), sm('', 'copier'), sm('', 'pinceau')), { launcher: true }),
  grp('Diapositives', big('Nouvelle<br>diapositive', 'newslide', m.newslide, { dd: 1, on: m.nsOn }) + col(sm('Disposition', 'layout', m.disposition, { dd: 1 }), sm('Rétablir', 'reset'), sm('Section', 'section', 0, { dd: 1 }))),
  grp('Police', col(row(combo('Arial', 110, m.font), combo('24', 44, m.font2), tiny('A<sup>↑</sup>', m.grow), tiny('A<sub>↓</sub>')),
    row(tiny('<b>G</b>', m.bold, { mp: 'bl' }), tiny('<i>I</i>'), tiny('<u>S</u>'), tiny('<s>abc</s>'), tiny('S'), tiny('<span style="border-bottom:3px solid #d00">A</span>▾', m.color))), { launcher: true }),
  grp('Paragraphe', col(row(tiny('☰•▾', m.puces), tiny('☰1▾'), tiny('⇤', m.niv1), tiny('⇥', m.niv2), tiny('↕▾', m.inter)),
    row(tiny('≡', m.al1), tiny('≣'), tiny('≡'), tiny('☰'), tiny('⫴▾')),
    row(tiny('¶◂ <small>De gauche à droite</small>', m.ltr), tiny('▸¶ <small>De droite à gauche</small>', m.rtl), tiny('⛬ <small>SmartArt</small>', m.smartBtn, { on: m.smartOn }))), { launcher: true, m: m.para }),
  grp('Dessin', `<div style="display:grid;grid-template-columns:repeat(4,24px);gap:2px;margin-top:4px">${'▭○△⬠➝☆⬭▱'.split('').map(x => `<span class="btn tiny">${x}</span>`).join('')}</div>` + col(sm('Organiser', '⧉', m.organiser, { dd: 1 }), sm('Styles rapides', 'Aa', 0, { dd: 1 }))),
  grp('Édition', col(sm('Rechercher', 'search'), sm('Remplacer', 'repl', 0, { dd: 1 }), sm('Sélectionner', 'select', m.select, { dd: 1 }))),
  grp('Designer', big('Designer', 'designer', m.designer, { on: m.desOn })),
];
R.Insertion = (m = {}) => [
  grp('Diapositives', big('Nouvelle<br>diapositive', 'newslide', 0, { dd: 1 })),
  grp('Tableaux', big('Tableau', 'table', m.tableau, { dd: 1 })),
  grp('Images', big('Images', 'image', m.images, { dd: 1 }) + col(sm('Capture', 'capture', 0, { dd: 1 }), sm('Album photo', '🖼', 0, { dd: 1 }))),
  grp('Illustrations', col(sm('Formes', 'forme', m.formes, { dd: 1 }), sm('Icônes', 'icone', m.icones, { on: m.icOn }), sm('Modèles 3D', '⬢', 0, { dd: 1 })) + col(sm('SmartArt', 'smart', m.smart), sm('Graphique', 'graph', m.graph, { on: m.grOn }))),
  grp('Liens', col(sm('Lien', 'lien', m.lien, { dd: 1 }), sm('Action', '⚡'))),
  grp('Commentaires', big('Commentaire', 'comment')),
  grp('Texte', big('Zone de<br>texte', 'zone', m.zone) + col(sm('En-tête/Pied', 'entete', m.hf), sm('WordArt', 'wordart', 0, { dd: 1 }), sm('Date et heure', 'date'))),
  grp('Symboles', col(sm('Équation', 'eq', 0, { dd: 1 }), sm('Symbole', 'sym'))),
  grp('Média', big('Vidéo', 'video', m.video, { dd: 1 }) + big('Audio', 'audio', m.audio, { dd: 1 }) + big('Enregistrement<br>de l’écran', 'screenrec')),
];
R.Conception = (m = {}) => [
  grp('Thèmes', gal(['#ffffff|#C43E1C', '#1f3864|#ffc000', '#f2f2f2|#2e75b6', '#0b3c5d|#7fd1e8', '#3b2416|#e6b17e', '#ffffff|#70ad47'].map(x => ({ t: `<div style="width:62px;height:40px;background:${x.split('|')[0]};border:1px solid #ccc;position:relative"><span style="position:absolute;left:5px;top:6px;font-size:13px;color:${x.split('|')[1]};font-weight:700">Aa</span><i style="position:absolute;left:5px;right:5px;bottom:6px;height:4px;background:${x.split('|')[1]}"></i></div>` })), m.themes, { m2: 0 })),
  grp('Variantes', gal(['#C43E1C', '#2B579A', '#217346', '#7030A0'].map(c => ({ t: `<div style="width:54px;height:36px;border:1px solid #ccc;background:#fff;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:10px;background:${c}"></i></div>` })), m.variantes, { m2: m.varMore })),
  grp('Personnaliser', big('Taille des<br>diapositives', 'size', m.taille, { dd: 1 }) + big('Format de<br>l’arrière-plan', 'bg', m.fond)),
  grp('Designer', big('Designer', 'designer', m.designer)),
];
R.Transitions = (m = {}) => [
  grp('Aperçu', big('Aperçu', 'start')),
  grp('Transition vers cette diapositive', gal([['Aucune', '▭'], ['Morphose', '◐'], ['Fondu', '◌'], ['Pousser', '⇥'], ['Balayer', '▶'], ['Fractionner', '⫼'], ['Révéler', '◧']].map((x, i) => ({ t: `<span style="font-size:22px;color:#C43E1C">${x[1]}</span><br><small>${x[0]}</small>`, m: i === 1 ? m.morph : 0 })), m.gal, { sel: m.sel ?? 2 }) + big('Options<br>d’effet', 'effect', m.options, { dd: 1 })),
  grp('Minutage', col(row('<span class="k">🔈 Son :</span>', combo('[Aucun son]', 110)), row('<span class="k">⏱ Durée :</span>', combo('00,70', 70, m.duree)), sm('Appliquer partout', 'apply', m.partout)) +
    `<div${M(m.passer, 'b')}>` + col('<div class="lbl">Passer à la diapositive</div>', chk('Manuellement', 1), row(chk('Après :', 0), combo('00:00,00', 80))) + '</div>', { m: m.minutage }),
];
R.Animations = (m = {}) => [
  grp('Aperçu', big('Aperçu', 'start')),
  grp('Animation', gal([['Aucune', '☆', '#999'], ['Apparaître', '★', '#2e8b57'], ['Fondu', '★', '#2e8b57'], ['Balayer', '★', '#2e8b57'], ['Zoom', '★', '#2e8b57'], ['Pulsation', '★', '#d4a000'], ['Disparaître', '★', '#c00000']].map(x => ({ t: `<span style="font-size:22px;color:${x[2]}">${x[1]}</span><br><small>${x[0]}</small>` })), m.gal, { sel: 1 }) + big('Options<br>d’effet', 'effect', m.options, { dd: 1 })),
  grp('Animation avancée', big('Ajouter une<br>animation', 'appear', m.ajouter, { dd: 1 }) + col(sm('Volet Animation', 'pane', m.volet, { on: m.voletOn }), sm('Déclencheur', 'trigger', 0, { dd: 1 }), sm('Reproduire l’animation', 'painter'))),
  grp('Minutage', col(row('<span class="k">▶ Démarrer :</span>', combo('Au clic', 140)), row('<span class="k">⏱ Durée :</span>', combo('00,50', 70)), row('<span class="k">⌛ Délai :</span>', combo('00,00', 70))) + col('<div class="lbl">Réorganiser l’animation</div>', sm('▲ Déplacer avant', ''), sm('▼ Déplacer après', '')), { m: m.minutage }),
];
R.Diaporama = (m = {}) => [
  grp('Démarrer le diaporama', big('À partir<br>du début', 'start', m.debut, { mp: 'b' }) + big('À partir de la<br>diapositive actuelle', 'cur') + big('Présenter<br>en ligne', '🌐', 0, { dd: 1 }) + big('Diaporama<br>personnalisé', 'custom', m.perso, { dd: 1 }), { m: m.demarrer }),
  grp('Configuration', big('Configurer le<br>diaporama', 'setup', m.config) + big('Masquer la<br>diapositive', 'hide') + big('Vérifier le<br>minutage', 'rehearse', m.minut) + big('Enregistrer', 'record', 0, { dd: 1 }) + col(chk('Lire les narrations', 1), chk('Utiliser le minutage', 1), chk('Afficher les contrôles multimédias', 1)), { m: m.configG }),
  grp('Moniteurs', col(row('<span class="k">Moniteur :</span>', combo('Automatique', 110)), chk('Utiliser le mode Présentateur', 1, m.presenter))),
  grp('Légendes et sous-titres', col(sm('Paramètres des sous-titres', '💬', 0, { dd: 1 }), chk('Toujours utiliser les sous-titres', 0))),
];
R.Affichage = (m = {}) => [
  grp('Modes Présentation', big('Normal', 'normal', 0, { on: !m.sorter && !m.masterOn }) + big('Mode<br>Plan', 'plan') + big('Trieuse de<br>diapositives', 'sorter', m.trieuse, { on: m.sorter }) + big('Page de<br>commentaires', 'notesv') + big('Mode<br>Lecture', 'reading'), { m: m.modes }),
  grp('Modes Masque', big('Masque des<br>diapositives', 'master', m.masque, { on: m.masterOn }) + big('Masque du<br>document', 'master') + big('Masque des<br>pages de notes', 'master')),
  grp('Afficher', col(chk('Règle', 0), chk('Quadrillage', 0), chk('Repères', 0)) + big('Notes', 'notesv')),
  grp('Zoom', big('Zoom', 'zoom') + big('Ajuster à<br>la fenêtre', '⤢')),
  grp('Fenêtre', big('Nouvelle<br>fenêtre', 'fen') + col(sm('Réorganiser tout', '⊟'), sm('Cascade', '⧉'))),
];
R['Format de l’image'] = (m = {}) => [
  grp('Ajuster', big('Supprimer<br>l’arrière-plan', 'fond', m.fond) + big('Corrections', 'corr', m.corr, { dd: 1 }) + col(sm('Couleur', '🎨', 0, { dd: 1 }), sm('Effets artistiques', '✦', 0, { dd: 1 }), sm('Compresser les images', '⇲'))),
  grp('Styles d’image', gal([0, 1, 2, 3, 4].map(i => ({ t: `<div style="width:44px;height:34px;margin:auto;background:linear-gradient(135deg,#f3c9b9,#c43e1c);${['border:3px solid #fff;box-shadow:0 2px 4px #0006', 'border-radius:50%', 'border:4px solid #000', 'transform:rotate(-6deg);border:3px solid #fff;box-shadow:2px 2px 4px #0006', 'border-radius:8px;box-shadow:0 0 6px #c43e1c'][i]}"></div>` })), m.styles) + col(sm('Bordure de l’image', '▢', 0, { dd: 1 }), sm('Effets', '✦', 0, { dd: 1 }), sm('Disposition', '⊞', 0, { dd: 1 }))),
  grp('Accessibilité', big('Texte de<br>remplacement', '💬', m.alt)),
  grp('Organiser', col(sm('Avancer', '⬒', 0, { dd: 1 }), sm('Reculer', '⬓', 0, { dd: 1 }), sm('Volet Sélection', '☰')) + col(sm('Aligner', '⫶', 0, { dd: 1 }), sm('Grouper', '⧉', 0, { dd: 1 }), sm('Rotation', '⟳', 0, { dd: 1 }))),
  grp('Taille', big('Rogner', 'rogner', m.rogner, { dd: 1 }) + col(row('<span class="k">↕</span>', combo('7,5 cm', 74)), row('<span class="k">↔</span>', combo('10 cm', 74))), { m: m.taille }),
];
R['Format de la forme'] = (m = {}) => [
  grp('Insérer des formes', `<div style="display:grid;grid-template-columns:repeat(5,24px);gap:2px;margin-top:4px">${'▭○△⬠➝☆⬭▱⌒⬡'.split('').map(x => `<span class="btn tiny">${x}</span>`).join('')}</div>`),
  grp('Styles de forme', gal(['#C43E1C', '#D4A84B', '#2B579A', '#217346', '#7F7F7F'].map(c => ({ t: `<div style="width:40px;height:26px;margin:auto;background:${c};border-radius:4px"></div>` }))) + col(sm('Remplissage', '◪', 0, { dd: 1 }), sm('Contour', '▢', 0, { dd: 1 }), sm('Effets', '✦', 0, { dd: 1 }))),
  grp('Accessibilité', big('Texte de<br>remplacement', '💬')),
  grp('Organiser', col(sm('Avancer', '⬒', 0, { dd: 1 }), sm('Reculer', '⬓', 0, { dd: 1 }), sm('Volet Sélection', '☰', m.volet)) + col(sm('Aligner', '⫶', m.aligner, { dd: 1, on: m.alOn }), sm('Grouper', '⧉', m.grouper, { dd: 1 }), sm('Rotation', '⟳', 0, { dd: 1 }))),
  grp('Taille', col(row('<span class="k">↕</span>', combo('3,8 cm', 74)), row('<span class="k">↔</span>', combo('3,8 cm', 74)))),
];
R.Lecture = (m = {}) => [
  grp('Aperçu', big('Lire', 'start')),
  grp('Signets', big('Ajouter un<br>signet', 'bmark') + big('Supprimer<br>le signet', '✖')),
  grp('Édition', big('Découper<br>la vidéo', 'trim', m.trim, { on: m.trimOn }) + col('<div class="lbl">Durée du fondu</div>', row('<span class="k">Fondu en ouverture :</span>', combo('00,00', 64)), row('<span class="k">Fondu en fermeture :</span>', combo('00,00', 64))), { m: m.edition }),
  grp('Options vidéo', big('Volume', 'vol', m.volume, { dd: 1 }) + col(row('<span class="k">Démarrer :</span>', combo('Automatiquement', 150, m.demarrer)), chk('Lire en mode plein écran', 0), chk('Masquer pendant la lecture', 0)) + col(chk('En boucle jusqu’à l’arrêt', 0), chk('Rembobiner après la lecture', 0)), { m: m.options }),
];
R['Création SmartArt'] = (m = {}) => [
  grp('Créer un graphique', col(sm('Ajouter une forme', '+', 0, { dd: 1 }), sm('Ajouter une puce', '•'), sm('Volet Texte', '☰')) + col(sm('Promouvoir', '⇤'), sm('Abaisser', '⇥'), sm('De droite à gauche', '⇄', m.rtl, { on: m.rtlOn }))),
  grp('Dispositions', gal([0, 1, 2, 3].map(i => ({ t: ['▭➝▭➝▭', '◯↻', '▭\n▭▭', '▤▤▤'][i] })))),
  grp('Styles SmartArt', big('Modifier les<br>couleurs', '🎨', m.couleurs, { dd: 1 }) + gal([0, 1, 2, 3].map(() => ({ t: '<div style="width:40px;height:24px;margin:auto;background:#C43E1C;border-radius:3px"></div>' })))),
  grp('Réinitialiser', big('Rétablir le<br>graphique', 'reset') + big('Convertir', '⇄', 0, { dd: 1 })),
];
R['Création de graphique'] = (m = {}) => [
  grp('Dispositions du graphique', big('Ajouter un élément<br>de graphique', '➕', 0, { dd: 1 }) + big('Disposition<br>rapide', '▦', 0, { dd: 1 })),
  grp('Styles du graphique', big('Modifier les<br>couleurs', '🎨', 0, { dd: 1 }) + gal([0, 1, 2, 3].map(i => ({ t: `<div style="display:flex;gap:2px;align-items:flex-end;height:30px;justify-content:center">${[18, 28, 12, 24].map(h => `<i style="width:7px;height:${h}px;background:${['#C43E1C', '#D4A84B', '#7F7F7F', '#2B579A'][i]}"></i>`).join('')}</div>` })))),
  grp('Données', big('Intervertir les<br>lignes/colonnes', '⇄') + big('Sélectionner<br>des données', 'tabl') + big('Modifier les<br>données', 'tabl', m.modif, { dd: 1, on: m.modifOn }) + big('Actualiser<br>les données', '⟳')),
  grp('Type', big('Modifier le type<br>de graphique', 'graph')),
];
R.Révision = (m = {}) => [
  grp('Vérification', big('Orthographe', '✔') + big('Dictionnaire<br>des synonymes', 'thes')),
  grp('Accessibilité', big('Vérifier<br>l’accessibilité', '♿', m.acc, { dd: 1, on: m.accOn })),
  grp('Langue', big('Traduire', 'trad') + big('Langue', '🌐', 0, { dd: 1 })),
  grp('Commentaires', big('Nouveau<br>commentaire', 'comment') + col(sm('Supprimer', 'supp', 0, { dd: 1 }), sm('Précédent', 'prev'), sm('Suivant', 'next')) + big('Afficher les<br>commentaires', '💬', 0, { dd: 1 })),
  grp('Comparer', big('Comparer', 'comp')),
];
R['Masque des diapositives'] = (m = {}) => [
  grp('Modifier le masque', big('Insérer le masque<br>des diapositives', 'master') + big('Insérer une<br>disposition', 'layout') + col(sm('Supprimer', 'supp'), sm('Renommer', '✎'), sm('Conserver', '📌'))),
  grp('Mise en page du masque', big('Mise en page<br>du masque', 'layout') + big('Insérer un espace<br>réservé', '⬚', 0, { dd: 1 }) + col(chk('Titre', 1), chk('Pieds de page', 1))),
  grp('Modifier le thème', big('Thèmes', 'theme', 0, { dd: 1 }) + col(sm('Couleurs', '🎨', 0, { dd: 1 }), sm('Polices', 'A', 0, { dd: 1 }), sm('Effets', '✦', 0, { dd: 1 }))),
  grp('Arrière-plan', col(sm('Styles d’arrière-plan', 'bg', 0, { dd: 1 }), chk('Masquer les graphiques d’arrière-plan', 0))),
  grp('Taille', big('Taille des<br>diapositives', 'size', 0, { dd: 1 })),
  grp('Fermer', big('Fermer le<br>mode Masque', 'fermer', m.fermer, { mp: 'b' })),
];
const CONTEXT = { 'Masque des diapositives': 1, 'Format de l’image': 1, 'Format de la forme': 1, 'Lecture': 1, 'Création SmartArt': 1, 'Création de graphique': 1, 'Format': 1, 'Format de la vidéo': 1 };
const TABS = ['Fichier', 'Accueil', 'Insertion', 'Dessin', 'Conception', 'Transitions', 'Animations', 'Diaporama', 'Enregistrement', 'Révision', 'Affichage', 'Aide'];

// ---------- slides ----------
const SL = {
  title: (t = 'الماء ثروة يجب أن نحافظ عليها', s = 'عرض مدرسي · إعداد: سامي مثال', dark = '#0B3C5D') => `<div style="position:absolute;inset:0;background:${dark};color:#fff;direction:rtl;padding:12% 7%"><div style="font-size:7.2cqw;font-weight:800;font-family:'Noto Naskh Arabic','Noto Sans',sans-serif;line-height:1.2">${t}</div><div style="font-size:3.2cqw;color:#7FD1E8;margin-top:3%;font-family:'Noto Naskh Arabic','Noto Sans',sans-serif">${s}</div></div>`,
  content: (t, inner = '', bg = '#fff') => `<div style="position:absolute;inset:0;background:${bg};direction:rtl;padding:4% 5%;font-family:'Noto Naskh Arabic','Noto Sans',sans-serif"><div style="font-size:5cqw;font-weight:800;color:#0B3C5D">${t}</div><div style="position:relative;margin-top:3%;height:72%">${inner}</div></div>`,
  cards: (n = 4, labels = ['لماذا الماء ثمين؟', 'أين يذهب الماء؟', 'كيف نقتصد؟', 'خلاصة']) => `<div style="display:flex;gap:3%;height:100%">${labels.slice(0, n).map((l, i) => `<div style="flex:1;background:#E8F4F8;border-radius:6px;padding:4%;position:relative"><div style="width:4.5cqw;height:4.5cqw;border-radius:50%;background:#1B7F9E;color:#fff;font-size:2.6cqw;display:flex;align-items:center;justify-content:center;margin-right:auto;margin-left:0">${i + 1}</div><div style="font-size:2.6cqw;font-weight:700;margin-top:10%;color:#0B3C5D">${l}</div></div>`).join('')}</div>`,
  bullets: (items, size = 3.4) => `<ul style="font-size:${size}cqw;line-height:1.6;padding-right:5%;margin:0;color:#222">${items.map(x => `<li>${x}</li>`).join('')}</ul>`,
};
// A slide frame: 16:9 box whose children scale with container width (cqw units)
const slide = (w, inner, o = {}) => `<div style="position:relative;width:${w}px;height:${Math.round(w * 9 / 16)}px;container-type:inline-size;background:#fff;box-shadow:0 1px 4px #0003;overflow:hidden;${o.style || ''}"${M(o.m, o.mp)}>${inner}</div>`;

function win(o) {
  const tab = o.tab || 'Accueil';
  const tabs = ['Fichier', ...(o.pre || []), ...TABS.slice(1)]; if (o.ctx) tabs.push(...o.ctx);
  const tabsHtml = tabs.map(t => `<div class="tab${t === tab ? ' act' : ''}${CONTEXT[t] ? ' ctx' : ''}"${M(o.tabM && o.tabM[t], o.tabMp || 'b')}>${t}</div>`).join('');
  const ribbon = (R[tab] || R.Accueil)(o.m || {}).join('');
  const slides = o.slides || [SL.title(), SL.content('خطة العرض', SL.cards()), SL.content('لماذا الماء ثمين؟'), SL.content('أين يذهب الماء؟'), SL.content('كيف نقتصد؟')];
  const sel = o.sel ?? 0;
  const thumbs = o.thumbs !== false ? `<div class="thumbs"${M(o.mThumbs, 'r')}>${slides.map((s, i) => `<div class="th${i === sel ? ' sel' : ''}"><span>${i + 1}</span>${slide(170, s)}</div>`).join('')}</div>` : '';
  return `<div class="win">
  <div class="titlebar"><div class="tb-left"><span class="autosave">Enregistrement automatique <span class="tog${o.autosave ? ' on' : ''}"><i></i></span></span> ${ic('save')} ${ic('undo')} ${ic('redo')} <span style="opacity:.7">▾</span></div>
    <div class="tb-title">${esc(o.file || 'Présentation1')} - PowerPoint</div><div class="tb-search">🔍 Rechercher</div>
    <div class="tb-right"><span class="avatar">NA</span><span class="wc">—</span><span class="wc">▢</span><span class="wc">✕</span></div></div>
  <div class="tabs"${M(o.mTabs, (o.mp && o.mp.mTabs) || 'b')}>${tabsHtml}<div class="tabs-right"><span class="pill">💬</span><span class="pill">⏺ Enregistrer</span><span class="pill">▶ ▾</span><span class="pill share"${M(o.mShare, 'b')}>⇪ Partager ▾</span></div></div>
  <div class="ribbon"${M(o.mRibbon, 'b')}>${ribbon}<div class="collapse">⌃</div></div>
  <div class="work">${thumbs}<div class="pcenter">${o.center || `<div class="pslide">${slide(o.slideW || 860, o.current || slides[sel], { m: o.mSlide, mp: o.mSlideP || 'tr' })}</div><div class="notes"${M(o.mNotes, o.notesMp || 'c')}>${o.notes || 'Cliquez pour ajouter des notes'}</div>`}</div>${o.right ? `<div class="side right">${o.right}</div>` : ''}</div>
  <div class="status"${M(o.mStatus, (o.mp && o.mp.mStatus) || 't')}><div>Diapositive ${sel + 1} sur ${slides.length} &nbsp;&nbsp; 🗎 Français (France) &nbsp;&nbsp; ♿ Accessibilité : vérification terminée</div>
    <div class="zoomz"><span>≡ Notes</span><span>💬</span> <span class="vsel">▭</span> <span>▦</span> <span>📖</span> <span>▶</span> &nbsp; — <span class="slider"><i></i></span> + &nbsp; 68 % ⤢</div></div>
  ${(o.over || []).join('')}
</div>`;
}
