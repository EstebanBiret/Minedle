import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/particles.js', import.meta.url), 'utf8');
const code = src.replace(/^export\s+/gm, ''); // expose pop via return

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// count how many particle nodes pop() appends to the body for a given motion pref
function appendedCount(reducedMotion) {
  let appended = 0;
  const particle = { style: {}, animate: () => ({}), remove() {} };
  const document = { createElement: () => particle, body: { appendChild: () => { appended++; } } };
  const window = { matchMedia: () => ({ matches: reducedMotion }), scrollY: 0 };
  const apple = { getBoundingClientRect: () => ({ left: 100, top: 100, width: 50, height: 50 }) };
  const pop = new Function('document', 'window', code + '\nreturn pop;')(document, window);
  pop(apple);
  return appended;
}

console.log('--- #9 : éclat de particules conditionné par prefers-reduced-motion ---');
test('mouvement normal : 30 particules créées', appendedCount(false), 30);
test('reduced-motion : aucune particule (retour anticipé)', appendedCount(true), 0);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
