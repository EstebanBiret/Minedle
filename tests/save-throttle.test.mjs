import fs from 'fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
// slice the throttle wrapper (the two flags + saveProgressThrottled)
const tStart = src.indexOf('let clickSaveTimer');
const tEnd = src.indexOf('\n}', src.indexOf('function saveProgressThrottled')) + 2;
const code = src.slice(tStart, tEnd);

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function setup() {
  let saves = 0;
  const timers = [];
  const mod = new Function('saveProgress', 'setTimeout', code + '\nreturn { saveProgressThrottled };')(
    () => saves++,
    (fn, ms) => { timers.push({ fn, ms }); return timers.length; }
  );
  return { mod, timers, getSaves: () => saves };
}

console.log('--- #1 : sauvegarde au clic coalescée (~1/s) ---');
const s = setup();

s.mod.saveProgressThrottled();
test('1er clic : sauvegarde immédiate', s.getSaves(), 1);
test('une fenêtre de ~1 s est armée', s.timers[0].ms, 1000);

s.mod.saveProgressThrottled();
s.mod.saveProgressThrottled();
s.mod.saveProgressThrottled();
test('clics rapprochés : aucune sauvegarde supplémentaire', s.getSaves(), 1);

s.timers[0].fn(); // fin de la fenêtre, des clics étaient en attente -> une sauvegarde de rattrapage
test('fin de fenêtre avec clics en attente : 1 sauvegarde de rattrapage', s.getSaves(), 2);

s.timers[s.timers.length - 1].fn(); // nouvelle fenêtre close, rien en attente
test('fin de fenêtre sans clic en attente : aucune sauvegarde', s.getSaves(), 2);

console.log('--- un clic isolé après la fenêtre redéclenche une sauvegarde ---');
const s2 = setup();
s2.mod.saveProgressThrottled();          // save 1
s2.timers[0].fn();                       // fenêtre close, rien en attente -> pas de save
test('clic isolé : 1 sauvegarde', s2.getSaves(), 1);
s2.mod.saveProgressThrottled();          // nouvelle fenêtre -> save 2
test('clic après fenêtre fermée : nouvelle sauvegarde immédiate', s2.getSaves(), 2);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
