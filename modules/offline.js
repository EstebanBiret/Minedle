// offline production gains: production earned while the game was closed, shown in a modal.
// computeGlobalYieldPerSecond, saveProgress and buyEntitySound live in index.js and are injected.

import { data } from "./state.js?v=3";
import { formatNumber, formatDuration } from "./format.js?v=1";

const OFFLINE_RATE = 0.5;            // fraction of the normal production earned offline
const OFFLINE_CAP_MS = 12 * 3600000; // gains stop accumulating after 12 hours away
const OFFLINE_MIN_MS = 60000;        // ignore absences shorter than a minute

// injected from index.js
let computeGlobalYieldPerSecond, saveProgress, buyEntitySound;

export function initOffline(deps) {
  ({ computeGlobalYieldPerSecond, saveProgress, buyEntitySound } = deps);
}

export function grantOfflineGains() {
  if (typeof data.derniere_visite !== 'number' || data.derniere_visite <= 0) return; // first visit or older save

  const elapsed = Math.min(Date.now() - data.derniere_visite, OFFLINE_CAP_MS);
  if (elapsed < OFFLINE_MIN_MS) return;

  const gain = computeGlobalYieldPerSecond() * (elapsed / 1000) * OFFLINE_RATE;
  if (gain < 1) return;

  data.blocsActuels += gain;
  data.blocsDepuisToujours += gain;
  saveProgress();

  document.getElementById('hors-ligne-duree').innerHTML = formatDuration(elapsed);
  document.getElementById('hors-ligne-gain').innerHTML = `+ ${formatNumber(gain)} blocs`;
  document.getElementById('hors-ligne').style.display = 'flex';
}

export function closeOfflineModal() {
  buyEntitySound.play();
  document.getElementById('hors-ligne').style.display = 'none';
}
