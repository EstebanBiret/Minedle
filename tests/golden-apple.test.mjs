import fs from 'fs';
const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const start = src.indexOf('function spawnGoldenApple');
const end = src.indexOf('function createParticle');
const code = src.slice(start, end);

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

function makeWorld(t0, existingApples = []) {
  const w = { now: t0, raf: [], timeouts: [], existing: existingApples };
  const node = {
    style: {}, isConnected: true, removeCalls: 0, _h: {},
    classList: { add() {} }, setAttribute() {},
    addEventListener(ev, fn) { this._h[ev] = fn; },
    remove() { this.removeCalls++; this.isConnected = false; },
  };
  const documentMock = {
    querySelectorAll: () => w.existing,
    createElement: () => node,
    body: { appendChild() {} },
  };
  const spawn = new Function('document','window','performance','requestAnimationFrame',
    'clearTimeout','setTimeout','appleTimer','data','goldenAppleClick',
    code + '\nreturn spawnGoldenApple;')(
    documentMock, { innerWidth: 1920, innerHeight: 1080 }, { now: () => w.now },
    cb => w.raf.push(cb), () => {}, (fn, ms) => { w.timeouts.push(ms); return 1; },
    null, { delai_pommes_or_ms: 168750 }, () => {});
  w.tick = t => { w.now = t; const cbs = w.raf.splice(0); cbs.forEach(cb => cb(t)); };
  return { w, node, spawn };
}

console.log('--- Garde : jamais deux pommes ---');
const old1 = { removeCalls: 0, remove() { this.removeCalls++; } };
const old2 = { removeCalls: 0, remove() { this.removeCalls++; } };
let { w, node, spawn } = makeWorld(1000, [old1, old2]);
spawn();
test('les pommes existantes sont retirées au nouveau spawn', [old1.removeCalls, old2.removeCalls], [1, 1]);
test('le prochain spawn est replanifié (délai du joueur)', w.timeouts, [168750]);

console.log('--- Vie en temps réel (courbes préservées) ---');
({ w, node, spawn } = makeWorld(1000));
spawn();
w.tick(1000 + 5000);
test('t+5s : fondu d\'entrée, opacité 0.25', node.style.opacity, 0.25);
w.tick(1000 + 30000);
test('t+30s : pleine vie, opacité 1', node.style.opacity, 1);
w.tick(1000 + 45000);
test('t+45s : fondu de sortie, opacité 0.5', node.style.opacity, 0.5);
w.tick(1000 + 56000);
test('t+56s : pomme expirée et retirée', node.removeCalls, 1);
test('plus aucune frame planifiée après expiration', w.raf.length, 0);

console.log('--- Retour d\'onglet après longue absence ---');
({ w, node, spawn } = makeWorld(0));
spawn();
w.tick(200000); // premier tick rAF 200s plus tard (onglet resté masqué)
test('pomme gelée expirée : retirée dès le 1er tick au retour', node.removeCalls, 1);

console.log('--- Pomme cliquée : la boucle s\'arrête ---');
({ w, node, spawn } = makeWorld(0));
spawn();
w.tick(1000);
node.isConnected = false; // simulate click removal
const opacityBefore = node.style.opacity;
w.tick(2000);
test('après clic : aucune mise à jour de style', node.style.opacity, opacityBefore);
test('après clic : boucle rAF stoppée', w.raf.length, 0);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
