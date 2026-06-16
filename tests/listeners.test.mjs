import fs from 'fs';

// guards the two listener bugs we just fixed:
//  1. the keydown handler must be registered ONCE at top level — not inside the
//     settings click handler (which broke keyboard nav until first open and leaked
//     a listener per open).
//  2. refreshTooltips must wire its delegated listeners ONCE — calling it again
//     (as happens after every purchase) must not add more.

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

console.log('--- keydown : enregistré 1x au chargement, jamais par clic ---');
{
  const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  // slice from the settings click registration to the delegated click handler (covers the keydown registration)
  const start = src.indexOf("document.getElementById('parametres').addEventListener('click'");
  const end = src.indexOf('// delegated click handling');
  const code = src.slice(start, end);

  let keydownCount = 0;
  let clickHandler = null;
  const paramEl = { addEventListener(type, fn) { if (type === 'click') clickHandler = fn; } };
  const documentMock = {
    getElementById: () => paramEl,
    addEventListener(type) { if (type === 'keydown') keydownCount++; },
  };
  new Function('document', 'openSettingsModal', 'closeSettingsModal', 'closeStatsModal', 'closeOfflineModal', code)(
    documentMock, () => {}, () => {}, () => {}, () => {}
  );

  test('keydown enregistré au chargement (clavier actif d\'emblée)', keydownCount, 1);

  // simulate opening the settings several times
  clickHandler(); clickHandler(); clickHandler();
  test('ouvrir les paramètres n\'ajoute aucun keydown (pas de fuite)', keydownCount, 1);
}

console.log('--- refreshTooltips : écouteurs délégués câblés une seule fois ---');
{
  const src = fs.readFileSync(new URL('../modules/tooltips.js', import.meta.url), 'utf8');
  const code = src.slice(src.indexOf('let wired')).replace(/^export\s+/m, '') + '\nreturn { refreshTooltips };';

  let added = 0;
  const elMock = { dataset: {}, closest: () => null, classList: { add() {}, remove() {} }, style: {}, getBoundingClientRect: () => ({ width: 0, height: 0 }) };
  const documentMock = {
    getElementById: () => elMock,
    querySelectorAll: () => [elMock, elMock],
    addEventListener() { added++; },
  };
  const mod = new Function('document', 'window', 'setTimeout', 'clearTimeout', code)(
    documentMock, { innerWidth: 1000, innerHeight: 800 }, () => 1, () => {}
  );

  mod.refreshTooltips();
  const afterFirst = added;
  mod.refreshTooltips();
  mod.refreshTooltips();

  test('le 1er appel câble des écouteurs document', afterFirst > 0, true);
  test('les appels suivants n\'en ajoutent aucun (pas de fuite)', added, afterFirst);
}

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
