import fs from 'fs';

// run the real shop module with constants/data/deps injected. mock catalogues let us
// test the buying LOGIC and the dirty-check, independently of the real game data.
const src = fs.readFileSync(new URL('../modules/shop.js', import.meta.url), 'utf8');
const code = src
  .replace(/^import[^\n]*\n/gm, '')
  .replace(/^export\s+/gm, '')
  + '\nreturn { initShop, buyUpgrade, buyEntity, updateShop, updateEntities, updateInventory, clearInventory };';

// --- mock catalogues ---
const shopCat = [
  { id: 4, nom: 'PiochePierre', cout: 50, categorie: 'Pioche', condition: 0, image: 'stone-pickaxe', description: '' },
  { id: 5, nom: 'PiocheFer', cout: 60, categorie: 'Pioche', condition: 0, image: 'iron-pickaxe', description: '' },
  { id: 10, nom: 'ClicX2', cout: 100, categorie: 'clic', condition: 0, image: '', description: '' },
  { id: 11, nom: 'PommeUp', cout: 200, categorie: 'pomme_or', condition: 0, image: '', description: '' },
  { id: 12, nom: 'VillageoisUp', cout: 300, categorie: 'Villageois', condition: 0, image: '', description: '' },
];
const entitiesCat = [
  { nom: 'Villageois', seuil_affichage: 100, cout_initial: 50, rendement_initial: 1, coefficient: 1 },
];
const computeCost = (initial, q) => Math.round(initial * Math.pow(1.15, q));
const computeYield = (initial, q) => initial * q;

// --- mock DOM that tracks writes (to verify the dirty-check) ---
function makeChild() {
  const classes = new Set();
  return { dataset: {}, classList: mkClassList(classes), src: '', style: {}, setAttribute() {}, removeAttribute() {} };
}
function mkClassList(classes) {
  return {
    ops: 0,
    add(c) { if (!classes.has(c)) { classes.add(c); this.ops++; } },
    remove(c) { if (classes.has(c)) { classes.delete(c); this.ops++; } },
    toggle(c, f) { const want = f === undefined ? !classes.has(c) : f; const has = classes.has(c); if (want && !has) { classes.add(c); this.ops++; } else if (!want && has) { classes.delete(c); this.ops++; } return want; },
    contains: c => classes.has(c),
  };
}
function makeDoc() {
  const els = {};
  const img = makeChild();
  function el(id) {
    if (!els[id]) {
      const classes = new Set();
      const child = makeChild();
      els[id] = {
        id, writes: 0, _html: '', dataset: {}, style: {},
        get innerHTML() { return this._html; },
        set innerHTML(v) { this._html = v; this.writes++; },
        classList: mkClassList(classes),
        _child: child,
        querySelectorAll() { return [child]; },
        querySelector() { return img; },
        appendChild(c) { return c; },
        setAttribute() {}, removeAttribute() {},
        cloneNode() { return makeChild(); },
        get parentNode() { return { replaceChild() {} }; },
        remove() {},
      };
    }
    return els[id];
  }
  return { getElementById: el, createElement: () => makeChild(), querySelectorAll: () => [], body: makeChild(), _img: img, _els: els };
}

function build(startData) {
  const data = Object.assign({
    blocsActuels: 0, blocsDepuisToujours: 0, blocsMinesAvecClics: 0, pommes_or: 0,
    bpc: 1, coefficientClic: 1, delai_pommes_or_ms: 300000,
    boutique: [], inventaire: [], entites: [],
  }, startData);
  const doc = makeDoc();
  let saves = 0, blocksDisp = 0, tooltips = 0, checkEnt = 0, checkMisc = 0;
  const mod = new Function('computeCost', 'computeYield', 'entities', 'shop', 'data', 'formatNumber', 'checkEntityAchievements', 'checkMiscAchievements', 'document', 'window', code)(
    computeCost, computeYield, entitiesCat, shopCat, data, n => String(Math.round(n)), () => checkEnt++, () => checkMisc++, doc, { scrollY: 0 }
  );
  mod.initShop({
    saveProgress: () => saves++, updateBlocksDisplay: () => blocksDisp++,
    refreshTooltips: () => tooltips++, computeGlobalYieldPerSecond: () => {
      let b = 0; data.entites.forEach(e => b += e.rendement_actuel * e.quantite * e.coefficient); return b || 1;
    },
    buyUpgradeSound: { play() {} }, buyEntitySound: { play() {} },
  });
  return { mod, data, doc, stats: () => ({ saves, blocksDisp, tooltips, checkEnt, checkMisc }) };
}

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

console.log('--- buyUpgrade: effet clic (bpc x2) ---');
{
  const b = build({ blocsActuels: 150, boutique: [{ id: 10, nom: 'ClicX2', cout: 100, categorie: 'clic' }] });
  b.mod.buyUpgrade('ClicX2');
  test('bpc doublé', b.data.bpc, 2);
  test('coût déduit', b.data.blocsActuels, 50);
  test('retiré de la boutique', b.data.boutique.length, 0);
  test('ajouté à l\'inventaire', b.data.inventaire.map(i => i.id), [10]);
  test('sauvegarde déclenchée', b.stats().saves, 1);
}

console.log('--- buyUpgrade: effet pomme_or (délai x0.75) ---');
{
  const b = build({ blocsActuels: 200, delai_pommes_or_ms: 300000, boutique: [{ id: 11, nom: 'PommeUp', cout: 200, categorie: 'pomme_or' }] });
  b.mod.buyUpgrade('PommeUp');
  test('délai réduit de 25%', b.data.delai_pommes_or_ms, 225000);
}

console.log('--- buyUpgrade: effet entité (coefficient x2) ---');
{
  const b = build({ blocsActuels: 300, entites: [{ nom: 'Villageois', quantite: 3, coefficient: 1 }], boutique: [{ id: 12, nom: 'VillageoisUp', cout: 300, categorie: 'Villageois' }] });
  b.mod.buyUpgrade('VillageoisUp');
  test('coefficient de l\'entité doublé', b.data.entites[0].coefficient, 2);
}

console.log('--- buyUpgrade: solde insuffisant = no-op ---');
{
  const b = build({ blocsActuels: 50, boutique: [{ id: 10, nom: 'ClicX2', cout: 100, categorie: 'clic' }] });
  b.mod.buyUpgrade('ClicX2');
  test('bpc inchangé', b.data.bpc, 1);
  test('toujours dans la boutique', b.data.boutique.length, 1);
  test('aucune sauvegarde', b.stats().saves, 0);
}

console.log('--- buyEntity: achat ---');
{
  const b = build({ blocsActuels: 100, coefficientClic: 1, entites: [{ nom: 'Villageois', quantite: 0, cout_initial: 50, cout_actuel: 50, rendement_initial: 1, rendement_actuel: 0, coefficient: 1 }] });
  b.mod.buyEntity('Villageois');
  const e = b.data.entites[0];
  test('quantité +1', e.quantite, 1);
  test('coût déduit', b.data.blocsActuels, 50);
  test('coût recalculé', e.cout_actuel, computeCost(50, 1));
  test('rendement recalculé', e.rendement_actuel, computeYield(1, 1));
  test('coefficientClic x1.02', Math.round(b.data.coefficientClic * 100) / 100, 1.02);
  test('vérifs succès entité + divers appelées', [b.stats().checkEnt, b.stats().checkMisc], [1, 1]);
}

console.log('--- buyEntity: solde insuffisant = no-op ---');
{
  const b = build({ blocsActuels: 10, entites: [{ nom: 'Villageois', quantite: 0, cout_initial: 50, cout_actuel: 50, rendement_initial: 1, rendement_actuel: 0, coefficient: 1 }] });
  b.mod.buyEntity('Villageois');
  test('quantité inchangée', b.data.entites[0].quantite, 0);
  test('aucune sauvegarde', b.stats().saves, 0);
}

console.log('--- updatePickaxeEntityImage (via buyUpgrade pioche) ---');
{
  const b = build({ blocsActuels: 100, boutique: [{ id: 5, nom: 'PiocheFer', cout: 60, categorie: 'Pioche' }] });
  b.mod.buyUpgrade('PiocheFer');
  test('image pioche = fer (id 5 en inventaire)', b.doc._img.src, 'iron-pickaxe');
}

console.log('--- updateShop: disabled selon le solde ---');
{
  const b = build({ blocsActuels: 100, boutique: [{ id: 10, nom: 'ClicX2', cout: 100, categorie: 'clic', condition: 0 }] });
  b.mod.updateShop();
  test('abordable : pas disabled', b.doc.getElementById('ClicX2-amelioration').classList.contains('disabled'), false);

  const b2 = build({ blocsActuels: 50, boutique: [{ id: 10, nom: 'ClicX2', cout: 100, categorie: 'clic', condition: 0 }] });
  b2.mod.updateShop();
  test('trop cher : disabled', b2.doc.getElementById('ClicX2-amelioration').classList.contains('disabled'), true);
}

console.log('--- updateEntities: visibilité selon seuil_affichage ---');
{
  const b = build({ blocsDepuisToujours: 50, entites: [{ nom: 'Villageois', quantite: 0, cout_actuel: 50, rendement_actuel: 0, coefficient: 1 }] });
  b.mod.updateEntities();
  test('sous le seuil d\'affichage : bloque', b.doc.getElementById('Villageois-entite').classList.contains('bloque'), true);

  const b2 = build({ blocsDepuisToujours: 150, entites: [{ nom: 'Villageois', quantite: 0, cout_actuel: 50, rendement_actuel: 0, coefficient: 1 }] });
  b2.mod.updateEntities();
  test('au-dessus du seuil : visible', b2.doc.getElementById('Villageois-entite').classList.contains('bloque'), false);
}

console.log('--- DIRTY-CHECK: 2e appel identique = aucune réécriture DOM ---');
{
  const b = build({ blocsActuels: 1000, blocsDepuisToujours: 150, entites: [{ nom: 'Villageois', quantite: 3, cout_actuel: 50, rendement_actuel: 2, coefficient: 1 }] });
  b.mod.updateEntities(); // 1er rendu : écrit
  const cout = b.doc.getElementById('Villageois-cout');
  const qty = b.doc.getElementById('Villageois-quantite');
  const entEl = b.doc.getElementById('Villageois-entite');
  const writesAfter1 = cout.writes + qty.writes;
  const opsAfter1 = entEl.classList.ops + cout.classList.ops;
  b.mod.updateEntities(); // 2e rendu : données inchangées -> rien ne doit bouger
  test('innerHTML non réécrit au 2e appel', cout.writes + qty.writes, writesAfter1);
  test('classes non re-togglées au 2e appel', entEl.classList.ops + cout.classList.ops, opsAfter1);
  test('1er appel a bien écrit quelque chose', writesAfter1 > 0, true);
}

console.log('--- updateInventory: remplit le libellé ---');
{
  const b = build({ inventaire: [{ id: 10 }] });
  b.mod.updateInventory();
  test('libellé inventaire mis à jour', b.doc.getElementById('inventaire-label').innerHTML.includes('1/'), true);
}

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
