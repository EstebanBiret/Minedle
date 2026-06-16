import fs from 'fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
// the delegated click listener sits between these two markers
const start = src.indexOf('// delegated click handling');
const end = src.indexOf('// game loop');
const code = src.slice(start, end);

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function setup() {
  const calls = [];
  let handler = null;
  const settingsModal = { id: 'parametres-modal' };
  const statsModal = { id: 'stats-modal' };
  const els = { 'parametres-modal': settingsModal, 'stats-modal': statsModal };
  const document = {
    getElementById: (id) => els[id],
    addEventListener: (type, fn) => { if (type === 'click') handler = fn; },
  };
  const record = (name) => (arg) => calls.push(arg === undefined ? name : `${name}:${arg}`);
  const location = { reload: () => calls.push('reload') };
  new Function('document', 'buyEntity', 'buyUpgrade', 'openStatsModal', 'closeStatsModal',
    'closeSettingsModal', 'closeOfflineModal', 'importProgress', 'exportProgress', 'deleteProgress', 'location', code)(
    document, record('buyEntity'), record('buyUpgrade'), record('openStatsModal'), record('closeStatsModal'),
    record('closeSettingsModal'), record('closeOfflineModal'), record('importProgress'), record('exportProgress'),
    record('deleteProgress'), location);

  return {
    calls,
    hasHandler: () => handler !== null,
    // click on an element carrying data-action (and optional data-nom)
    click: (action, nom) => {
      const trigger = action == null ? null : { dataset: nom == null ? { action } : { action, nom } };
      handler({ target: { closest: () => trigger } });
    },
    // click whose target IS the element (modal backdrop)
    clickTarget: (el) => handler({ target: Object.assign(el, { closest: () => null }) }),
    settingsModal, statsModal,
  };
}

console.log('--- écouteur délégué enregistré ---');
let s = setup();
test('un écouteur click est enregistré', s.hasHandler(), true);

console.log('--- routage data-action -> bonne fonction ---');
s = setup(); s.click('buy-entity', 'Pioche');   test('buy-entity -> buyEntity(nom)', s.calls, ['buyEntity:Pioche']);
s = setup(); s.click('buy-upgrade', 'Double');   test('buy-upgrade -> buyUpgrade(nom)', s.calls, ['buyUpgrade:Double']);
s = setup(); s.click('open-stats');              test('open-stats -> openStatsModal', s.calls, ['openStatsModal']);
s = setup(); s.click('close-stats');             test('close-stats -> closeStatsModal', s.calls, ['closeStatsModal']);
s = setup(); s.click('close-settings');          test('close-settings -> closeSettingsModal', s.calls, ['closeSettingsModal']);
s = setup(); s.click('close-offline');           test('close-offline -> closeOfflineModal', s.calls, ['closeOfflineModal']);
s = setup(); s.click('import');                  test('import -> importProgress', s.calls, ['importProgress']);
s = setup(); s.click('export');                  test('export -> exportProgress', s.calls, ['exportProgress']);
s = setup(); s.click('delete');                  test('delete -> deleteProgress', s.calls, ['deleteProgress']);
s = setup(); s.click('reload');                  test('reload -> location.reload', s.calls, ['reload']);

console.log('--- cas neutres ---');
s = setup(); s.click(null);       test('clic hors data-action : rien', s.calls, []);
s = setup(); s.click('inconnu');  test('action inconnue : rien', s.calls, []);

console.log('--- fermeture au clic sur le fond (backdrop) ---');
s = setup(); s.clickTarget(s.settingsModal); test('fond paramètres -> closeSettingsModal', s.calls, ['closeSettingsModal']);
s = setup(); s.clickTarget(s.statsModal);    test('fond stats -> closeStatsModal', s.calls, ['closeStatsModal']);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
