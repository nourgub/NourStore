// Illustrated recreation of the French Excel (Microsoft 365) interface, used for the book's figures.
// Each figure is drawn from scratch (no screenshot pixels); numbered gold markers are placed by data-m attributes.
const BLUE = '#217346';
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


//@@XL@@
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
const BS = ['Accueil', 'Nouveau', 'Ouvrir', '|', 'Informations', 'Enregistrer', 'Enregistrer sous', 'Imprimer', 'Partager', 'Exporter', 'Publier', 'Fermer'];
function backstage(sel, content, o = {}) {
  const items = BS.map(x => x === '|' ? '<div class="bsep"></div>' : `<div class="bsi${x === sel ? ' sel' : ''}"${M(o.navM && o.navM[x], 'r')}>${{ Accueil: '⌂', Nouveau: '🗋', Ouvrir: '📂' }[x] || ''} ${x}</div>`).join('');
  return `<div class="win bs">
  <div class="titlebar"><div class="tb-left"></div><div class="tb-title">${esc(o.file || 'Classeur1')} - Excel</div><div class="tb-search">🔍 Rechercher</div><div class="tb-right"><span class="avatar">NA</span><span class="wc">—</span><span class="wc">▢</span><span class="wc">✕</span></div></div>
  <div class="bswrap"><div class="bsnav"${M(o.mNav, 'r')}>${o.noBack ? '' : '<div class="bsback">⟵</div>'}${items}<div style="flex:1"></div><div class="bsi">Compte</div><div class="bsi">Commentaires</div><div class="bsi">Options</div></div>
  <div class="bscontent">${content}</div></div>${(o.over || []).join('')}</div>`;
}
const tile = (label, inner, m, o = {}) => `<div class="tile"${M(m, o.mp)}><div class="tthumb" style="${o.style || ''}">${inner || ''}</div><div class="tlabel">${label}</div></div>`;
