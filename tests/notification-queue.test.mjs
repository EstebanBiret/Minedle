import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/achievements.js', import.meta.url), 'utf8');
const code = src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '')
  + '\nreturn { initAchievements, unlockAchievement };';

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function makeEl() {
  return {
    textContent: '', style: {}, clientHeight: 80, dataset: {},
    appendChild(c) { return c; },
    setAttribute() {}, removeAttribute() {},
    classList: { add() {}, remove() {}, contains: () => false },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    remove() {},
  };
}

const catalogue = [
  { id: 1, categorie: 'clics', nom: 'A1', description: '', image: '' },
  { id: 2, categorie: 'clics', nom: 'A2', description: '', image: '' },
  { id: 3, categorie: 'clics', nom: 'A3', description: '', image: '' },
];

function setup() {
  const bodyAppends = [];          // notification divs appended to <body>
  const timers = [];               // captured setTimeout callbacks
  const announce = makeEl();
  const doc = {
    getElementById: (id) => id === 'sr-announce' ? announce : makeEl(),
    createElement: () => makeEl(),
    body: { appendChild: (c) => { bodyAppends.push(c); return c; } },
  };
  const data = { succes: [] };
  const mod = new Function('achievements', 'data', 'document', 'Audio', 'setTimeout', code)(
    catalogue, data, doc, class { play() {} }, (fn, ms) => { timers.push({ fn, ms }); return timers.length; }
  );
  mod.initAchievements({ refreshTooltips: () => {}, computeGlobalYieldPerSecond: () => 0 });
  return { mod, bodyAppends, timers, data, announce };
}

// fire the completion (5000ms) timer of the notification currently on screen
function fireCompletion(timers) {
  const t = timers[timers.length - 1];
  if (t && t.ms === 5000) t.fn();
}

console.log('--- #11 : 3 déblocages quasi simultanés -> 1 seule notification à la fois ---');
const s = setup();
s.mod.unlockAchievement(1);
s.mod.unlockAchievement(2);
s.mod.unlockAchievement(3);
test('les 3 succès sont bien débloqués', s.data.succes.map(x => x.id), [1, 2, 3]);
test('une seule notification affichée (les 2 autres en file)', s.bodyAppends.length, 1);
test('#11 : annonce SR du 1er succès affiché', s.announce.textContent, 'Succès obtenu : A1');

console.log('--- la file enchaîne à la fin de chaque notification ---');
fireCompletion(s.timers);
test('2e notification après la fin de la 1re', s.bodyAppends.length, 2);
test('#11 : annonce SR mise à jour pour le 2e succès', s.announce.textContent, 'Succès obtenu : A2');
fireCompletion(s.timers);
test('3e notification après la fin de la 2e', s.bodyAppends.length, 3);
fireCompletion(s.timers);
test('file vidée : aucune notification supplémentaire', s.bodyAppends.length, 3);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
