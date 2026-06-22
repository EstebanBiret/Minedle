import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/prestige.js', import.meta.url), 'utf8');
// read the configured star threshold so the tests survive tuning (no hard-coded block counts)
const PER_STAR = Number(src.match(/BLOCKS_PER_STAR\s*=\s*([\d.eE+]+)/)[1]);
// reconstruct the module with state.js injected (same technique as prestige.test.mjs):
// strip imports/exports, run the body with data/setData/DEFAULT_DATA, return the shop API.
const code = src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '')
  + '\nreturn { NETHER_UPGRADES, netherLevel, netherUpgradeCost, buyNetherUpgrade, prestigeMultiplier,'
  + ' productionMultiplier, clickMultiplier, netherDiscount, netherHeadStart, starsToGain, performAscension };';

const DEFAULT_DATA = {
  blocsActuels: 0, blocsDepuisToujours: 0, blocsMinesAvecClics: 0,
  bpc: 1, coefficientClic: 1, niveau: 0, pommes_or: 0, delai_pommes_or_ms: 300000,
  entites: [{ nom: 'Pioche', quantite: 0, coefficient: 1 }],
  boutique: [{ id: 1 }], inventaire: [], succes: [],
};
let captured = null;
const setData = (d) => { captured = d; };
const data = {
  blocsDepuisToujours: 0, etoiles_nether: 0, etoiles_nether_gagnees: 0, ascensions: 0,
  ameliorations_nether: {}, succes: [], temps_de_jeu_ms: 0, derniere_visite: 0,
};
const P = new Function('data', 'setData', 'DEFAULT_DATA', code)(data, setData, DEFAULT_DATA);

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};
// float-tolerant variant for the multiplier / discount maths
const approx = (name, actual, expected) => {
  const ok = Math.abs(actual - expected) < 1e-9;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ≈${expected}, obtenu ${actual})`}`);
};

console.log('--- niveau d\'amélioration (lecture de ameliorations_nether) ---');
data.ameliorations_nether = {};                  test('absent -> 0', P.netherLevel('production'), 0);
data.ameliorations_nether = { production: 3 };   test('niveau 3', P.netherLevel('production'), 3);
data.ameliorations_nether = { production: -1 };  test('négatif -> 0', P.netherLevel('production'), 0);
data.ameliorations_nether = { production: 2.5 }; test('non entier -> 0', P.netherLevel('production'), 0);

console.log('--- coût de la prochaine amélioration : ceil(base × growth^niveau) [lu depuis la config] ---');
const prodDef = P.NETHER_UPGRADES.find(u => u.id === 'production');
data.ameliorations_nether = {};
test('coût niveau 0', P.netherUpgradeCost('production'), Math.ceil(prodDef.base));
data.ameliorations_nether = { production: 1 };
test('coût niveau 1', P.netherUpgradeCost('production'), Math.ceil(prodDef.base * prodDef.growth));
data.ameliorations_nether = { production: 4 };
test('coût niveau 4', P.netherUpgradeCost('production'), Math.ceil(prodDef.base * prodDef.growth ** 4));
test('id inconnu -> null', P.netherUpgradeCost('inconnu'), null);

console.log('--- cap : coût null une fois le plafond atteint ---');
const marcheDef = P.NETHER_UPGRADES.find(u => u.id === 'marche');
data.ameliorations_nether = { marche: marcheDef.cap - 1 };
test('un cran sous le cap -> coût défini', typeof P.netherUpgradeCost('marche'), 'number');
data.ameliorations_nether = { marche: marcheDef.cap };
test('au cap -> null', P.netherUpgradeCost('marche'), null);

console.log('--- achat : débit des étoiles + montée de niveau ---');
data.ameliorations_nether = {}; data.etoiles_nether = 1000;
const cost0 = P.netherUpgradeCost('production');
test('achat réussi -> true', P.buyNetherUpgrade('production'), true);
test('étoiles débitées', data.etoiles_nether, 1000 - cost0);
test('niveau monté à 1', P.netherLevel('production'), 1);

console.log('--- achat refusé si pas assez d\'étoiles ---');
data.ameliorations_nether = {}; data.etoiles_nether = 0;
test('achat refusé -> false', P.buyNetherUpgrade('production'), false);
test('étoiles inchangées', data.etoiles_nether, 0);
test('niveau inchangé (0)', P.netherLevel('production'), 0);

console.log('--- achat refusé au cap ---');
data.ameliorations_nether = { marche: marcheDef.cap }; data.etoiles_nether = 1e9;
test('achat au cap -> false', P.buyNetherUpgrade('marche'), false);
test('niveau toujours au cap', P.netherLevel('marche'), marcheDef.cap);

console.log('--- multiplicateurs : passif (durée de vie) × bonus boutique ---');
data.ameliorations_nether = { production: 2, clic: 1 };
data.etoiles_nether_gagnees = 10; // passif ×1,5
approx('production ×1,5 × (1 + 0,10×2) = ×1,8', P.productionMultiplier(), 1.8);
approx('clic ×1,5 × (1 + 0,50×1) = ×2,25', P.clickMultiplier(), 2.25);
data.etoiles_nether = 2; // dépenser ne doit PAS toucher le passif (basé sur etoiles_nether_gagnees)
approx('le passif ignore le solde dépensable', P.prestigeMultiplier(), 1.5);

console.log('--- remise du Marché (−4 %/niveau, plancher 0,1) ---');
data.ameliorations_nether = {};               approx('aucun niveau -> ×1', P.netherDiscount(), 1);
data.ameliorations_nether = { marche: 3 };    approx('niveau 3 -> ×0,88', P.netherDiscount(), 0.88);
data.ameliorations_nether = { marche: 100 };  approx('plancher à 0,1', P.netherDiscount(), 0.1);

console.log('--- avance du Nether (% de la run précédente) ---');
data.ameliorations_nether = {};            test('aucun niveau -> 0', P.netherHeadStart(1000), 0);
data.ameliorations_nether = { avance: 1 };
const hs1 = P.netherHeadStart(1000);
test('niveau 1 -> > 0', hs1 > 0, true);
data.ameliorations_nether = { avance: 2 };
test('linéaire avec le niveau', P.netherHeadStart(1000), hs1 * 2);

console.log('--- rendement d\'étoiles (Étoile montante, +10 %/niveau) ---');
data.blocsDepuisToujours = 100 * PER_STAR; // base = 10 étoiles
data.ameliorations_nether = {};            test('sans bonus -> 10', P.starsToGain(), 10);
data.ameliorations_nether = { etoile: 2 }; test('+20 % -> 12', P.starsToGain(), 12);

console.log('--- ascension : banque vers les DEUX soldes + avance + conserve les améliorations ---');
data.blocsDepuisToujours = 4 * PER_STAR; // base 2 étoiles
data.etoiles_nether = 5; data.etoiles_nether_gagnees = 8; data.ascensions = 1;
data.ameliorations_nether = { avance: 1, production: 3 };
data.succes = [{ id: 1 }]; data.temps_de_jeu_ms = 500; data.blocsActuels = 99999;
captured = null;
const gain = P.performAscension();
test('gain = 2', gain, 2);
test('solde dépensable banqué (5 + 2)', captured.etoiles_nether, 7);
test('total gagné banqué (8 + 2)', captured.etoiles_nether_gagnees, 10);
test('ascensions +1', captured.ascensions, 2);
test('démarrage = avance head-start', captured.blocsActuels, P.netherHeadStart(4 * PER_STAR));
test('améliorations du Nether conservées', captured.ameliorations_nether, { avance: 1, production: 3 });
test('succès conservés', captured.succes, [{ id: 1 }]);
test('temps de jeu conservé', captured.temps_de_jeu_ms, 500);

console.log('--- non-régression : solde dépensable rouge à 0 (comme le gain d\'ascension) ---');
const cssSrc = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
test('CSS: #nether-shop-button-gain.zero présent (passe au rouge)', /#nether-shop-button-gain\.zero/.test(cssSrc), true);
const idxSrc = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
test('JS: .zero togglé sur le solde Boutique', /netherShopButtonGain\.classList\.toggle\(\s*['"]zero['"]/.test(idxSrc), true);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
