import fs from 'fs';
const shopSrc = fs.readFileSync(new URL('../modules/shop.js', import.meta.url), 'utf8');
const achSrc = fs.readFileSync(new URL('../modules/achievements.js', import.meta.url), 'utf8');

// isolate each clear function (only dependency is `document`)
function sliceFn(src, marker) {
  const start = src.indexOf(marker);
  return src.slice(start, src.indexOf('\n}', start) + 2);
}
const clearInventoryCode = sliceFn(shopSrc, 'function clearInventory()');
const clearAchievementsCode = sliceFn(achSrc, 'function clearAchievements()');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// one shared, instrumented cell returned for every getElementById call
function makeCell() {
  const cell = {
    innerHTML: 'CONTENU',
    removed: [],
    classes: new Set(['tooltip-element', 'autre-classe']),
    cloned: false,
    classList: {
      remove: (c) => cell.classes.delete(c),
      contains: (c) => cell.classes.has(c),
    },
    removeAttribute: (a) => cell.removed.push(a),
    cloneNode: () => { cell.cloned = true; return makeCell(); },
    parentNode: { replaced: false, replaceChild() { this.replaced = true; } },
  };
  return cell;
}

function runClear(code, fnName) {
  const cell = makeCell();
  new Function('document', `${code}\n${fnName}();`)({ getElementById: () => cell });
  return cell;
}

console.log('--- clearInventory réinitialise la cellule (#8) ---');
let c = runClear(clearInventoryCode, 'clearInventory');
test('contenu vidé', c.innerHTML, '');
test('classe tooltip-element retirée', c.classList.contains('tooltip-element'), false);
test('autres classes préservées', c.classList.contains('autre-classe'), true);
test('attributs tooltip retirés', ['data-tooltip-title', 'data-tooltip-content-deux', 'data-tooltip-rendement-ratio'].every(a => c.removed.includes(a)), true);
test('AUCUN cloneNode (code mort supprimé)', c.cloned, false);
test('AUCUN replaceChild (le nœud n\'est plus échangé)', c.parentNode.replaced, false);

console.log('--- clearAchievements réinitialise la cellule (#8) ---');
c = runClear(clearAchievementsCode, 'clearAchievements');
test('contenu vidé', c.innerHTML, '');
test('classe tooltip-element retirée', c.classList.contains('tooltip-element'), false);
test('attributs tooltip retirés', ['data-tooltip-title', 'data-tooltip-content-deux'].every(a => c.removed.includes(a)), true);
test('AUCUN cloneNode (code mort supprimé)', c.cloned, false);
test('AUCUN replaceChild', c.parentNode.replaced, false);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
