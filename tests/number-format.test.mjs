// formatNumber now lives in its own module: import it directly
const { formatNumber } = await import(new URL('../modules/format.js', import.meta.url));

let pass = 0, fail = 0;
const test = (input, expected) => {
  const actual = formatNumber(input);
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${String(input).padEnd(14)} -> "${actual}"${ok ? '' : ` (attendu "${expected}")`}`);
};

console.log('--- Petits nombres ---');
test(0, '0');
test(7, '7');
test(0.78, '0,78');
test(853.4567, '853,46');

console.log('--- Le cas de ta capture (1k -> 1M) ---');
test(57349.05, '57 349,05');
test(1234, '1 234');
test(30000, '30 000');
test(999999, '999 999');
test('57349.05', '57 349,05');   // robustesse : entrée chaîne (ancien pipeline)

console.log('--- Abréviations ---');
test(1_000_000, '1 million');
test(1_500_000, '1,5 million');
test(2_500_000, '2,5 millions');
test(999_995_000, '1 milliard');  // arrondi qui bascule d'unité
test(1_000_000_000, '1 milliard');
test(3_140_000_000, '3,14 milliards');
test(7e12, '7 billions');

console.log('--- #19 : très grands nombres (notation scientifique au-delà des quadrilliards) ---');
test(2e27, '2 quadrilliards');      // dernier palier nommé
test(9.99e29, '999 quadrilliards'); // juste sous la bascule
test(1e30, '1e30');                 // bascule en notation scientifique
test(1.23e33, '1,23e33');
test(5e45, '5e45');
test(Infinity, '∞');                // garde valeur non finie
test(NaN, '∞');

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
