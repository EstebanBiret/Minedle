import fs from 'fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const stateSrc = fs.readFileSync(new URL('../modules/state.js', import.meta.url), 'utf8');
const musicSrc = fs.readFileSync(new URL('../modules/music.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// ===== readStorageJSON =====
console.log('--- Lecture localStorage blindée ---');
const rsStart = stateSrc.indexOf('function readStorageJSON');
const rsCode = stateSrc.slice(rsStart, stateSrc.indexOf('\n}', rsStart) + 2).replace(/^export\s+/, '');
function makeRS(storeValue) {
  const ls = { getItem: () => storeValue };
  return new Function('localStorage', 'console', rsCode + '\nreturn readStorageJSON;')(ls, { error: () => {} });
}
test('JSON valide -> valeur', makeRS('{"a":1}')('k', 'FB'), { a: 1 });
test('clé absente -> fallback', makeRS(null)('k', 'FB'), 'FB');
test('JSON corrompu -> fallback (pas de crash)', makeRS('{oops')('k', 'FB'), 'FB');

// ===== validation de forme des prefs musique =====
console.log('--- Prefs musique invalides -> défauts ---');
const mStart = musicSrc.indexOf('let musicPrefs');
const mEndAnchor = 'musicPrefs = { muted: true, volume: 0.5 };\n}';
const mCode = musicSrc.slice(mStart, musicSrc.indexOf(mEndAnchor) + mEndAnchor.length);
function musicPrefsFrom(stored) {
  return new Function('readStorageJSON', 'MUSIC_STORAGE_KEY', mCode + '\nreturn musicPrefs;')(() => stored, 'x');
}
test('prefs valides conservées', musicPrefsFrom({ muted: false, volume: 0.8 }), { muted: false, volume: 0.8 });
test('volume hors bornes -> défauts', musicPrefsFrom({ muted: false, volume: 7 }), { muted: true, volume: 0.5 });
test('muted non booléen -> défauts', musicPrefsFrom({ muted: 'yes', volume: 0.5 }), { muted: true, volume: 0.5 });
test('null -> défauts', musicPrefsFrom(null), { muted: true, volume: 0.5 });

// ===== garde multi-onglets =====
console.log('--- Garde multi-onglets ---');
const tStart = src.indexOf('// single tab at a time');
const tCode = src.slice(tStart, src.indexOf("// mined blocks and per-second info")); // just the single-tab guard block
function runTab() {
  const state = { posted: [], handler: null };
  class BC {
    constructor(name) { state.channel = name; }
    postMessage(m) { state.posted.push(m); }
    addEventListener(ev, fn) { state.handler = fn; }
  }
  const bgMusic = { pauseCalls: 0, pause() { this.pauseCalls++; } };
  const overlay = { style: { display: 'none' } };
  const documentMock = { getElementById: () => overlay };
  const api = new Function('window', 'document', 'bgMusic', 'BroadcastChannel',
    'let tabActive = true;\n' + tCode + '\nreturn { isActive: () => tabActive };')(
    { BroadcastChannel: BC }, documentMock, bgMusic, BC);
  return { state, bgMusic, overlay, api };
}
let { state, bgMusic, overlay, api } = runTab();
test('au chargement : claim envoyé', state.posted, ['claim']);
test('actif par défaut', api.isActive(), true);
state.handler({ data: 'claim' });
test('claim reçu -> onglet gelé', api.isActive(), false);
test('musique mise en pause', bgMusic.pauseCalls, 1);
test('overlay affiché', overlay.style.display, 'flex');
state.handler({ data: 'claim' });
test('2e claim : pas de double pause', bgMusic.pauseCalls, 1);

// ===== garde dans saveProgress =====
console.log('--- saveProgress gelé n\'écrit pas ---');
const sStart = src.indexOf('function saveProgress()');
const sCode = src.slice(sStart, src.indexOf('\n}', sStart) + 2);
function runSave(active) {
  const writes = [];
  new Function('tabActive', 'localStorage', 'data', 'Date',
    'let lastPlaytimeTick = 0;\n' + sCode + '\nsaveProgress();')(
    active, { setItem: (k, v) => writes.push(k) }, { x: 1 }, { now: () => 1000 });
  return writes.length;
}
test('onglet actif : écrit', runSave(true), 1);
test('onglet gelé : n\'écrit PAS', runSave(false), 0);

// setItem qui throw (quota plein / stockage indisponible) : saveProgress avale
// l'erreur (le jeu continue) et n'alerte le joueur qu'une seule fois.
function runSaveThrowing() {
  let alerts = 0;
  const sp = new Function('tabActive', 'localStorage', 'data', 'Date', 'alert',
    'let lastPlaytimeTick = 0;\nlet saveErrorNotified = false;\n' + sCode + '\nreturn () => saveProgress();')(
    true,
    { setItem: () => { throw new Error('QuotaExceededError'); } },
    { x: 1 }, { now: () => 1000 },
    () => { alerts++; });
  let threw = false;
  try { sp(); sp(); } catch { threw = true; }
  return { threw, alerts };
}
const throwing = runSaveThrowing();
test('quota plein : saveProgress n\'explose pas', throwing.threw, false);
test('quota plein : alerte une seule fois (2 sauvegardes)', throwing.alerts, 1);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
