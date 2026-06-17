import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/save.js', import.meta.url), 'utf8');
// run the real migrateData with the catalogue + DEFAULT_DATA injected
const code = src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '') + '\nreturn { migrateData };';

const shop = [
  { id: 1, nom: 'A', cout: 10, categorie: 'clic' },
  { id: 2, nom: 'B', cout: 20, categorie: 'Villageois' },
  { id: 3, nom: 'C', cout: 30, categorie: 'clic' }, // "new" upgrade (often absent from old saves)
];
const achievements = [{ id: 1 }, { id: 2 }];
const entities = [
  { nom: 'Villageois', cout_initial: 50, rendement_initial: 1, coefficient: 1 },
  { nom: 'Golem', cout_initial: 500, rendement_initial: 10, coefficient: 2 }, // "new" entity
];
const DEFAULT_DATA = {
  derniere_visite: 0, temps_de_jeu_ms: 0, blocsDepuisToujours: 0, blocsActuels: 0,
  bpc: 1, coefficientClic: 1,
  entites: entities.map(u => ({ nom: u.nom, quantite: 0, cout_initial: u.cout_initial, cout_actuel: u.cout_initial, rendement_initial: u.rendement_initial, rendement_actuel: 0, coefficient: u.coefficient })),
  niveau: 0, blocsMinesAvecClics: 0,
  boutique: shop.map(u => ({ id: u.id, nom: u.nom, cout: u.cout, categorie: u.categorie })),
  inventaire: [], succes: [], pommes_or: 0, delai_pommes_or_ms: 300000,
};
const migrateData = new Function('shop', 'achievements', 'entities', 'MAX_LEVEL', 'DEFAULT_DATA', code)(
  shop, achievements, entities, 7, DEFAULT_DATA
).migrateData;

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// a save from an OLDER version: only 'Villageois', upgrade 1 bought, no 'Golem'/upgrade 3 yet
const oldSave = {
  blocsActuels: 1000, blocsDepuisToujours: 5000, niveau: 2, pommes_or: 7,
  entites: [{ nom: 'Villageois', quantite: 5, cout_initial: 50, cout_actuel: 80, rendement_initial: 1, rendement_actuel: 1, coefficient: 1 }],
  inventaire: [{ id: 1, nom: 'A', cout: 10, categorie: 'clic' }],
  boutique: [{ id: 2, nom: 'B', cout: 20, categorie: 'Villageois' }],
  succes: [{ id: 1 }],
};

console.log('--- N1 : ajout de contenu (entité + amélioration neuves) ---');
let m = migrateData(oldSave);
test('entité existante : progression conservée', m.entites.find(e => e.nom === 'Villageois').quantite, 5);
test('entité existante : coût actuel conservé', m.entites.find(e => e.nom === 'Villageois').cout_actuel, 80);
test('nouvelle entité ajoutée (quantité 0)', m.entites.find(e => e.nom === 'Golem')?.quantite, 0);
test('toutes les entités du catalogue présentes', m.entites.map(e => e.nom), ['Villageois', 'Golem']);
test('amélioration achetée : reste dans l\'inventaire', m.inventaire.map(u => u.id), [1]);
test('nouvelle amélioration : disponible en boutique', m.boutique.map(u => u.id).sort(), [2, 3]);

console.log('--- scalaires conservés ---');
test('blocs actuels conservés', m.blocsActuels, 1000);
test('niveau conservé', m.niveau, 2);

console.log('--- suppression de contenu (ids disparus) ---');
const staleSave = {
  entites: [{ nom: 'Villageois', quantite: 3, cout_initial: 50, cout_actuel: 50, rendement_initial: 1, rendement_actuel: 1, coefficient: 1 },
            { nom: 'MobSupprimé', quantite: 9, cout_initial: 1, cout_actuel: 1, rendement_initial: 1, rendement_actuel: 1, coefficient: 1 }],
  inventaire: [{ id: 1 }, { id: 99 }], // 99 n'existe plus
  boutique: [],
  succes: [{ id: 1 }, { id: 99 }],     // 99 n'existe plus
};
m = migrateData(staleSave);
test('entité disparue : retirée', m.entites.map(e => e.nom), ['Villageois', 'Golem']);
test('id boutique inconnu : ignoré (pas de rejet)', m.inventaire.map(u => u.id), [1]);
test('succès inconnu : retiré', m.succes.map(s => s.id), [1]);

console.log('--- champ d\'entité manquant : complété depuis le catalogue ---');
m = migrateData({ entites: [{ nom: 'Villageois', quantite: 2 }], inventaire: [], boutique: [], succes: [] });
test('coefficient manquant rempli', m.entites.find(e => e.nom === 'Villageois').coefficient, 1);
test('quantité partielle conservée', m.entites.find(e => e.nom === 'Villageois').quantite, 2);

console.log('--- entrée invalide : état neuf ---');
test('null -> défaut neuf', migrateData(null).entites.map(e => e.nom), ['Villageois', 'Golem']);
test('non-objet -> défaut neuf', migrateData('abc').blocsActuels, 0);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
