import fs from 'fs';
const src = fs.readFileSync(new URL('../modules/prestige.js', import.meta.url), 'utf8');
// read the configured threshold so this test survives tuning (no hard-coded block counts)
const PER_STAR = Number(src.match(/BLOCKS_PER_STAR\s*=\s*([\d.eE+]+)/)[1]);
// reconstruct the module with state.js injected (data is mutated between cases;
// setData captures the result so we can assert on the post-ascension state)
const code = src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '')
  + '\nreturn { STARS_BONUS_PER, prestigeMultiplier, starsToGain, nextStarProgress, performAscension };';

const DEFAULT_DATA = {
  blocsActuels: 0, blocsDepuisToujours: 0, blocsMinesAvecClics: 0,
  bpc: 1, coefficientClic: 1, niveau: 0, pommes_or: 0, delai_pommes_or_ms: 300000,
  entites: [{ nom: 'Pioche', quantite: 0, coefficient: 1 }],
  boutique: [{ id: 1 }, { id: 2 }], inventaire: [], succes: [],
};
let captured = null;
const setData = (d) => { captured = d; };
const data = {
  blocsDepuisToujours: 0, etoiles_nether: 0, ascensions: 0,
  succes: [], temps_de_jeu_ms: 0, derniere_visite: 0,
};
const P = new Function('data', 'setData', 'DEFAULT_DATA', code)(data, setData, DEFAULT_DATA);

let pass = 0, fail = 0;
const test = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${name}${ok ? '' : ` (attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)})`}`);
};

console.log('--- multiplicateur permanent (+5 % / étoile gagnée, basé sur le total à vie) ---');
data.etoiles_nether_gagnees = 0;  test('0 étoile -> ×1', P.prestigeMultiplier(), 1);
data.etoiles_nether_gagnees = 10; test('10 étoiles -> ×1,5', P.prestigeMultiplier(), 1.5);
data.etoiles_nether_gagnees = 20; test('20 étoiles -> ×2', P.prestigeMultiplier(), 2);

console.log('--- étoiles gagnées = floor(sqrt(total / seuil)) [relatif au seuil configuré] ---');
data.blocsDepuisToujours = PER_STAR;       test('1× seuil -> 1', P.starsToGain(), 1);
data.blocsDepuisToujours = 4 * PER_STAR;   test('4× seuil -> 2', P.starsToGain(), 2);
data.blocsDepuisToujours = 100 * PER_STAR; test('100× seuil -> 10', P.starsToGain(), 10);
data.blocsDepuisToujours = 0.5 * PER_STAR; test('0,5× seuil -> 0', P.starsToGain(), 0);

console.log('--- progression vers la prochaine étoile [relatif au seuil] ---');
data.blocsDepuisToujours = 0;
test('0 bloc : prochaine = 1ère étoile', P.nextStarProgress().nextStar, 1);
test('0 bloc : restant = 1× seuil', P.nextStarProgress().remaining, PER_STAR);
test('0 bloc : palier suivant = 1× seuil', P.nextStarProgress().bracketTarget, PER_STAR);
test('0 bloc : fraction 0', P.nextStarProgress().fraction, 0);
data.blocsDepuisToujours = PER_STAR / 2;
test('mi-chemin 1ère étoile : fraction 0,5', P.nextStarProgress().fraction, 0.5);
test('mi-chemin : restant = moitié du seuil', P.nextStarProgress().remaining, PER_STAR / 2);
data.blocsDepuisToujours = PER_STAR;
test('au 1er palier : prochaine = 2e étoile', P.nextStarProgress().nextStar, 2);
test('au 1er palier : palier suivant = 4× seuil', P.nextStarProgress().bracketTarget, 4 * PER_STAR);
test('au 1er palier : restant = 3× seuil', P.nextStarProgress().remaining, 3 * PER_STAR);
test('au 1er palier : fraction repart à 0', P.nextStarProgress().fraction, 0);
data.blocsDepuisToujours = 2.5 * PER_STAR;
test('mi-chemin 2e palier : fraction 0,5', P.nextStarProgress().fraction, 0.5);

console.log('--- ascension : remise à zéro + banque les étoiles ---');
data.blocsDepuisToujours = 4 * PER_STAR; // -> 2 étoiles
data.etoiles_nether = 3; data.ascensions = 2;
data.succes = [{ id: 1 }, { id: 2 }]; data.temps_de_jeu_ms = 999; data.blocsActuels = 123456;
captured = null;
const gain = P.performAscension();
test('renvoie le gain (2)', gain, 2);
test('étoiles banquées (3 + 2)', captured.etoiles_nether, 5);
test('compteur d\'ascensions +1', captured.ascensions, 3);
test('blocs remis à zéro', captured.blocsActuels, 0);
test('entités réinitialisées', captured.entites, DEFAULT_DATA.entites);
test('succès conservés', captured.succes, [{ id: 1 }, { id: 2 }]);
test('temps de jeu conservé', captured.temps_de_jeu_ms, 999);

console.log('--- ascension bloquée si < 1 étoile ---');
data.blocsDepuisToujours = 0.5 * PER_STAR; captured = null;
test('renvoie 0', P.performAscension(), 0);
test('aucun setData (pas de reset)', captured, null);

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
