// Prestige / Ascension. Converting a run into Nether stars grants a permanent
// production+click multiplier (+5% per star) that survives every reset.
// Pure state logic (no DOM): index.js orchestrates the re-render after a reset.
// The two new save fields (etoiles_nether, ascensions) are defaulted in
// migrateData (save.js), so state.js — imported almost everywhere — stays untouched.

import { data, setData, DEFAULT_DATA } from "./state.js?v=4";

export const STARS_BONUS_PER = 0.05;   // +5% production & click per Nether star
const BLOCKS_PER_STAR = 2e9;          // stars earned = floor(sqrt(run total / 2e9)) 2 milliards !!!

// permanent multiplier applied to production and click gains
export function prestigeMultiplier() {
  return 1 + STARS_BONUS_PER * (data.etoiles_nether || 0);
}

// how many stars the current run would yield if ascended right now
export function starsToGain() {
  return Math.max(0, Math.floor(Math.sqrt((data.blocsDepuisToujours || 0) / BLOCKS_PER_STAR)));
}

// progress toward the next star: how many blocks remain for the (earned+1)-th star and
// the fraction (0..1) filled within the current "bracket", so the modal can draw a bar.
export function nextStarProgress() {
  const total = data.blocsDepuisToujours || 0;
  const earned = starsToGain();                                        // stars an ascension grants now
  const bracketStart = BLOCKS_PER_STAR * earned * earned;              // blocks needed for the earned-th star
  const bracketTarget = BLOCKS_PER_STAR * (earned + 1) * (earned + 1); // blocks needed for the next star
  const span = bracketTarget - bracketStart;
  return {
    nextStar: earned + 1,
    remaining: Math.max(0, bracketTarget - total),
    bracketTarget,
    fraction: span > 0 ? Math.min(1, Math.max(0, (total - bracketStart) / span)) : 0,
  };
}

// reset the run (keeping stars, ascension count, achievements and total playtime)
// and bank the earned stars. returns the number of stars gained (0 = nothing happened).
export function performAscension() {
  const gain = starsToGain();
  if (gain < 1) return 0;

  const preserved = {
    etoiles_nether: (data.etoiles_nether || 0) + gain,
    ascensions: (data.ascensions || 0) + 1,
    succes: data.succes,                   // achievements are kept across ascensions
    temps_de_jeu_ms: data.temps_de_jeu_ms, // lifetime playtime is kept
    derniere_visite: data.derniere_visite, // keep so offline timing isn't disrupted
  };
  setData({ ...structuredClone(DEFAULT_DATA), ...preserved });
  return gain;
}
