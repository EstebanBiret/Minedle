import fs from 'fs';
const { formatDuration } = await import(new URL('../modules/format.js', import.meta.url));
// read the real offline module; strip ES import/export + the injected-var declarations so the
// functions run inside new Function with deps injected as params, then call grantOfflineGains()
const offlineSrc = fs.readFileSync(new URL('../modules/offline.js', import.meta.url), 'utf8');
const code = offlineSrc
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/^export\s+/gm, '')
  .replace(/^let computeGlobalYieldPerSecond[^\n]*\n/m, '')
  + '\ngrantOfflineGains();';

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function run({ lastSeen, bps, now }) {
  const data = { derniere_visite: lastSeen, blocsActuels: 1000, blocsDepuisToujours: 5000 };
  const els = { 'hors-ligne-duree': { textContent: '' }, 'hors-ligne-gain': { textContent: '' }, 'hors-ligne': { style: { display: 'none' } } };
  let saves = 0;
  const fn = new Function('data', 'computeGlobalYieldPerSecond', 'saveProgress', 'formatNumber', 'formatDuration', 'document', 'window', 'Date', 'trapFocus', 'releaseFocus',
    code)(
    data, () => bps, () => saves++, n => String(Math.round(n)), formatDuration, { getElementById: id => els[id] }, {}, { now: () => now }, () => {}, () => {});
  return { data, els, saves, api: { formatDuration } };
}

console.log('--- formatDuration ---');
let { api } = run({ lastSeen: 0, bps: 0, now: 0 });
test('45 min', api.formatDuration(45 * 60000), '45 min');
test('3 h 07', api.formatDuration(187 * 60000), '3 h 07');

console.log('--- Cas sans gain ---');
let r = run({ lastSeen: 0, bps: 100, now: 1e12 });
test('ancienne save (pas de timestamp) : rien', [r.els['hors-ligne'].style.display, r.data.blocsActuels], ['none', 1000]);
r = run({ lastSeen: 1e12 - 30000, bps: 100, now: 1e12 });
test('absence 30s : rien', r.els['hors-ligne'].style.display, 'none');
r = run({ lastSeen: 1e12 - 7200000, bps: 0, now: 1e12 });
test('production nulle : rien', r.els['hors-ligne'].style.display, 'none');
r = run({ lastSeen: 1e12 + 9999999, bps: 100, now: 1e12 });
test('timestamp futur (import trafiqué) : rien', r.els['hors-ligne'].style.display, 'none');

console.log('--- Gains accordés ---');
r = run({ lastSeen: 1e12 - 7200000, bps: 100, now: 1e12 }); // 2h à 100 bps
test('2h @ 100 bps, taux 50% : +360 000', r.data.blocsActuels, 1000 + 360000);
test('cumul total aussi crédité', r.data.blocsDepuisToujours, 5000 + 360000);
test('modale affichée', r.els['hors-ligne'].style.display, 'flex');
test('durée affichée', r.els['hors-ligne-duree'].textContent, '2 h 00');
test('gain affiché', r.els['hors-ligne-gain'].textContent, '+ 360000 blocs');
test('sauvegarde immédiate', r.saves, 1);

r = run({ lastSeen: 1e12 - 50 * 3600000, bps: 100, now: 1e12 }); // 50h -> plafond 12h
test('50h plafonné à 12h : +2 160 000', r.data.blocsActuels, 1000 + 2160000);
test('durée affichée = plafond', r.els['hors-ligne-duree'].textContent, '12 h 00');

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
