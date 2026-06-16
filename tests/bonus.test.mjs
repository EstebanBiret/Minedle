import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/apples.js', import.meta.url), 'utf8');

// isolate the bonus region (consts + instantGainTimer + bonus + showBonus +
// removeBonus + updateBonusDisplay + gainBlocks + activateBonus). state setters
// and the active/end bindings are recreated in the prefix so they actually mutate.
const start = src.indexOf('export const MEGA_CLICK_MULTIPLIER');
const end = src.indexOf('// click on a golden apple');
const region = src.slice(start, end).replace(/^export\s+/gm, '');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function makeBonus() {
  const timers = [];                 // setTimeout callbacks captured (index+1 = id)
  const display = { style: {}, innerText: '' };
  const documentMock = {
    getElementById: () => display,
    createElement: () => ({ style: {}, classList: { add() {} } }),
    body: { appendChild() {} },
  };
  const api = new Function(
    'document', 'formatNumber', 'data', 'timeout', 'updateBlocksDisplay', 'saveProgress', 'setTimeout', 'clearTimeout', 'Date',
    `let activeBonus = null, bonusEndTime = 0;
     function setActiveBonus(v) { activeBonus = v; }
     function setBonusEndTime(v) { bonusEndTime = v; }
     ${region}
     return { activateBonus, removeBonus, getActiveBonus: () => activeBonus, getEnd: () => bonusEndTime };`
  )(
    documentMock,
    x => String(x),
    { blocsActuels: 1000, blocsDepuisToujours: 0 },
    () => {}, () => {}, () => {},
    (fn) => { timers.push(fn); return timers.length; },
    (id) => { if (id) timers[id - 1] = null; },
    { now: () => 1000 }
  );
  return { api, timers, display };
}

console.log('--- instantGain s\'efface seul après son délai ---');
let { api, timers } = makeBonus();
api.activateBonus('instantGain', 0, 0);
test('instantGain actif', api.getActiveBonus(), 'instantGain');
test('un timer d\'auto-suppression est programmé', timers.length, 1);
timers[0] && timers[0]();                       // déclenche l'auto-suppression à +3s
test('après son délai : plus de bonus actif', api.getActiveBonus(), null);

console.log('--- instantGain ne coupe PAS un bonus suivant (#3) ---');
({ api, timers } = makeBonus());
api.activateBonus('instantGain', 0, 0);          // programme removeBonus à +3s -> timers[0]
api.activateBonus('megaClick', 0, 0);            // doit annuler le timer instantGain en attente
test('megaClick est bien actif', api.getActiveBonus(), 'megaClick');
test('le timer instantGain résiduel a été annulé', timers[0], null);
timers.forEach(fn => fn && fn());                // on déclenche tout ce qui resterait
test('megaClick survit (non coupé par l\'ancien timer)', api.getActiveBonus(), 'megaClick');

console.log('--- activer un bonus alors qu\'un autre tourne le remplace proprement ---');
({ api } = makeBonus());
api.activateBonus('megaClick', 0, 0);
api.activateBonus('fullMultiplier', 0, 0);
test('fullMultiplier remplace megaClick', api.getActiveBonus(), 'fullMultiplier');

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
