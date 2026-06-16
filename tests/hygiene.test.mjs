import fs from 'fs';
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

// #16 : plus aucun innerHTML dans la couche d'affichage (tout converti en textContent)
console.log('--- #16 : zéro innerHTML dans le code source ---');
const sources = ['index.js', 'modules/apples.js', 'modules/tooltips.js', 'modules/achievements.js',
  'modules/offline.js', 'modules/shop.js', 'modules/stats.js'];
const withInner = sources.filter(f => read(f).includes('innerHTML'));
test("aucun fichier source n'utilise innerHTML", withInner, []);

// #15 : idem pour innerText (textContent partout — évite un reflow inutile et reste cohérent)
const withInnerText = sources.filter(f => read(f).includes('innerText'));
test("aucun fichier source n'utilise innerText", withInnerText, []);

// #17 : fins de ligne normalisées en LF (aucun CR)
console.log('--- #17 : fins de ligne LF ---');
for (const f of ['constants/shop.js', 'constants/success.js']) {
  test(`${f} sans CRLF`, read(f).includes('\r'), false);
}

// #13 : le bloc prefers-reduced-motion gèle aussi float / bounce / fade-up
console.log('--- #13 : reduced-motion couvre float/bounce/fade-up ---');
const css = read('style.css');
const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
const block = css.slice(start, css.indexOf('}', start)); // jusqu'à la 1re accolade fermante (= fin de la liste de sélecteurs)
test('cible #bloc-img (float)', block.includes('#bloc-img'), true);
test('cible .bloc-img-entite:hover (bounce)', block.includes('.bloc-img-entite:hover'), true);
test('cible .fade-up', block.includes('.fade-up'), true);

// #7 : plus de handler onclick inline, CSP présente, globals window.* supprimés
console.log('--- #7 : onclick inline supprimés + CSP ---');
const html = read('index.html');
test('aucun onclick inline dans index.html', /\bonclick=/.test(html), false);
const csp = read('index.html');
test('balise CSP présente', csp.includes('http-equiv="Content-Security-Policy"'), true);
test("CSP : script-src 'self'", /script-src[^;]*'self'/.test(csp), true);
const indexJs = read('index.js');
const removedGlobals = ['buyEntity', 'buyUpgrade', 'openStatsModal', 'closeStatsModal', 'closeSettingsModal',
  'closeOfflineModal', 'importProgress', 'exportProgress', 'deleteProgress'];
const leaked = removedGlobals.filter(g => indexJs.includes(`window.${g}`));
test('aucun global window.* d\'action restant', leaked, []);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
