// statistics modal. index.js helpers (clickSound, computeGlobalYieldPerSecond)
// are injected via initStats(); everything else is imported one-directionally.

import { data } from "./state.js?v=4";
import { formatNumber, formatDuration } from "./format.js?v=3";
import { shop } from "../constants/shop.js?v=2";
import { TOTAL_ACHIEVEMENTS } from "./achievements.js?v=9";
import { trapFocus, releaseFocus } from "./focus-trap.js?v=1";
import { productionMultiplier, prestigeMultiplier } from "./prestige.js?v=3";

// injected from index.js
let clickSound, computeGlobalYieldPerSecond;

export function initStats(deps) {
  ({ clickSound, computeGlobalYieldPerSecond } = deps);
}

export function openStatsModal() {
  clickSound.play();

  const totalEntities = data.entites.reduce((sum, e) => sum + e.quantite, 0);
  // adaptive precision: a real but small manual share must not display as "0 %"
  const share = data.blocsDepuisToujours > 0 ? (100 * data.blocsMinesAvecClics / data.blocsDepuisToujours) : 0;
  const shareText = share >= 10 ? String(Math.round(share)) : share >= 0.1 ? share.toFixed(1).replace('.', ',') : share > 0 ? '< 0,1' : '0';

  document.getElementById('stat-blocs-total').textContent = formatNumber(data.blocsDepuisToujours);
  document.getElementById('stat-blocs-clics').textContent = `${formatNumber(data.blocsMinesAvecClics)} (${shareText} %)`;
  document.getElementById('stat-bps').textContent = `${formatNumber(computeGlobalYieldPerSecond() * productionMultiplier())} / s`;
  document.getElementById('stat-pommes').textContent = formatNumber(data.pommes_or);
  document.getElementById('stat-temps').textContent = formatDuration(data.temps_de_jeu_ms || 0);
  document.getElementById('stat-entites').textContent = formatNumber(totalEntities);
  document.getElementById('stat-ameliorations').textContent = `${data.inventaire.length} / ${shop.length}`;
  document.getElementById('stat-succes').textContent = `${data.succes.length} / ${TOTAL_ACHIEVEMENTS}`;
  document.getElementById('stat-etoiles').textContent = formatNumber(data.etoiles_nether || 0);
  document.getElementById('stat-ascensions').textContent = formatNumber(data.ascensions || 0);
  document.getElementById('stat-prestige-bonus').textContent = `+${Math.round((prestigeMultiplier() - 1) * 100)} %`;

  document.getElementById('stats-modal').style.display = 'block';
  trapFocus(document.getElementById('stats-modal')); // focus into the modal + confine Tab
}

export function closeStatsModal() {
  clickSound.play();
  document.getElementById('stats-modal').style.display = 'none';
  releaseFocus(document.getElementById('stats-modal')); // remove the trap + restore focus to the trigger
}
