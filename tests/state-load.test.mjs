import fs from 'fs';
const stateSrc = fs.readFileSync(new URL('../modules/state.js', import.meta.url), 'utf8');
const indexSrc = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// --- reconstruct the state.js loader (readStorageJSON + DEFAULT_DATA + `data`) ---
const rsStart = stateSrc.indexOf('export function readStorageJSON');
const rsCode = stateSrc.slice(rsStart, stateSrc.indexOf('\n}', rsStart) + 2).replace(/^export\s+/, '');

const ddStart = stateSrc.indexOf('export const DEFAULT_DATA');
const ddEnd = stateSrc.indexOf(';', stateSrc.indexOf('export let data =')) + 1;
const ddCode = stateSrc.slice(ddStart, ddEnd).replace(/^export\s+/gm, '');

function loadWith(stored) {
  const localStorage = { getItem: () => stored };
  const readStorageJSON = new Function('localStorage', 'console', rsCode + '\nreturn readStorageJSON;')(localStorage, { error() {} });
  const entities = [{ nom: 'X', cout_initial: 10, rendement_initial: 1, coefficient: 1 }];
  const shop = [{ id: 1, nom: 'Y', cout: 5, categorie: 'clic' }];
  return new Function('entities', 'shop', 'readStorageJSON', 'structuredClone',
    ddCode + '\nreturn { data, DEFAULT_DATA };')(entities, shop, readStorageJSON, structuredClone);
}

console.log('--- Nouvelle partie : pas d\'alias de DEFAULT_DATA (#2) ---');
let s = loadWith(null);
s.data.blocsActuels = 12345;
s.data.entites[0].quantite = 9;
test('data est un clone, pas le template', s.DEFAULT_DATA.blocsActuels, 0);
test('muter data.entites ne touche pas DEFAULT_DATA', s.DEFAULT_DATA.entites[0].quantite, 0);

console.log('--- Entrée illisible : repli sur un clone vierge ---');
s = loadWith('{ ceci n\'est pas du JSON');
test('JSON corrompu -> état par défaut (blocsActuels 0)', s.data.blocsActuels, 0);
s.data.blocsActuels = 7;
test('repli toujours indépendant de DEFAULT_DATA', s.DEFAULT_DATA.blocsActuels, 0);

console.log('--- Sauvegarde présente : chargée telle quelle ---');
s = loadWith(JSON.stringify({ blocsActuels: 42 }));
test('objet stocké chargé (pas écrasé par un clone)', s.data.blocsActuels, 42);

// --- reconstruct the index.js load-guard (validate-or-reset) ---
console.log('--- Garde index.js : valider au chargement, sinon reset (#1) ---');
const gStart = indexSrc.indexOf('if (!isValidGameData(data))');
const gCode = indexSrc.slice(gStart, indexSrc.indexOf('\n', gStart));
function runGuard(valid) {
  let reset = null;
  new Function('isValidGameData', 'data', 'setData', 'structuredClone', 'DEFAULT_DATA', gCode)(
    () => valid,
    { tag: 'loaded' },
    (d) => { reset = d; },
    (o) => ({ ...o, cloned: true }),
    { tag: 'default' });
  return reset;
}
test('données invalides -> reset vers un clone des défauts', runGuard(false), { tag: 'default', cloned: true });
test('données valides -> aucun reset', runGuard(true), null);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
