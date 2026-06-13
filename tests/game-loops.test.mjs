import fs from 'fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// ========== TEST 1 : boucles de jeu ==========
console.log('--- Boucles : séparation logique / affichage / sauvegarde ---');
const loopsCode = src.slice(src.indexOf('// production logic'));

const intervals = [];
const calls = { updateEntities:0, updateShop:0, checkLevelUp:0, checkBlockAchievements:0, updateBlocksDisplay:0, saveProgress:0, updateBonusDisplay:0 };
const mk = name => () => calls[name]++;
const docListeners = {}, winListeners = {};
const documentMock = { addEventListener: (ev, fn) => docListeners[ev] = fn, visibilityState: 'visible' };
const windowMock = { addEventListener: (ev, fn) => winListeners[ev] = fn };
const data = { blocsActuels: 0, blocsDepuisToujours: 0 };

new Function('setInterval','document','window','data','activeBonus','missingAchievements',
  'computeGlobalYieldPerSecond','updateEntities','updateShop','checkLevelUp',
  'checkBlockAchievements','updateBlocksDisplay','saveProgress','updateBonusDisplay',
  loopsCode)(
  (fn, ms) => intervals.push({ fn, ms }),
  documentMock, windowMock, data, null, [1],
  () => 100, mk('updateEntities'), mk('updateShop'), mk('checkLevelUp'),
  mk('checkBlockAchievements'), mk('updateBlocksDisplay'), mk('saveProgress'), mk('updateBonusDisplay')
);

test('4 intervalles enregistrés', intervals.map(i => i.ms), [10, 50, 5000, 1000]);

const logic = intervals.find(i => i.ms === 10).fn;
logic(); logic();
test('tick logique : production ajoutée (2 ticks de 1 bloc)', [data.blocsActuels, data.blocsDepuisToujours], [2, 2]);
test('tick logique : AUCUN appel DOM ni sauvegarde', Object.values(calls).every(v => v === 0), true);

const display = intervals.find(i => i.ms === 50).fn;
display();
test('tick affichage : updates DOM appelés', 
  [calls.updateEntities, calls.updateShop, calls.checkLevelUp, calls.checkBlockAchievements, calls.updateBlocksDisplay],
  [1, 1, 1, 1, 1]);
test('tick affichage : pas de sauvegarde', calls.saveProgress, 0);

intervals.find(i => i.ms === 5000).fn();
test('tick 5s : sauvegarde', calls.saveProgress, 1);

documentMock.visibilityState = 'hidden';
docListeners['visibilitychange']();
test('onglet caché : sauvegarde', calls.saveProgress, 2);
documentMock.visibilityState = 'visible';
docListeners['visibilitychange']();
test('onglet re-visible : pas de sauvegarde superflue', calls.saveProgress, 2);
winListeners['pagehide']();
test('fermeture page : sauvegarde', calls.saveProgress, 3);

// ========== TEST 2 : clavier ==========
console.log('--- Clavier : Enter/Space/Escape ---');
const kStart = src.indexOf('// keyboard accessibility');
const kEnd = src.indexOf('\n});', kStart) + 4;
const kbdCode = src.slice(kStart, kEnd);

let kbdHandler, closeCalls = 0, closeStatsCalls = 0, closeOfflineCalls = 0;
const modals = {
  'parametres-modal': { style: { display: 'none' } },
  'stats-modal': { style: { display: 'none' } },
  'hors-ligne': { style: { display: 'none' } },
};
const docMock2 = {
  addEventListener: (ev, fn) => kbdHandler = fn,
  getElementById: id => modals[id],
};
new Function('document', 'closeSettingsModal', 'closeStatsModal', 'closeOfflineModal', kbdCode)(
  docMock2, () => closeCalls++, () => closeStatsCalls++, () => closeOfflineCalls++);

function fakeEvent(key, isButton) {
  return {
    key,
    prevented: false,
    clicked: 0,
    preventDefault() { this.prevented = true; },
    target: { matches: sel => isButton && sel === '[role="button"]', click() { ev.clicked++; } },
  };
}
let ev;
ev = fakeEvent('Enter', true); ev.target.click = () => ev.clicked++; kbdHandler(ev);
test('Enter sur role=button : clic déclenché + défaut bloqué', [ev.clicked, ev.prevented], [1, true]);
ev = fakeEvent(' ', true); ev.target.click = () => ev.clicked++; kbdHandler(ev);
test('Espace sur role=button : clic déclenché', ev.clicked, 1);
ev = fakeEvent('Enter', false); ev.target.click = () => ev.clicked++; kbdHandler(ev);
test('Enter ailleurs : aucun clic', [ev.clicked, ev.prevented], [0, false]);
ev = fakeEvent('Escape', false); kbdHandler(ev);
test('Escape, tout fermé : aucun close appelé', [closeCalls, closeStatsCalls, closeOfflineCalls], [0, 0, 0]);
modals['parametres-modal'].style.display = 'block';
ev = fakeEvent('Escape', false); kbdHandler(ev);
test('Escape, paramètres ouverte : closeSettingsModal seul', [closeCalls, closeStatsCalls], [1, 0]);
modals['parametres-modal'].style.display = 'none';
modals['stats-modal'].style.display = 'block';
ev = fakeEvent('Escape', false); kbdHandler(ev);
test('Escape, stats ouverte : closeStatsModal appelé', closeStatsCalls, 1);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
