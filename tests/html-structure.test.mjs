import fs from 'fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

console.log('--- #5 : rien après </body> (HTML valide) ---');
const bodyClose = html.indexOf('</body>');
const htmlClose = html.indexOf('</html>');
test('</body> et </html> présents', bodyClose !== -1 && htmlClose !== -1, true);
test('</body> avant </html>', bodyClose < htmlClose, true);
test('entre </body> et </html> : uniquement du blanc', html.slice(bodyClose + '</body>'.length, htmlClose).trim(), '');

console.log('--- #5 : le script module est bien DANS le body ---');
const scriptPos = html.indexOf('<script type="module"');
test('script module présent', scriptPos !== -1, true);
test('script module avant </body>', scriptPos < bodyClose, true);

console.log('--- #12 : plus d\'id dupliqué x-entite ---');
test('aucun id="x-entite" (le template en générait 10)', html.includes('id="x-entite"'), false);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
