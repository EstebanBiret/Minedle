import fs from 'fs';
const code = fs.readFileSync(new URL('../modules/background.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function run(mqMap, videoProps = {}) {
  const video = {
    removed: false, classes: new Set(), pauseCalls: 0, playCalls: 0, _h: {}, readyState: 0, networkState: 2,
    classList: { add(c) { video.classes.add(c); } },
    remove() { video.removed = true; },
    pause() { video.pauseCalls++; },
    play() { video.playCalls++; return Promise.resolve(); },
    addEventListener(ev, fn) { video._h[ev] = fn; },
    querySelector: () => ({ addEventListener(ev, fn) { video._h['source-' + ev] = fn; } }),
  };
  const doc = {
    _h: {}, visibilityState: 'visible',
    getElementById: () => video,
    addEventListener(ev, fn) { doc._h[ev] = fn; },
    body: { contains: () => !video.removed },
  };
  Object.assign(video, videoProps);
  const win = { matchMedia: q => ({ matches: mqMap[q] ?? false }) };
  new Function('document', 'window', code)(doc, win);
  return { video, doc };
}

console.log('--- Desktop, vidéo présente ---');
let { video, doc } = run({});
test('pas supprimée au chargement', video.removed, false);
video._h['canplay']();
test('canplay -> fondu (classe ready)', video.classes.has('ready'), true);
doc.visibilityState = 'hidden'; doc._h['visibilitychange']();
test('onglet caché -> pause', video.pauseCalls, 1);
doc.visibilityState = 'visible'; doc._h['visibilitychange']();
test('onglet visible -> play', video.playCalls, 1);

console.log('--- Fichier vidéo absent ---');
({ video, doc } = run({}));
video._h['source-error']();
test('erreur source -> vidéo retirée (image animée reste)', video.removed, true);
doc.visibilityState = 'hidden'; doc._h['visibilitychange']();
test('plus aucun pause/play après retrait', [video.pauseCalls, video.playCalls], [0, 0]);

console.log('--- Petits écrans / reduced motion ---');
({ video } = run({ '(max-width: 1200px)': true }));
test('mobile -> vidéo retirée d\'emblée', video.removed, true);
({ video } = run({ '(prefers-reduced-motion: reduce)': true }));
test('reduced motion -> vidéo retirée d\'emblée', video.removed, true);

console.log('--- Course au refresh (vidéo déjà en cache) ---');
({ video } = run({}, { readyState: 4 }));
test('vidéo déjà prête au chargement du script -> fondu immédiat', video.classes.has('ready'), true);
({ video } = run({}, { networkState: 3 }));
test('source déjà en échec au chargement -> vidéo retirée', video.removed, true);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
