import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/save.js', import.meta.url), 'utf8');

// Extraire les fonctions réelles du module save (fnv1aHash + isValidSaveData)
const start = src.indexOf('export function fnv1aHash');
const end = src.length;
const code = src.slice(start, end).replace(/^export\s+/gm, '');

// Mocks des dépendances (ids cohérents avec le jeu : 36 items boutique, 30 succès)
const MAX_LEVEL = 7;
const shop = Array.from({length: 36}, (_, i) => ({ id: i + 1 }));
const achievements = Array.from({length: 30}, (_, i) => ({ id: i + 1 }));
const SAVE_FILE_APP = 'minedle';

const { fnv1aHash, isValidSaveData } = new Function(
  'MAX_LEVEL', 'shop', 'achievements', 'SAVE_FILE_APP',
  code + '\nreturn { fnv1aHash, isValidSaveData };'
)(MAX_LEVEL, shop, achievements, SAVE_FILE_APP); // vrai code du fichier, dépendances injectées

// --- Construire un export comme exportProgress le fait ---
function makeData() {
  return {
    blocsDepuisToujours: 12345.67, blocsActuels: 890.12, bpc: 3, coefficientClic: 1.2,
    entites: [{ nom: 'Pioche', quantite: 5, cout_initial: 15, cout_actuel: 30, rendement_initial: 0.5, rendement_actuel: 0.8, coefficient: 1 }],
    niveau: 2, blocsMinesAvecClics: 400,
    boutique: [{ id: 3, nom: 'X', cout: 100, categorie: 'clics' }],
    inventaire: [{ id: 1, nom: 'Y', cout: 50, categorie: 'blocs' }],
    succes: [{ id: 1 }, { id: 7 }],
    pommes_or: 4, delai_pommes_or_ms: 225000,
  };
}
function makeExport(data) {
  const payload = { data };
  return {
    app: 'minedle', version: 1, exportedAt: new Date().toISOString(),
    checksum: fnv1aHash(JSON.stringify(payload)), payload,
  };
}

let pass = 0, fail = 0;
function test(name, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name} (attendu ${expected}, obtenu ${actual})`);
}

console.log('--- fnv1aHash ---');
test('format 8 hex', /^[0-9a-f]{8}$/.test(fnv1aHash('test')), true);
test('déterministe', fnv1aHash('minedle') === fnv1aHash('minedle'), true);
test('sensible au contenu', fnv1aHash('a') !== fnv1aHash('b'), true);

console.log('--- Round-trip export -> (fichier) -> import ---');
const exported = makeExport(makeData());
const reparsed = JSON.parse(JSON.stringify(exported, null, 2)); // simulate file write/read
test('export valide après round-trip fichier', isValidSaveData(reparsed), true);

console.log('--- Rejets attendus ---');
let f;
f = JSON.parse(JSON.stringify(exported)); f.checksum = 'deadbeef';
test('checksum altéré', isValidSaveData(f), false);
f = JSON.parse(JSON.stringify(exported)); f.payload.data.blocsActuels = 999999999; // tampering après checksum
test('données modifiées après export (tampering)', isValidSaveData(f), false);
f = JSON.parse(JSON.stringify(exported)); f.app = 'motusma';
test('mauvaise app', isValidSaveData(f), false);
test('null', isValidSaveData(null), false);
test('objet vide', isValidSaveData({}), false);

// Cas de schéma invalide : reconstruire avec checksum VALIDE pour tester la validation de schéma
function makeBad(mutator) { const d = makeData(); mutator(d); return makeExport(d); }
test('champ numérique négatif', isValidSaveData(makeBad(d => d.pommes_or = -1)), false);
test('champ numérique manquant', isValidSaveData(makeBad(d => delete d.bpc)), false);
test('champ numérique NaN', isValidSaveData(makeBad(d => d.blocsActuels = NaN)), false);
test('delai < 1000 (anti spam pommes)', isValidSaveData(makeBad(d => d.delai_pommes_or_ms = 0)), false);
test('niveau > MAX_LEVEL', isValidSaveData(makeBad(d => d.niveau = 8)), false);
test('niveau non entier', isValidSaveData(makeBad(d => d.niveau = 2.5)), false);
test('entites pas un array', isValidSaveData(makeBad(d => d.entites = {})), false);
test('entite sans nom', isValidSaveData(makeBad(d => delete d.entites[0].nom)), false);
test('entite quantite négative', isValidSaveData(makeBad(d => d.entites[0].quantite = -3)), false);
test('id boutique inconnu', isValidSaveData(makeBad(d => d.boutique[0].id = 999)), false);
test('id inventaire inconnu', isValidSaveData(makeBad(d => d.inventaire[0].id = 0)), false);
test('id succès inconnu', isValidSaveData(makeBad(d => d.succes.push({ id: 31 }))), false);

console.log('--- Cas limites valides ---');
test('inventaire/succes vides (nouvelle partie)', isValidSaveData(makeExport({ ...makeData(), inventaire: [], succes: [], boutique: [] })), true);
test('niveau 0 et MAX_LEVEL acceptés', isValidSaveData(makeExport({ ...makeData(), niveau: 0 })) && isValidSaveData(makeExport({ ...makeData(), niveau: 7 })), true);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
