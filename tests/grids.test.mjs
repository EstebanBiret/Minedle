import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/grids.js', import.meta.url), 'utf8');
const code = src.replace(/^import[^\n]*\n/gm, ''); // buildGrid runs at module load

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// reconstruct the module with mocked catalogue + document, capturing created cells
function run(shop, achievements, withContainers = true) {
  const cells = { 'inventaire-grille': [], 'succes-grille': [] };
  const document = {
    getElementById: (id) =>
      (withContainers && id in cells)
        ? { appendChild: (frag) => cells[id].push(...frag.__cells) }
        : null,
    createElement: () => ({}),
    createDocumentFragment: () => ({ __cells: [], appendChild(c) { this.__cells.push(c); } }),
  };
  new Function('shop', 'achievements', 'document', code)(shop, achievements, document);
  return cells;
}

console.log('--- #5 : génération des cases depuis le catalogue ---');
const cells = run([{ id: 1 }, { id: 2 }, { id: 3 }], [{ id: 1 }, { id: 2 }]);
test('inventaire : une case par item, id préfixé', cells['inventaire-grille'].map(c => c.id), ['inventaire-1', 'inventaire-2', 'inventaire-3']);
test('succès : une case par succès, id préfixé', cells['succes-grille'].map(c => c.id), ['succes-1', 'succes-2']);

console.log('--- ids non contigus respectés ---');
const cells2 = run([{ id: 4 }, { id: 9 }], [{ id: 7 }]);
test('inventaire suit les ids réels (4, 9)', cells2['inventaire-grille'].map(c => c.id), ['inventaire-4', 'inventaire-9']);

console.log('--- conteneur absent : pas de plantage ---');
let threw = false;
try { run([{ id: 1 }], [{ id: 1 }], false); } catch { threw = true; }
test('aucune exception si le conteneur manque', threw, false);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
