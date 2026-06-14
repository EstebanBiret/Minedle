import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/tooltips.js', import.meta.url), 'utf8');
const start = src.indexOf('export function refreshTooltips');
const code = src.slice(start).replace(/^export\s+/, ''); // run inside new Function

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function makeWorld() {
  const w = { timers: [], cleared: [], nextId: 1 };
  const fields = {};
  for (const id of ['tooltip-title', 'tooltip-content', 'tooltip-content-deux', 'tooltip-rendement-ratio']) fields[id] = { innerHTML: '' };
  const tooltip = {
    classes: new Set(), style: {},
    classList: { add(c) { tooltip.classes.add(c); }, remove(c) { tooltip.classes.delete(c); } },
    getBoundingClientRect: () => ({ width: 100, height: 50 }),
  };
  const el = {
    _h: {}, dataset: { tooltipTitle: 'Pioche en or', tooltipContentDeux: 'Mine plus vite' },
    addEventListener(ev, fn) { this._h[ev] = fn; },
    closest: sel => el,
  };
  const docHandlers = {};
  const documentMock = {
    getElementById: id => id === 'tooltip' ? tooltip : fields[id],
    querySelectorAll: () => [el],
    addEventListener(ev, fn) { docHandlers[ev] = fn; },
    removeEventListener() {},
  };
  const fn = new Function('document', 'window', 'setTimeout', 'clearTimeout',
    code + '\nrefreshTooltips();')(
    documentMock, { innerWidth: 1920, innerHeight: 1080 },
    (cb, ms) => { const id = w.nextId++; w.timers.push({ id, cb, ms }); return id; },
    id => w.cleared.push(id));
  return { w, el, tooltip, fields, docHandlers };
}

console.log('--- Appui long : tooltip + clic bloqué ---');
let { w, el, tooltip, fields } = makeWorld();
el._h['touchstart']({ touches: [{ clientX: 50, clientY: 60 }], target: el });
test('timer de 450ms armé', [w.timers.length, w.timers[0].ms], [1, 450]);
w.timers[0].cb(); // l'appui dure
test('tooltip visible avec le bon contenu', [tooltip.classes.has('visible'), fields['tooltip-title'].innerHTML], [true, 'Pioche en or']);
test('positionné au point de contact (+10px)', [tooltip.style.left, tooltip.style.top], ['60px', '70px']);
let prevented = 0;
el._h['touchend']({ preventDefault: () => prevented++ });
test('clic simulé bloqué (pas d\'achat accidentel)', prevented, 1);

console.log('--- Tap rapide : action normale, pas de tooltip ---');
({ w, el, tooltip } = makeWorld());
el._h['touchstart']({ touches: [{ clientX: 0, clientY: 0 }], target: el });
prevented = 0;
el._h['touchend']({ preventDefault: () => prevented++ }); // relâché avant 450ms
test('timer annulé', w.cleared, [1]);
test('pas de tooltip, clic non bloqué', [tooltip.classes.has('visible'), prevented], [false, 0]);

console.log('--- Glissement (scroll) : annulation ---');
({ w, el, tooltip } = makeWorld());
el._h['touchstart']({ touches: [{ clientX: 0, clientY: 0 }], target: el });
el._h['touchmove']();
test('timer annulé au mouvement', w.cleared, [1]);

console.log('--- Toucher ailleurs : fermeture ---');
let world = makeWorld();
world.el._h['touchstart']({ touches: [{ clientX: 0, clientY: 0 }], target: world.el });
world.w.timers[0].cb();
test('(setup : tooltip ouvert)', world.tooltip.classes.has('visible'), true);
world.docHandlers['touchstart']({ target: { closest: () => null } });
test('fermé au toucher hors zone', world.tooltip.classes.has('visible'), false);

console.log('--- Régression souris ---');
({ el, tooltip, fields } = makeWorld());
el._h['mouseover']({ target: el });
test('mouseover : visible + contenu', [tooltip.classes.has('visible'), fields['tooltip-title'].innerHTML], [true, 'Pioche en or']);
el._h['mouseout']();
test('mouseout : caché', tooltip.classes.has('visible'), false);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
