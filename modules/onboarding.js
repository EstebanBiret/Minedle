// first-time onboarding: a short, dismissible bubble that guides brand-new
// players through the basics. shown only on a truly fresh start (no progress
// yet) and only once — a flag in localStorage prevents it from reappearing.

const SEEN_KEY = 'minedle-onboarding-vu';

export const ONBOARDING_STEPS = [
  "👋 Bienvenue dans Minedle ! Clique le gros bloc au centre pour miner des blocs.",
  "⛏️ Achète une entité dans la liste (Pioche, Villageois…) : elle minera pour toi, même quand tu ne cliques pas.",
  "💎 Reviens quand tu veux : tes entités produisent aussi hors-ligne, et les pommes d'or donnent de gros bonus. Bonne mine !",
];

export function hasSeenOnboarding(storage) {
  try { return !!storage.getItem(SEEN_KEY); } catch { return true; }
}

export function markOnboardingSeen(storage) {
  try { storage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable: ignore */ }
}

let stepIndex = 0;
let ctx = null;

// returns true if the bubble was shown, false otherwise (already seen / not fresh / no DOM)
export function initOnboarding({ storage = localStorage, doc = document, fresh = true } = {}) {
  if (hasSeenOnboarding(storage)) return false;
  // a returning player (already has progress) shouldn't get the intro: mark it seen silently
  if (!fresh) { markOnboardingSeen(storage); return false; }

  const box = doc.getElementById('onboarding');
  if (!box) return false;

  ctx = {
    storage, doc, box,
    text: doc.getElementById('onboarding-text'),
    step: doc.getElementById('onboarding-step'),
    next: doc.getElementById('onboarding-next'),
    skip: doc.getElementById('onboarding-skip'),
  };

  stepIndex = 0;
  renderStep();
  box.hidden = false;

  ctx.next.addEventListener('click', advanceStep);
  ctx.skip.addEventListener('click', finishOnboarding);
  doc.addEventListener('keydown', onKey);
  ctx.next.focus?.();
  return true;
}

function renderStep() {
  const last = stepIndex === ONBOARDING_STEPS.length - 1;
  ctx.text.textContent = ONBOARDING_STEPS[stepIndex];
  ctx.step.textContent = `${stepIndex + 1} / ${ONBOARDING_STEPS.length}`;
  ctx.next.textContent = last ? "C'est parti !" : 'Suivant';
  ctx.skip.style.visibility = last ? 'hidden' : 'visible';
}

function advanceStep() {
  if (stepIndex < ONBOARDING_STEPS.length - 1) { stepIndex++; renderStep(); }
  else finishOnboarding();
}

function finishOnboarding() {
  if (!ctx) return;
  ctx.box.hidden = true;
  markOnboardingSeen(ctx.storage);
  ctx.doc.removeEventListener('keydown', onKey);
  ctx = null;
}

function onKey(e) {
  if (e.key === 'Escape') finishOnboarding();
  else if (e.key === 'Enter') advanceStep();
}
