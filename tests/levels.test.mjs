import fs from 'fs';

// run the real levels module: strip ES import/export so it runs inside new Function
// with its imported deps (data, MAX_LEVEL, unlockAchievement) + document injected,
// and saveProgress wired through initLevels().
const src = fs.readFileSync(new URL('../modules/levels.js', import.meta.url), 'utf8');
const code = src
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/^export\s+/gm, '')
  + '\nreturn { initLevels, checkLevelUp, updateLevel };';

const MAX_LEVEL = 7;

// build a fresh module instance (resets the internal levelIndex) with mocks
function build(startData) {
  const data = Object.assign({ niveau: 0, blocsDepuisToujours: 0 }, startData);
  const blocImg = { src: '' };
  const entityImgs = [{ src: '' }, { src: '' }];
  const doc = {
    getElementById: () => blocImg,
    querySelectorAll: () => entityImgs,
  };
  const unlocked = [];
  let saves = 0;
  const mod = new Function('data', 'MAX_LEVEL', 'unlockAchievement', 'document', code)(
    data, MAX_LEVEL, id => unlocked.push(id), doc
  );
  mod.initLevels({ saveProgress: () => saves++ });
  return { mod, data, blocImg, entityImgs, unlocked, getSaves: () => saves };
}

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// the seven tiers and their unlock thresholds / achievement ids
const tiers = [
  { from: 0, threshold: 1000, ach: 1, block: 'coal' },
  { from: 1, threshold: 10000, ach: 2, block: 'iron' },
  { from: 2, threshold: 100000, ach: 3, block: 'gold' },
  { from: 3, threshold: 1000000, ach: 4, block: 'redstone' },
  { from: 4, threshold: 10000000, ach: 5, block: 'lapis' },
  { from: 5, threshold: 100000000, ach: 6, block: 'emerald' },
  { from: 6, threshold: 2000000000, ach: 7, block: 'diamond' },
];

console.log('--- checkLevelUp: passage de palier à chaque seuil ---');
for (const t of tiers) {
  const { mod, data, blocImg, unlocked, getSaves } = build({ niveau: t.from });
  mod.updateLevel(); // sync the internal index to the saved level
  data.blocsDepuisToujours = t.threshold;
  mod.checkLevelUp();
  test(`niveau ${t.from} -> ${t.from + 1} à ${t.threshold} blocs`, data.niveau, t.from + 1);
  test(`  succès #${t.ach} débloqué`, unlocked, [t.ach]);
  test(`  bloc passe à ${t.block}`, blocImg.src.includes(t.block), true);
  test(`  saveProgress appelé`, getSaves(), 1);
}

console.log('--- checkLevelUp: pas de passage sous le seuil ---');
{
  const { mod, data, unlocked, getSaves } = build({ niveau: 0 });
  mod.updateLevel();
  data.blocsDepuisToujours = 999; // juste sous 1000
  mod.checkLevelUp();
  test('niveau inchangé sous le seuil', data.niveau, 0);
  test('aucun succès débloqué', unlocked, []);
  test('saveProgress non appelé', getSaves(), 0);
}

console.log('--- checkLevelUp: niveau max = no-op ---');
{
  const { mod, data, unlocked } = build({ niveau: MAX_LEVEL });
  mod.updateLevel();
  data.blocsDepuisToujours = 999999999999;
  mod.checkLevelUp();
  test('au niveau max : pas de dépassement', data.niveau, MAX_LEVEL);
  test('au niveau max : aucun succès', unlocked, []);
}

console.log('--- checkLevelUp: un seul palier par appel ---');
{
  const { mod, data, unlocked } = build({ niveau: 0 });
  mod.updateLevel();
  data.blocsDepuisToujours = 100000; // dépasse les seuils 1000 ET 10000 ET 100000
  mod.checkLevelUp();
  test('ne saute pas plusieurs paliers d\'un coup', data.niveau, 1);
  test('un seul succès débloqué', unlocked, [1]);
}

console.log('--- updateLevel: restaure le bloc selon data.niveau ---');
{
  const { mod, blocImg, entityImgs } = build({ niveau: 3 }); // gold
  mod.updateLevel();
  test('bloc principal = gold', blocImg.src.includes('gold'), true);
  test('blocs des entités = gold', entityImgs[0].src.includes('gold'), true);
}

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
