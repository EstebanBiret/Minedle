import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/music.js', import.meta.url), 'utf8');
// strip ES import/export so the body can run inside new Function with injected deps
const code = src
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/^export\s+/gm, '');

// ---- Mocks ----
class MockAudio {
  constructor(src) { this.src = src; this.volume = 1; this.loop = false; this.paused = true; this.playCalls = 0; this.rejectNext = false; this.currentTime = 0; this.duration = NaN; this._h = {}; }
  addEventListener(ev, fn) { this._h[ev] = fn; }
  fire(ev) { this._h[ev] && this._h[ev](); }
  play() {
    this.playCalls++;
    if (this.rejectNext) { this.rejectNext = false; return Promise.reject(new Error('blocked')); }
    this.paused = false;
    return Promise.resolve();
  }
}
const store = {};
const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
function makeEl() { return { value: '0', max: '100', style: { display: '' }, _h: {}, addEventListener(ev, fn) { this._h[ev] = fn; }, fire(ev) { this._h[ev](); } }; }
const els = { 'music-slider': makeEl(), 'music-toggle': makeEl(), 'music-icon-on': makeEl(), 'music-icon-off': makeEl(), 'music-progress': makeEl() };
els['music-slider'].value = '50';
const documentMock = { getElementById: id => els[id], _clickHooks: [], addEventListener(ev, fn) { this._clickHooks.push(fn); } };

const bgMusic = new Function('Audio', 'localStorage', 'document', 'readStorageJSON', 'safeSetItem', code + '\nreturn bgMusic;')(MockAudio, localStorage, documentMock, (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }, (k, v) => { localStorage.setItem(k, v); return true; });
const progress = els['music-progress'];

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

console.log('--- Régression : comportement volume/mute inchangé ---');
test('preload metadata activé', bgMusic.preload, 'metadata');
test('mute par défaut, volume 0', bgMusic.volume, 0);
els['music-toggle'].fire('click');
test('unmute -> volume 0.5 + lecture', [bgMusic.volume, bgMusic.playCalls], [0.5, 1]);

console.log('--- Barre de progression ---');
bgMusic.duration = 180;
bgMusic.fire('loadedmetadata');
test('max = durée du morceau (180s)', progress.max, 180);

bgMusic.currentTime = 42;
bgMusic.fire('timeupdate');
test('la barre suit la lecture (42s)', progress.value, 42);

// drag : pendant le glissement, timeupdate ne doit PAS écraser la position
progress.fire('input');           // l'utilisateur commence à glisser
bgMusic.currentTime = 50;
bgMusic.fire('timeupdate');
progress.value = '120';           // position visée par l'utilisateur
test('pendant le drag, la barre ne bouge pas avec la lecture', progress.value, '120');

progress.fire('change');          // relâchement
test('au relâchement, la musique saute à 120s', bgMusic.currentTime, 120);

bgMusic.currentTime = 125;
bgMusic.fire('timeupdate');
test('après le drag, la barre suit de nouveau', progress.value, 125);

// rebouclage : le navigateur remet currentTime à 0 (loop=true), la barre doit suivre
bgMusic.currentTime = 0;
bgMusic.fire('timeupdate');
test('rebouclage : la barre repart à 0', progress.value, 0);
test('loop toujours actif', bgMusic.loop, true);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
