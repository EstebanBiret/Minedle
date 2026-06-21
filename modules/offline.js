// offline production gains: production earned while the game was closed, shown in a modal.
// computeGlobalYieldPerSecond, saveProgress and clickSound live in index.js and are injected.

import { data } from "./state.js?v=4";
import { formatNumber, formatDuration } from "./format.js?v=3";
import { trapFocus, releaseFocus } from "./focus-trap.js?v=1";
import { productionMultiplier } from "./prestige.js?v=3";

const OFFLINE_RATE = 0.5;            // fraction of the normal production earned offline
const OFFLINE_CAP_MS = 12 * 3600000; // gains stop accumulating after 12 hours away
const OFFLINE_MIN_MS = 60000;        // ignore absences shorter than a minute

// injected from index.js
let computeGlobalYieldPerSecond, saveProgress, clickSound;

export function initOffline(deps) {
  ({ computeGlobalYieldPerSecond, saveProgress, clickSound } = deps);
}

export function grantOfflineGains() {
  if (typeof data.derniere_visite !== 'number' || data.derniere_visite <= 0) return; // first visit or older save

  const elapsed = Math.min(Date.now() - data.derniere_visite, OFFLINE_CAP_MS);
  if (elapsed < OFFLINE_MIN_MS) return;

  const gain = computeGlobalYieldPerSecond() * productionMultiplier() * (elapsed / 1000) * OFFLINE_RATE;
  if (gain < 1) return;

  data.blocsActuels += gain;
  data.blocsDepuisToujours += gain;
  saveProgress();

  document.getElementById('hors-ligne-duree').textContent = formatDuration(elapsed);
  document.getElementById('hors-ligne-gain').textContent = `+ ${formatNumber(gain)} blocs`;
  document.getElementById('hors-ligne').style.display = 'flex';
  trapFocus(document.getElementById('hors-ligne')); // focus the "Continuer" button + confine Tab
}

export function closeOfflineModal() {
  clickSound.play();
  document.getElementById('hors-ligne').style.display = 'none';
  releaseFocus(document.getElementById('hors-ligne')); // remove the trap + restore focus
}
