// pure display formatting helpers (no game state, no DOM)

// number notation: 'abrege' (2,5 millions) or 'scientifique' (2,5e6). set from the settings.
let notationMode = 'abrege';
export function setNotationMode(mode) {
  notationMode = mode === 'scientifique' ? 'scientifique' : 'abrege';
}
export function getNotationMode() {
  return notationMode;
}

// formats a number for display: spaces between thousands, comma decimals,
// abbreviated from one million ("2,5 millions") — or scientific if the mode is set
export function formatNumber(n) {
  n = Number(n);

  if (!Number.isFinite(n)) return "∞"; // Infinity / NaN at the extreme top end

  if (n < 1_000_000) {
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[\u202F\u00A0]/g, " ");
  }

  const suffixes = ["", "millions", "milliards", "billions", "billiards", "trillions", "trilliards", "quadrillions", "quadrilliards"]; // numbers up to 30 digits max

  // scientific mode: e-notation from one million. abbreviated mode: switch to scientific only past
  // the largest suffix (quadrilliards, ~1e27) so the display stays compact (e.g. "1,23e30").
  // NB: integer precision is already lost above 2^53 (Number limit); this only fixes the display.
  if (notationMode === 'scientifique' || n >= 1e30) {
    const [mantissa, exponent] = n.toExponential(2).split("e");
    return `${parseFloat(mantissa).toString().replace(".", ",")}e${parseInt(exponent, 10)}`;
  }

  let index = -1;

  while (n >= 1_000 && index < suffixes.length - 1) {
    n /= 1_000;
    index++;
  }

  let valeur = n.toFixed(2);

  // rounding can carry over to the next unit (999 999 999.99 -> "1 milliard", not "1000 millions")
  if (parseFloat(valeur) >= 1_000 && index < suffixes.length - 1) {
    valeur = (parseFloat(valeur) / 1_000).toFixed(2);
    index++;
  }

  valeur = valeur.replace(/\.?0+$/, "").replace(".", ",");

  // french plural starts at 2 ("1,5 million" but "2 millions")
  let suffixe = suffixes[index];
  if (parseFloat(valeur.replace(",", ".")) < 2) suffixe = suffixe.slice(0, -1);

  return valeur + " " + suffixe;
}

// formats a millisecond duration as "3 h 07" or "45 min"
export function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}
