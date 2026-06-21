// Prestige / Ascension + Nether-star shop.
// Stars are now a spendable currency: each ascension banks stars into a spendable
// balance (etoiles_nether) AND a lifetime counter (etoiles_nether_gagnees). The classic
// +5%/star passive (production + click) is preserved but keyed on the lifetime counter,
// so spending stars in the shop never lowers it — shop upgrades stack on top.
// Pure state logic (no DOM): index.js orchestrates the re-render after a reset.
// New save fields (etoiles_nether_gagnees, ameliorations_nether) are defaulted in
// migrateData (save.js), so state.js — imported almost everywhere — stays untouched.

import { data, setData, DEFAULT_DATA } from "./state.js?v=4";

export const STARS_BONUS_PER = 0.05;   // +5% production & click per Nether star (passive, lifetime)
const BLOCKS_PER_STAR = 2e9;           // base stars = floor(sqrt(run total / 2e9))

// --- Nether-star shop catalogue ---------------------------------------------
// `id` is also the key in data.ameliorations_nether. Next-level cost = ceil(base * growth^level).
export const NETHER_UPGRADES = [
  { id: 'production', nom: 'Cœur du Nether',   desc: '+10 % de production globale par niveau',                            base: 2, growth: 1.6 },
  { id: 'clic',       nom: 'Frappe stellaire', desc: '+50 % à la valeur du clic par niveau',                              base: 2, growth: 1.6 },
  { id: 'avance',     nom: 'Avance du Nether', desc: 'Démarre chaque ascension avec +2 % des blocs de ta run précédente', base: 1, growth: 1.8 },
  { id: 'etoile',     nom: 'Étoile montante',  desc: "+10 % d'étoiles gagnées à chaque ascension",                        base: 3, growth: 2 },
  { id: 'marche',     nom: 'Marché du Nether', desc: '−4 % sur le coût des entités et améliorations (jusqu\'à −48 %)',    base: 3, growth: 1.8, cap: 12 },
];
const UPGRADE_BY_ID = Object.fromEntries(NETHER_UPGRADES.map(u => [u.id, u]));

// current level of an upgrade (0 if never bought / malformed)
export function netherLevel(id) {
  const lv = data.ameliorations_nether && data.ameliorations_nether[id];
  return Number.isInteger(lv) && lv > 0 ? lv : 0;
}

// star cost of the NEXT level of an upgrade (null if capped out or unknown)
export function netherUpgradeCost(id) {
  const def = UPGRADE_BY_ID[id];
  if (!def) return null;
  const level = netherLevel(id);
  if (def.cap && level >= def.cap) return null;
  return Math.ceil(def.base * Math.pow(def.growth, level));
}

// buy one level of an upgrade. returns true on success (enough stars + not capped).
export function buyNetherUpgrade(id) {
  const def = UPGRADE_BY_ID[id];
  if (!def) return false;
  const cost = netherUpgradeCost(id);
  if (cost === null) return false;                      // capped out
  if ((data.etoiles_nether || 0) < cost) return false;  // not enough stars
  data.etoiles_nether -= cost;
  if (!data.ameliorations_nether || typeof data.ameliorations_nether !== 'object') data.ameliorations_nether = {};
  data.ameliorations_nether[id] = netherLevel(id) + 1;
  return true;
}

// --- multipliers ------------------------------------------------------------
// passive +5%/star (production AND click), keyed on LIFETIME stars so spending never lowers it
export function prestigeMultiplier() {
  return 1 + STARS_BONUS_PER * (data.etoiles_nether_gagnees || 0);
}
// production = passive × "Cœur du Nether" (+10%/level)
export function productionMultiplier() {
  return prestigeMultiplier() * (1 + 0.10 * netherLevel('production'));
}
// click = passive × "Frappe stellaire" (+50%/level)
export function clickMultiplier() {
  return prestigeMultiplier() * (1 + 0.50 * netherLevel('clic'));
}
// cost factor from "Marché du Nether" (−4%/level, floored so it can never reach 0)
export function netherDiscount() {
  return Math.max(0.1, 1 - 0.04 * netherLevel('marche'));
}
// blocks to start the next run with, from "Avance du Nether" (% of the run being left)
export function netherHeadStart(runTotal) {
  return Math.floor(0.02 * netherLevel('avance') * (runTotal || 0));
}

// --- stars / ascension ------------------------------------------------------
// base stars (before the star-yield upgrade); also drives the progress-bar brackets
function baseStars() {
  return Math.max(0, Math.floor(Math.sqrt((data.blocsDepuisToujours || 0) / BLOCKS_PER_STAR)));
}

// how many stars an ascension grants right now (base × "Étoile montante", +10%/level)
export function starsToGain() {
  return Math.floor(baseStars() * (1 + 0.10 * netherLevel('etoile')));
}

// progress toward the next (base) star: blocks remaining + fraction (0..1) for the modal bar
export function nextStarProgress() {
  const total = data.blocsDepuisToujours || 0;
  const earned = baseStars();
  const bracketStart = BLOCKS_PER_STAR * earned * earned;
  const bracketTarget = BLOCKS_PER_STAR * (earned + 1) * (earned + 1);
  const span = bracketTarget - bracketStart;
  return {
    nextStar: earned + 1,
    remaining: Math.max(0, bracketTarget - total),
    bracketTarget,
    fraction: span > 0 ? Math.min(1, Math.max(0, (total - bracketStart) / span)) : 0,
  };
}

// reset the run (banking stars into both balances + applying the head start) while keeping
// permanents. returns the number of stars gained (0 = nothing happened).
export function performAscension() {
  const gain = starsToGain();
  if (gain < 1) return 0;

  const headStart = netherHeadStart(data.blocsDepuisToujours);
  const preserved = {
    etoiles_nether: (data.etoiles_nether || 0) + gain,                  // spendable balance
    etoiles_nether_gagnees: (data.etoiles_nether_gagnees || 0) + gain,  // lifetime (drives the passive)
    ameliorations_nether: data.ameliorations_nether || {},              // bought shop upgrades
    ascensions: (data.ascensions || 0) + 1,
    succes: data.succes,                   // achievements are kept across ascensions
    temps_de_jeu_ms: data.temps_de_jeu_ms, // lifetime playtime is kept
    derniere_visite: data.derniere_visite, // keep so offline timing isn't disrupted
  };
  setData({ ...structuredClone(DEFAULT_DATA), ...preserved, blocsActuels: headStart });
  return gain;
}
