// Excel-specific parts: tabs, ribbons, window with formula bar, grid and sheet tabs.
Object.assign(ICON, { sigma: 'Σ', fx: 'fx', cf: '▤', tabl: '▦', stylec: '▩', insc: '⊞', delc: '⊟', fmt: '▣', fill: '⬇', erase: '⌫', sortf: '⇅', findsel: '🔍',
  tcd: '▦', tcdr: '▦?', hist: '📊', line: '📈', pie: '◔', bar: '▬', slicer: '▤', chrono: '⏱', zprint: '▭', titles: '☰', csv: '🗎', refresh: '⟳',
  az: 'A↓Z', za: 'Z↓A', filt: '⏷', dedup: '⊟', valid: '☑', flash: '⚡', freeze: '❄', split: '⊞', grp: '[+]', what: '?', trace: '→', showf: 'fx', errc: '⚠', eval: '🔎', watch: '👁' });

const R = {};
R.Accueil = (m = {}) => [
  grp('Presse-papiers', big('Coller', 'coller', 0, { dd: 1 }) + col(sm('', 'couper'), sm('', 'copier'), sm('', 'pinceau')), { launcher: true }),
  grp('Police', col(row(combo('Calibri', 110), combo('11', 44), tiny('A<sup>↑</sup>'), tiny('A<sub>↓</sub>')),
    row(tiny('<b>G</b>'), tiny('<i>I</i>'), tiny('<u>S</u>▾'), tiny('⊞▾', m.bord), tiny('<span style="border-bottom:4px solid #ff0">◇</span>▾'), tiny('<span style="border-bottom:3px solid #d00">A</span>▾'))), { launcher: true }),
  grp('Alignement', col(row(tiny('⤒'), tiny('≡'), tiny('⤓'), tiny('ab↗▾'), sm('Renvoyer à la ligne automatiquement', '↵', m.wrap)),
    row(tiny('≡'), tiny('≣'), tiny('≡'), tiny('⇤'), tiny('⇥'), sm('Fusionner et centrer', '⊟', m.merge, { dd: 1 }))), { launcher: true }),
  grp('Nombre', col(combo('Standard', 130, m.numfmt), row(tiny('💲▾'), tiny('%'), tiny('000'), tiny('←,0'), tiny(',00→'))), { launcher: m.numL || true, m: m.nombre }),
  grp('Styles', col(sm('Mise en forme conditionnelle', 'cf', m.cf, { dd: 1, on: m.cfOn }), sm('Mettre sous forme de tableau', 'tabl', m.tabl, { dd: 1 }), sm('Styles de cellules', 'stylec', 0, { dd: 1 }))),
  grp('Cellules', col(sm('Insérer', 'insc', 0, { dd: 1 }), sm('Supprimer', 'delc', 0, { dd: 1 }), sm('Format', 'fmt', 0, { dd: 1 }))),
  grp('Édition', col(sm('Σ Somme automatique', '', m.sigma, { dd: 1, on: m.sigmaOn }), sm('Remplissage', 'fill', 0, { dd: 1 }), sm('Effacer', 'erase', 0, { dd: 1 })) + col(sm('Trier et filtrer', 'sortf', m.sortf, { dd: 1 }), sm('Rechercher et sélectionner', 'findsel', 0, { dd: 1 }))),
  grp('Analyse', big('Analyser des<br>données', '📈')),
];
R.Insertion = (m = {}) => [
  grp('Tableaux', big('Tableau croisé<br>dynamique', 'tcd', m.tcd, { dd: 1, on: m.tcdOn }) + big('Tableaux croisés<br>dyn. recommandés', 'tcdr') + big('Tableau', 'tabl', m.tableau)),
  grp('Illustrations', big('Illustrations', 'image', 0, { dd: 1 })),
  grp('Graphiques', big('Graphiques<br>recommandés', 'hist', m.grec, { on: m.grecOn }) + `<div style="display:grid;grid-template-columns:repeat(3,34px);gap:2px;margin-top:4px"${M(m.gicons, 'b')}>${['📊▾', '📈▾', '◔▾', '▬▾', '⛰▾', '⁘▾'].map(x => `<span class="btn tiny">${x}</span>`).join('')}</div>` + big('Cartes', '🗺', 0, { dd: 1 }) + big('Graphique croisé<br>dynamique', 'hist', 0, { dd: 1 }), { launcher: true }),
  grp('Graphiques sparkline', col(sm('Courbes', 'line', m.spark), sm('Histogramme', 'hist'), sm('Positif/Négatif', '±'))),
  grp('Filtres', col(sm('Segment', 'slicer', m.segment), sm('Chronologie', 'chrono'))),
  grp('Liens', big('Lien', 'lien', 0, { dd: 1 })),
  grp('Commentaires', big('Commentaire', 'comment')),
  grp('Texte', big('Texte', 'zone', 0, { dd: 1 })),
  grp('Symboles', big('Symboles', 'sym', 0, { dd: 1 })),
];
R['Mise en page'] = (m = {}) => [
  grp('Thèmes', big('Thèmes', 'theme', 0, { dd: 1 }) + col(sm('Couleurs', '🎨', 0, { dd: 1 }), sm('Polices', 'A', 0, { dd: 1 }), sm('Effets', '✦', 0, { dd: 1 }))),
  grp('Mise en page', big('Marges', 'marges', 0, { dd: 1 }) + big('Orientation', 'orient', m.orient, { dd: 1 }) + big('Taille', 'taille', 0, { dd: 1 }) + big('Zone<br>d’impression', 'zprint', m.zone, { dd: 1 }) + big('Sauts de<br>page', 'saut', 0, { dd: 1 }) + big('Arrière-<br>plan', 'image') + big('Imprimer<br>les titres', 'titles', m.titles), { launcher: true }),
  grp('Mise à l’échelle', col(row('<span class="k">Largeur :</span>', combo('1 page', 90)), row('<span class="k">Hauteur :</span>', combo('Automatique', 90)), row('<span class="k">Échelle :</span>', combo('100 %', 90))), { launcher: true }),
  grp('Options de la feuille', col('<div class="lbl">Quadrillage</div>', chk('Afficher', 1), chk('Imprimer', 0)) + col('<div class="lbl">En-têtes</div>', chk('Afficher', 1), chk('Imprimer', 0))),
];
R.Formules = (m = {}) => [
  grp('Bibliothèque de fonctions', big('Insérer une<br>fonction', 'fx', m.fx) + big('Somme<br>automatique', 'sigma', 0, { dd: 1 }) + big('Récemment<br>utilisées', '★', 0, { dd: 1 }) + big('Financier', '💲', 0, { dd: 1 }) + big('Logique', '?', m.logique, { dd: 1 }) + big('Texte', 'A', 0, { dd: 1 }) + big('Date et<br>heure', 'date', 0, { dd: 1 }) + big('Recherche et<br>référence', '🔍', m.recherche, { dd: 1 }) + big('Maths et<br>trigonométrie', 'θ', 0, { dd: 1 }) + big('Plus de<br>fonctions', '…', 0, { dd: 1 }), { m: m.biblio }),
  grp('Noms définis', big('Gestionnaire<br>de noms', '🏷') + col(sm('Définir un nom', '', 0, { dd: 1 }), sm('Utiliser dans la formule', '', 0, { dd: 1 }), sm('Créer à partir de la sélection', ''))),
  grp('Audit de formules', col(sm('Repérer les antécédents', 'trace'), sm('Repérer les dépendants', 'trace'), sm('Supprimer les flèches', '✖', 0, { dd: 1 })) + col(sm('Afficher les formules', 'showf', m.showf), sm('Vérification des erreurs', 'errc', m.verif, { dd: 1 }), sm('Évaluation de formule', 'eval')) + big('Fenêtre<br>Espion', 'watch'), { m: m.audit }),
  grp('Calcul', big('Options de<br>calcul', '⚙', 0, { dd: 1 })),
];
R.Données = (m = {}) => [
  grp('Récupérer et transformer des données', big('Obtenir des<br>données', 'csv', 0, { dd: 1 }) + col(sm('À partir d’un fichier texte/CSV', 'csv'), sm('À partir du web', 'web'), sm('À partir d’un tableau/d’une plage', 'tabl'))),
  grp('Requêtes et connexions', big('Actualiser<br>tout', 'refresh', m.refresh, { dd: 1 })),
  grp('Trier et filtrer', col(tiny('A↓Z'), tiny('Z↓A')) + big('Trier', 'sortf', m.trier) + big('Filtrer', 'filt', m.filtrer, { on: m.filtOn }) + col(sm('Effacer', '✖'), sm('Réappliquer', '⟳'), sm('Avancé', '⚙')), { m: m.gtri }),
  grp('Outils de données', big('Convertir', '⇉') + col(tiny('⚡', m.flash), tiny('⊟', m.dedup), tiny('☑▾', m.valid)) + col(tiny('⧉'), tiny('⛓')), { m: m.outils }),
  grp('Prévision', big('Analyse de<br>scénarios', 'what', 0, { dd: 1 }) + big('Feuille de<br>prévision', 'line')),
  grp('Plan', big('Grouper', 'grp', 0, { dd: 1 }) + big('Dissocier', '[-]', 0, { dd: 1 }) + big('Sous-total', 'Σ'), { launcher: true }),
];
R.Révision = (m = {}) => [
  grp('Vérification', big('Orthographe', '✔') + big('Statistiques<br>du classeur', 'stat')),
  grp('Accessibilité', big('Vérifier<br>l’accessibilité', '♿', 0, { dd: 1 })),
  grp('Langue', big('Traduire', 'trad')),
  grp('Commentaires', big('Nouveau<br>commentaire', 'comment') + big('Supprimer', 'supp') + col(sm('Précédent', 'prev'), sm('Suivant', 'next'))),
  grp('Protéger', big('Protéger<br>la feuille', 'prot') + big('Protéger le<br>classeur', 'prot')),
];
R.Affichage = (m = {}) => [
  grp('Affichages', big('Normal', '▦', 0, { on: 1 }) + big('Aperçu des<br>sauts de page', '▤') + big('Mise en<br>page', 'page')),
  grp('Afficher', col(chk('Règle', 0), chk('Quadrillage', 1), chk('Barre de formule', 1)) + col(chk('En-têtes', 1))),
  grp('Zoom', big('Zoom', 'zoom') + big('100 %', '1:1') + big('Zoom sur la<br>sélection', '⊡')),
  grp('Fenêtre', big('Nouvelle<br>fenêtre', 'fen') + big('Réorganiser<br>tout', '⊟') + big('Figer les<br>volets', 'freeze', m.freeze, { dd: 1, on: m.freezeOn }) + col(sm('Fractionner', 'split'), sm('Masquer', '◌'), sm('Afficher', '◉'))),
  grp('Macros', big('Macros', '▶', 0, { dd: 1 })),
];
R['Création de tableau'] = (m = {}) => [
  grp('Propriétés', col('<div class="lbl">Nom du tableau :</div>', `<div class="inp" style="width:120px"${M(m.nom, 'b')}>Ventes</div>`, sm('Redimensionner le tableau', '⤡'))),
  grp('Outils', col(sm('Synthétiser avec un tableau croisé dynamique', 'tcd'), sm('Supprimer les doublons', 'dedup'), sm('Convertir en plage', '⇄')) + big('Insérer un<br>segment', 'slicer')),
  grp('Options de style de tableau', col(chk('Ligne d’en-tête', 1), chk('Ligne Total', 0), chk('Lignes à bandes', 1)) + col(chk('Première colonne', 0), chk('Dernière colonne', 0), chk('Colonnes à bandes', 0)) + col(chk('Bouton de filtre', 1)), { m: m.opts }),
  grp('Styles de tableau', gal([0, 1, 2, 3, 4, 5].map(i => ({ t: tblX(i) })))),
];
function tblX(i) {
  const c = ['#70AD47', '#217346', '#4472C4', '#ED7D31', '#A5A5A5', '#5B9BD5'][i];
  return `<div style="width:54px">${[0, 1, 2, 3].map(r => `<div style="height:7px;margin:1px 0;background:${r === 0 ? c : r % 2 ? c + '44' : '#fff'};border:1px solid ${c}66"></div>`).join('')}</div>`;
}
R['Création de graphique'] = (m = {}) => [
  grp('Dispositions du graphique', big('Ajouter un élément<br>de graphique', '➕', 0, { dd: 1 }) + big('Disposition<br>rapide', '▦', 0, { dd: 1 })),
  grp('Styles du graphique', big('Modifier les<br>couleurs', '🎨', 0, { dd: 1 }) + gal([0, 1, 2, 3, 4].map(i => ({ t: `<div style="display:flex;gap:2px;align-items:flex-end;height:30px;justify-content:center">${[18, 28, 12, 24].map(h => `<i style="width:7px;height:${h}px;background:${['#217346', '#4472c4', '#70ad47', '#ed7d31', '#7f7f7f'][i]}"></i>`).join('')}</div>` })))),
  grp('Données', big('Intervertir les<br>lignes/colonnes', '⇄') + big('Sélectionner<br>des données', 'tabl')),
  grp('Type', big('Modifier le type<br>de graphique', 'hist')),
  grp('Emplacement', big('Déplacer le<br>graphique', '⤴')),
];
R['Analyse du tableau croisé dynamique'] = (m = {}) => [
  grp('Tableau croisé dynamique', col('<div class="lbl">Nom :</div>', '<div class="inp" style="width:130px">TCD_Ventes</div>', sm('Options', '⚙', 0, { dd: 1 }))),
  grp('Champ actif', col('<div class="inp" style="width:130px">Région</div>', sm('Paramètres de champs', '⚙'))),
  grp('Grouper', col(sm('Grouper la sélection', '[+]'), sm('Dissocier', '[-]'), sm('Grouper le champ', '[#]'))),
  grp('Filtrer', col(sm('Insérer un segment', 'slicer', m.segment), sm('Insérer une chronologie', 'chrono'), sm('Connexions de filtre', '⛓'))),
  grp('Données', big('Actualiser', 'refresh', m.refresh, { dd: 1 }) + big('Changer la<br>source', 'tabl', 0, { dd: 1 })),
  grp('Outils', big('Graphique croisé<br>dynamique', 'hist') + big('TCD<br>recommandés', 'tcdr')),
];
const CONTEXT = { 'Création de tableau': 1, 'Création de graphique': 1, 'Format': 1, 'Analyse du tableau croisé dynamique': 1, 'Création': 1 };
const TABS = ['Fichier', 'Accueil', 'Insertion', 'Dessin', 'Mise en page', 'Formules', 'Données', 'Révision', 'Affichage', 'Aide'];

// ---------- grid ----------
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL']);
const ci = c => COLS.indexOf(c);
const parse = a => { const m = a.match(/^([A-Z]+)(\d+)$/); return [ci(m[1]), +m[2]]; };
function sheet(o) {
  const nc = o.ncols || 14, nr = o.nrows || 24, rh = o.rh || 26, hw = 40, hh = 24, c0 = o.c0 || 0, r0 = o.r0 || 1;
  const W = Array.from({ length: nc }, (_, i) => (o.w && o.w[COLS[c0 + i]]) || o.dw || 88);
  const X = [hw]; W.forEach(w => X.push(X[X.length - 1] + w));
  const Y = r => hh + (r - r0) * rh;
  const pos = a => { const [c, r] = parse(a); return { x: X[c - c0], y: Y(r), w: W[c - c0], h: rh }; };
  const rect = rg => { const [a, b] = rg.split(':'); const p = pos(a), q = pos(b || a); return { x: p.x, y: p.y, w: q.x + q.w - p.x, h: q.y + q.h - p.y }; };
  let h = '';
  // headers
  const [ac, ar] = o.active ? parse(o.active) : [-1, -1];
  const selR = o.sel ? rect(o.sel) : null;
  h += `<div class="xh corner" style="left:0;top:0;width:${hw}px;height:${hh}px">◢</div>`;
  for (let i = 0; i < nc; i++) { const on = (ci(COLS[c0 + i]) === ac) || (selR && X[i] >= selR.x && X[i] < selR.x + selR.w); h += `<div class="xh${on ? ' on' : ''}" style="left:${X[i]}px;top:0;width:${W[i]}px;height:${hh}px"${o.mColHead && o.mColHead[0] === COLS[c0 + i] ? M(o.mColHead[1], 'b') : ''}>${COLS[c0 + i]}</div>`; }
  for (let r = r0; r < r0 + nr; r++) { const on = r === ar || (selR && Y(r) >= selR.y && Y(r) < selR.y + selR.h); h += `<div class="xh${on ? ' on' : ''}" style="left:0;top:${Y(r)}px;width:${hw}px;height:${rh}px"${o.mRowHead && o.mRowHead[0] === r ? M(o.mRowHead[1], 'l') : ''}>${r}</div>`; }
  // fills (styles over ranges)
  (o.fills || []).forEach(([rg, st]) => { const q = rect(rg); h += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px;${st}"></div>`; });
  if (selR) h += `<div style="position:absolute;left:${selR.x}px;top:${selR.y}px;width:${selR.w}px;height:${selR.h}px;background:#21734618"></div>`;
  // cells
  Object.entries(o.cells || {}).forEach(([a, v]) => {
    const p = pos(a); let t = v, st = '';
    if (typeof v === 'object' && v !== null) { t = v.v; st = v.s || ''; if (v.span) p.w = rect(a + ':' + v.span).w; }
    const num = typeof t === 'number' || /^-?[\d  ]+([,.]\d+)?( ?%| DA)?$/.test(String(t));
    h += `<div class="xc${num ? ' num' : ''}" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;${st}"${M(v && v.m, v && v.mp)}>${t ?? ''}</div>`;
  });
  // colored reference boxes
  (o.refs || []).forEach(([rg, c]) => { const q = rect(rg); h += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px;border:2px solid ${c};background:${c}14"></div>`; });
  (o.dashed || []).forEach(rg => { const q = rect(rg); h += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px;border:2px dashed #217346"></div>`; });
  if (o.active) { const p = pos(o.active); h += `<div style="position:absolute;left:${p.x - 1}px;top:${p.y - 1}px;width:${p.w + 2}px;height:${p.h + 2}px;border:2.5px solid #217346"${M(o.mActive, o.mActiveP)}></div><div style="position:absolute;left:${p.x + p.w - 4}px;top:${p.y + p.h - 4}px;width:8px;height:8px;background:#217346;border:1px solid #fff"${M(o.mHandle, 'br')}></div>`; }
  // markers on ranges
  (o.mk || []).forEach(([rg, n, mp]) => { const q = rect(rg); h += `<div style="position:absolute;left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px"${M(n, mp)}></div>`; });
  (o.extra || []).forEach(x => { h += x(rect); });
  return `<div class="xgrid" style="width:${X[nc] + 2}px;height:${Y(r0 + nr)}px"${M(o.mHeaders, 'tl')}>${h}</div>`;
}

function win(o) {
  const tab = o.tab || 'Accueil';
  const tabs = [...TABS]; if (o.ctx) tabs.push(...o.ctx);
  const tabsHtml = tabs.map(t => `<div class="tab${t === tab ? ' act' : ''}${CONTEXT[t] ? ' ctx' : ''}"${M(o.tabM && o.tabM[t], 'b')}>${t}</div>`).join('');
  const ribbon = (R[tab] || R.Accueil)(o.m || {}).join('');
  const sheets = (o.sheets || ['Feuil1']).map((s, i) => `<span class="st${i === (o.sheetSel || 0) ? ' sel' : ''}">${s}</span>`).join('');
  return `<div class="win">
  <div class="titlebar"><div class="tb-left"><span class="autosave">Enregistrement automatique <span class="tog${o.autosave ? ' on' : ''}"><i></i></span></span> ${ic('save')} ${ic('undo')} ${ic('redo')} <span style="opacity:.7">▾</span></div>
    <div class="tb-title">${esc(o.file || 'Classeur1')} - Excel</div><div class="tb-search">🔍 Rechercher</div>
    <div class="tb-right"><span class="avatar">NA</span><span class="wc">—</span><span class="wc">▢</span><span class="wc">✕</span></div></div>
  <div class="tabs"${M(o.mTabs, (o.mp && o.mp.mTabs) || 'b')}>${tabsHtml}<div class="tabs-right"><span class="pill">💬 Commentaires</span><span class="pill share">⇪ Partager ▾</span></div></div>
  <div class="ribbon"${M(o.mRibbon, (o.mp && o.mp.mRibbon) || 'b')}>${ribbon}<div class="collapse">⌃</div></div>
  <div class="fbar"><div class="namebox"${M(o.mName, (o.mp && o.mp.mName) || 'b')}>${o.name || o.active || 'A1'} ▾</div><span class="fsep">⋮</span><span class="fbtn">✕</span><span class="fbtn">✓</span><span class="fbtn"${M(o.mFx, (o.mp && o.mp.mFx) || 'b')}><i>fx</i></span><div class="formula"><span${M(o.mFormula, (o.mp && o.mp.mFormula) || 'b')}>${o.formula ?? ''}</span></div></div>
  <div class="work"><div class="canvas xcanvas">${o.grid || ''}</div>${o.right ? `<div class="side right">${o.right}</div>` : ''}</div>
  <div class="sheetbar"${M(o.mSheets, (o.mp && o.mp.mSheets) || 't')}><span style="color:#8a8886">◀ ▶</span>${sheets}<span class="st plus">⊕</span></div>
  <div class="status"${M(o.mStatus, (o.mp && o.mp.mStatus) || 't')}><div>${o.mode || 'Prêt'} &nbsp;&nbsp; ♿ Accessibilité : vérification terminée</div>
    <div class="zoomz">${o.stats ? `<span${M(o.mStats, (o.mp && o.mp.mStats) || 't')}>${o.stats}</span>&nbsp;&nbsp;` : ''}<span class="vsel">▦</span> <span>▤</span> <span>▥</span> &nbsp; — <span class="slider"><i></i></span> + &nbsp; 100 %</div></div>
  ${(o.over || []).join('')}
</div>`;
}
