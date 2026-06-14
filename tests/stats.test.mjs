import fs from 'fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// ===== Temps de jeu : accumulation dans saveProgress =====
console.log('--- Temps de jeu ---');
const spStart = src.indexOf('function saveProgress()');
const spCode = src.slice(spStart, src.indexOf('\n}', spStart) + 2);

function makeSaver({ active = true, startData } = {}) {
  let t = 1000000;
  const data = startData ?? { temps_de_jeu_ms: 0 };
  let writes = 0;
  const sp = new Function('data', 'localStorage', 'Date', 'tabActive', 'lastPlaytimeTickInit',
    'let lastPlaytimeTick = lastPlaytimeTickInit;\n' + spCode + '\nreturn () => saveProgress();')(
    data, { setItem: () => writes++ }, { now: () => t }, active, 1000000);
  return { data, sp, advance: ms => { t += ms; }, getWrites: () => writes };
}

let s = makeSaver();
s.advance(5000); s.sp();
test('1ère save après 5s : +5000 ms', s.data.temps_de_jeu_ms, 5000);
s.advance(7000); s.sp();
test('2e save après 7s de plus : cumul 12000 ms', s.data.temps_de_jeu_ms, 12000);
test('derniere_visite suit la dernière save', s.data.derniere_visite, 1012000);

s = makeSaver({ startData: {} }); // ancienne save sans le champ
s.advance(3000); s.sp();
test('ancienne save sans champ : démarre proprement', s.data.temps_de_jeu_ms, 3000);

s = makeSaver({ active: false });
s.advance(60000); s.sp();
test('onglet gelé : rien accumulé, rien écrit', [s.data.temps_de_jeu_ms, s.getWrites()], [0, 0]);

// ===== Modale stats =====
console.log('--- Ouverture de la modale ---');
const statsSrc = fs.readFileSync(new URL('../modules/stats.js', import.meta.url), 'utf8');
// run the real stats functions; strip ES import/export + the initStats wiring so they
// run inside new Function with injected deps
const stStart = statsSrc.indexOf('export function openStatsModal');
const stCode = statsSrc.slice(stStart).replace(/^export\s+/gm, '');

function runStats(data) {
  const els = {};
  for (const id of ['stat-blocs-total','stat-blocs-clics','stat-bps','stat-pommes','stat-temps','stat-entites','stat-ameliorations','stat-succes']) els[id] = { innerHTML: '' };
  els['stats-modal'] = { style: { display: 'none' } };
  els['stats-button'] = { focusCalls: 0, focus() { this.focusCalls++; } };
  const closeBtn = { focusCalls: 0, focus() { this.focusCalls++; } };
  let sounds = 0;
  const w = {};
  const api = new Function('document', 'data', 'buyEntitySound', 'computeGlobalYieldPerSecond', 'formatNumber', 'formatDuration', 'shop', 'TOTAL_ACHIEVEMENTS',
    stCode + '\nreturn { openStatsModal, closeStatsModal };')(
    { getElementById: id => els[id], querySelector: () => closeBtn },
    data, { play: () => sounds++ }, () => 123.4, n => String(n), () => '3 h 07',
    new Array(36), 30);
  Object.assign(w, api); // the window.* bindings now live in index.js, not in stats.js
  return { els, closeBtn, w, getSounds: () => sounds };
}

const sample = {
  blocsDepuisToujours: 200000, blocsMinesAvecClics: 50000, pommes_or: 7,
  temps_de_jeu_ms: 11220000, entites: [{ quantite: 4 }, { quantite: 6 }],
  inventaire: [1, 2, 3], succes: [1, 2],
};
let r = runStats(sample);
r.w.openStatsModal();
test('total', r.els['stat-blocs-total'].innerHTML, '200000');
test('à la main + pourcentage', r.els['stat-blocs-clics'].innerHTML, '50000 (25 %)');
test('production /s', r.els['stat-bps'].innerHTML, '123.4 / s');
test('pommes', r.els['stat-pommes'].innerHTML, '7');
test('temps de jeu formaté', r.els['stat-temps'].innerHTML, '3 h 07');
test('entités (somme des quantités)', r.els['stat-entites'].innerHTML, '10');
test('améliorations x / 36', r.els['stat-ameliorations'].innerHTML, '3 / 36');
test('succès x / 30', r.els['stat-succes'].innerHTML, '2 / 30');
test('modale stats affichée', r.els['stats-modal'].style.display, 'block');
test('focus sur la croix', r.closeBtn.focusCalls, 1);
test('un seul son joué', r.getSounds(), 1);

r.w.closeStatsModal();
test('fermeture : stats masquée + focus bouton Stats', [r.els['stats-modal'].style.display, r.els['stats-button'].focusCalls], ['none', 1]);

r = runStats({ ...sample, blocsDepuisToujours: 0, blocsMinesAvecClics: 0 });
r.w.openStatsModal();
test('partie neuve : pas de division par zéro', r.els['stat-blocs-clics'].innerHTML, '0 (0 %)');

r = runStats({ ...sample, blocsMinesAvecClics: 5000 }); // 2,5 %
r.w.openStatsModal();
test('part faible : une décimale', r.els['stat-blocs-clics'].innerHTML, '5000 (2,5 %)');

r = runStats({ ...sample, blocsMinesAvecClics: 160 }); // 0,08 %
r.w.openStatsModal();
test('part minuscule : "< 0,1 %" au lieu de 0', r.els['stat-blocs-clics'].innerHTML, '160 (< 0,1 %)');

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
