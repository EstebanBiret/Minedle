import fs from 'fs';
const src = fs.readFileSync(new URL('../constants/entities.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// the entities array no longer references the DOM, so it now evaluates standalone
// (no getElementById, no document needed). If a dead `quantite: document.getElementById`
// were reintroduced, this eval would throw -> the suite would catch it.
const start = src.indexOf('export const entities = [');
const end = src.indexOf('];', start) + 2;
const arrCode = src.slice(start, end).replace('export const entities =', 'return');
let entities, threw = false;
try { entities = new Function(arrCode)(); } catch { threw = true; }

console.log('--- #14 : constante entities nettoyée de la référence DOM morte ---');
test('le tableau s\'évalue sans DOM (plus de getElementById)', threw, false);
test('10 entités présentes', entities.length, 10);
test('aucune entité ne porte de champ quantite', entities.every(e => !('quantite' in e)), true);
test('chaque entité garde seuil_affichage (réellement utilisé)', entities.every(e => 'seuil_affichage' in e), true);
test('chaque entité garde nom / cout_initial / coefficient', entities.every(e => 'nom' in e && 'cout_initial' in e && 'coefficient' in e), true);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
