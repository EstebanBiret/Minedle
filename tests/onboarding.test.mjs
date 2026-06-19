// onboarding module: first-time bubble logic (flag + step progression)
const { ONBOARDING_STEPS, hasSeenOnboarding, markOnboardingSeen, initOnboarding } =
  await import(new URL('../modules/onboarding.js', import.meta.url));

let pass = 0, fail = 0;
const test = (name, cond) => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? '✓' : '✗ ÉCHEC'} ${name}`);
};

function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

function makeEl() {
  return {
    textContent: '', hidden: true, style: {}, _l: {},
    addEventListener(t, fn) { this._l[t] = fn; },
    focus() {},
  };
}

function makeDoc(withEls = true) {
  const els = {};
  if (withEls) {
    for (const id of ['onboarding', 'onboarding-text', 'onboarding-step', 'onboarding-next', 'onboarding-skip']) {
      els[id] = makeEl();
    }
  }
  return {
    els, _l: {},
    getElementById: id => els[id] || null,
    addEventListener(t, fn) { this._l[t] = fn; },
    removeEventListener(t) { delete this._l[t]; },
  };
}

console.log('--- constantes ---');
test('ONBOARDING_STEPS non vide', Array.isArray(ONBOARDING_STEPS) && ONBOARDING_STEPS.length >= 1);

console.log('--- flag vu / pas vu ---');
{
  const s = makeStorage();
  test('pas vu au départ', hasSeenOnboarding(s) === false);
  markOnboardingSeen(s);
  test('vu après markOnboardingSeen', hasSeenOnboarding(s) === true);
}

console.log('--- ne montre pas si déjà vu ---');
{
  const s = makeStorage(); markOnboardingSeen(s);
  const doc = makeDoc();
  const shown = initOnboarding({ storage: s, doc, fresh: true });
  test('retourne false', shown === false);
  test('bulle reste cachée', doc.els.onboarding.hidden === true);
}

console.log('--- joueur existant (non fresh) : marqué vu, pas montré ---');
{
  const s = makeStorage();
  const doc = makeDoc();
  const shown = initOnboarding({ storage: s, doc, fresh: false });
  test('retourne false', shown === false);
  test('bulle cachée', doc.els.onboarding.hidden === true);
  test('marqué comme vu (silencieux)', hasSeenOnboarding(s) === true);
}

console.log('--- nouveau joueur frais : montre + progression ---');
{
  const s = makeStorage();
  const doc = makeDoc();
  const shown = initOnboarding({ storage: s, doc, fresh: true });
  test('retourne true', shown === true);
  test('bulle visible', doc.els.onboarding.hidden === false);
  test('texte = étape 1', doc.els['onboarding-text'].textContent === ONBOARDING_STEPS[0]);
  test('compteur = "1 / N"', doc.els['onboarding-step'].textContent === `1 / ${ONBOARDING_STEPS.length}`);

  const next = doc.els['onboarding-next'];
  for (let i = 1; i < ONBOARDING_STEPS.length; i++) {
    next._l.click();
    test(`étape ${i + 1} affichée après "Suivant"`, doc.els['onboarding-text'].textContent === ONBOARDING_STEPS[i]);
  }
  test('dernier bouton = "C\'est parti !"', next.textContent === "C'est parti !");

  next._l.click(); // finish
  test('bulle cachée après la fin', doc.els.onboarding.hidden === true);
  test('marqué comme vu après la fin', hasSeenOnboarding(s) === true);
}

console.log('--- pas de DOM : ne plante pas, retourne false ---');
{
  const s = makeStorage();
  const doc = makeDoc(false);
  test('retourne false sans élément', initOnboarding({ storage: s, doc, fresh: true }) === false);
}

console.log(`\nRésultat : ${pass} OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);
