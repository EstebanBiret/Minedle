import fs from 'fs';

// run the real achievements module with its catalogue + data + DOM + Audio injected.
// the catalogue is a focused mock (one entry per category) so we test the unlock
// LOGIC, not the real success.js values.
const src = fs.readFileSync(new URL('../modules/achievements.js', import.meta.url), 'utf8');
const code = src
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/^export\s+/gm, '')
  + '\nreturn { initAchievements, TOTAL_ACHIEVEMENTS, checkGoldenAppleAchievements, checkClickAchievements, checkBlockAchievements, checkEntityAchievements, checkMiscAchievements, updateAchievements, unlockAchievement, clearAchievements };';

// minimal DOM mock: every element supports what updateAchievements/notification touch
function makeEl() {
  const el = {
    textContent: '', style: {}, clientHeight: 10,
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, removeAttribute() {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    cloneNode() { return makeEl(); },
    get parentNode() { return { replaceChild() {} }; },
    remove() {},
  };
  return el;
}
const doc = {
  getElementById: () => makeEl(),
  createElement: () => makeEl(),
  body: makeEl(),
};

// catalogue mock: one achievement per category type
const catalogue = [
  { id: 1, categorie: 'clics', seuil: 100, nom: 'Clic 100', description: '', image: '' },
  { id: 2, categorie: 'bps', seuil: 500, nom: 'BPS 500', description: '', image: '' },
  { id: 3, categorie: 'blocs_totaux', seuil: 10000, nom: 'Blocs 10k', description: '', image: '' },
  { id: 4, categorie: 'Villageois', seuil: 5, nom: 'Villageois 5', description: '', image: '' },
  { id: 5, categorie: 'pomme_or', seuil: 3, nom: 'Pommes 3', description: '', image: '' },
  { id: 27, categorie: 'divers', nom: '25 de chaque', description: '', image: '' },
];

// entities catalogue mock: checkEntityAchievements derives its category set from entity names
const entitiesMock = [{ nom: 'Villageois' }];

function build(startData, bps = 0) {
  const data = Object.assign({
    succes: [], pommes_or: 0, blocsMinesAvecClics: 0, blocsDepuisToujours: 0,
    entites: [{ nom: 'Villageois', quantite: 0 }],
  }, startData);
  let tooltipRefreshes = 0;
  const mod = new Function('achievements', 'entities', 'data', 'document', 'Audio', 'setTimeout', code)(
    catalogue, entitiesMock, data, doc, class { play() {} constructor() {} }, () => {}
  );
  mod.initAchievements({ refreshTooltips: () => tooltipRefreshes++, computeGlobalYieldPerSecond: () => bps });
  return { mod, data, getRefreshes: () => tooltipRefreshes };
}

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};
const ids = data => data.succes.map(s => s.id).sort((a, b) => a - b);

console.log('--- TOTAL_ACHIEVEMENTS ---');
{
  const { mod } = build();
  test('reflète la taille du catalogue', mod.TOTAL_ACHIEVEMENTS, catalogue.length);
}

console.log('--- checkClickAchievements ---');
{
  let b = build({ blocsMinesAvecClics: 99 });
  b.mod.checkClickAchievements();
  test('sous le seuil : rien', ids(b.data), []);
  b = build({ blocsMinesAvecClics: 100 });
  b.mod.checkClickAchievements();
  test('au seuil : succès clic débloqué', ids(b.data), [1]);
}

console.log('--- checkBlockAchievements (bps + blocs_totaux) ---');
{
  let b = build({}, 500); // bps = 500
  b.mod.checkBlockAchievements();
  test('bps au seuil : succès bps', ids(b.data), [2]);
  b = build({ blocsDepuisToujours: 10000 }, 0);
  b.mod.checkBlockAchievements();
  test('blocs totaux au seuil : succès blocs', ids(b.data), [3]);
  b = build({ blocsDepuisToujours: 9999 }, 499);
  b.mod.checkBlockAchievements();
  test('les deux sous le seuil : rien', ids(b.data), []);
}

console.log('--- checkEntityAchievements ---');
{
  let b = build({ entites: [{ nom: 'Villageois', quantite: 4 }] });
  b.mod.checkEntityAchievements();
  test('entité sous le seuil : rien', ids(b.data), []);
  b = build({ entites: [{ nom: 'Villageois', quantite: 5 }] });
  b.mod.checkEntityAchievements();
  test('entité au seuil : succès entité', ids(b.data), [4]);
}

console.log('--- checkGoldenAppleAchievements ---');
{
  let b = build({ pommes_or: 2 });
  b.mod.checkGoldenAppleAchievements();
  test('sous le seuil : rien', ids(b.data), []);
  b = build({ pommes_or: 3 });
  b.mod.checkGoldenAppleAchievements();
  test('au seuil : succès pommes', ids(b.data), [5]);
}

console.log('--- checkMiscAchievements (25 de chaque) ---');
{
  let b = build({ entites: [{ nom: 'Villageois', quantite: 24 }] });
  b.mod.checkMiscAchievements();
  test('une entité < 25 : pas de succès divers', ids(b.data), []);
  b = build({ entites: [{ nom: 'Villageois', quantite: 25 }] });
  b.mod.checkMiscAchievements();
  test('toutes >= 25 : succès #27', ids(b.data), [27]);
}

console.log('--- #10 : data.succes ne stocke que l\'id (pas l\'objet complet) ---');
{
  const b = build({ pommes_or: 3 });
  b.mod.checkGoldenAppleAchievements(); // débloque le succès 5
  test('l\'entrée débloquée est exactement { id }', b.data.succes, [{ id: 5 }]);
  test('aucune donnée d\'affichage stockée (nom/image/categorie)', b.data.succes.every(s => Object.keys(s).join() === 'id'), true);
}

console.log('--- unlockAchievement: idempotence + robustesse ---');
{
  const b = build({ pommes_or: 3 });
  b.mod.checkGoldenAppleAchievements();
  b.mod.checkGoldenAppleAchievements(); // 2e appel
  test('pas de double déblocage', ids(b.data), [5]);
  test('refreshTooltips appelé une seule fois', b.getRefreshes(), 1);

  const b2 = build();
  b2.mod.unlockAchievement(999); // id inexistant
  test('id inexistant : no-op', ids(b2.data), []);
}

console.log('--- updateAchievements: recalcul des manquants ---');
{
  // 2 succès déjà débloqués -> seuls les autres restent "manquants" et débloquables
  const b = build({ succes: [{ id: 1 }, { id: 2 }], pommes_or: 3 });
  b.mod.updateAchievements();
  b.mod.checkGoldenAppleAchievements();
  test('débloque le 5 par-dessus les 1 et 2 existants', ids(b.data), [1, 2, 5]);
}

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
