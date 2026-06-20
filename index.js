import { initShop, buyUpgrade, updateShop, buyEntity, updateEntities, updateInventory, clearInventory, updatePickaxeEntityImage } from "./modules/shop.js?v=11";
import { initStats, openStatsModal, closeStatsModal } from "./modules/stats.js?v=7";
import { refreshTooltips } from "./modules/tooltips.js?v=4";
import { initOffline, grantOfflineGains, closeOfflineModal } from "./modules/offline.js?v=7";
import { initSettings, openSettingsModal, closeSettingsModal } from "./modules/settings.js?v=2";
import { trapFocus, releaseFocus } from "./modules/focus-trap.js?v=1";
import { prestigeMultiplier, starsToGain, performAscension, nextStarProgress } from "./modules/prestige.js?v=2";
import { formatNumber, setNotationMode } from "./modules/format.js?v=3";
import { DEFAULT_DATA, data, setData, activeBonus, safeSetItem, readStorageJSON } from "./modules/state.js?v=4";
import { initApples, restartAppleTimer, updateBonusDisplay, MEGA_CLICK_MULTIPLIER, FULL_MULTIPLIER } from "./modules/apples.js?v=11";
import { fnv1aHash, isValidSaveData, isValidGameData, migrateData, SAVE_FILE_APP, SAVE_FILE_VERSION } from "./modules/save.js?v=6";
import { initAchievements, clearAchievements, checkGoldenAppleAchievements, checkClickAchievements, checkBlockAchievements, checkPrestigeAchievements, updateAchievements, unlockAchievement } from "./modules/achievements.js?v=9";
import { initLevels, checkLevelUp, updateLevel } from "./modules/levels.js?v=3";
import { bgMusic } from "./modules/music.js?v=2";
import "./modules/background.js?v=1";
import "./modules/grids.js?v=2"; // builds the inventory + achievement grid cells from the catalogue
import { initOnboarding } from "./modules/onboarding.js?v=1";



console.log('Bienvenue jeune explorateur !');

// remove divs after a delay (click animations)
const timeout = (div) => {
  setTimeout(() => {
    div.remove()
  }, 400)
}

// sounds. wrap each so a rejected play() (rapid replay, not-yet-loaded audio,
// autoplay restrictions) never leaves an unhandled promise rejection.
// SFX volume is one shared preference (separate from the music), applied to every sound below.
const SFX_STORAGE_KEY = 'minedle-sfx';
let sfxPrefs = readStorageJSON(SFX_STORAGE_KEY, null);
if (!sfxPrefs || typeof sfxPrefs.muted !== 'boolean' || typeof sfxPrefs.volume !== 'number' || !(sfxPrefs.volume >= 0 && sfxPrefs.volume <= 1)) {
  sfxPrefs = { muted: false, volume: 0.5 };
}
const sfxSounds = []; // { audio, base } registry, so the settings slider can retune them all at once

function makeSound(src, volume = 0.5, { restart = false, vary = false } = {}) {
  const audio = new Audio(src);
  const entry = { audio, base: volume };
  sfxSounds.push(entry);
  audio.volume = sfxPrefs.muted ? 0 : sfxPrefs.volume * volume;
  return { play: () => {
    if (restart) audio.currentTime = 0;                          // restart so rapid clicks each trigger
    if (vary) audio.playbackRate = 0.92 + Math.random() * 0.16;  // slight pitch variation
    return audio.play().catch(() => {});
  } };
}
const clickSound = makeSound('./assets/audio/click.mp3');
const buyUpgradeSound = makeSound('./assets/audio/shop.mp3');
const mineSound = makeSound('./assets/audio/mine.mp3', 0.35, { restart: true, vary: true });

// SFX settings control: mute toggle + volume slider, in the Paramètres modal
const sfxSlider = document.getElementById('sfx-slider');
const sfxToggle = document.getElementById('sfx-toggle');
const sfxIconOn = document.getElementById('sfx-icon-on');
const sfxIconOff = document.getElementById('sfx-icon-off');

// apply the prefs to every registered sound + the toggle UI, then persist
function applySfxState() {
  for (const entry of sfxSounds) {
    entry.audio.volume = sfxPrefs.muted ? 0 : sfxPrefs.volume * entry.base;
  }
  const audible = !sfxPrefs.muted && sfxPrefs.volume > 0;
  if (sfxSlider) sfxSlider.value = Math.round(sfxPrefs.volume * 100);
  if (sfxIconOn) sfxIconOn.style.display = audible ? '' : 'none';
  if (sfxIconOff) sfxIconOff.style.display = audible ? 'none' : '';
  safeSetItem(SFX_STORAGE_KEY, JSON.stringify(sfxPrefs));
}

if (sfxToggle) {
  sfxToggle.addEventListener('click', () => {
    sfxPrefs.muted = !sfxPrefs.muted;
    if (!sfxPrefs.muted && sfxPrefs.volume === 0) sfxPrefs.volume = 0.5; // unmuting at 0 would stay silent
    applySfxState();
    if (!sfxPrefs.muted) clickSound.play(); // confirm the new state is audible
  });
}
if (sfxSlider) {
  sfxSlider.addEventListener('input', () => {
    sfxPrefs.volume = sfxSlider.value / 100;
    sfxPrefs.muted = false;            // moving the slider means the player wants to hear something
    applySfxState();
  });
  sfxSlider.addEventListener('change', () => clickSound.play()); // preview once the drag ends
}
applySfxState();

// number notation ('abrege' | 'scientifique'): restored from the settings, applied before the first render
const NOTATION_STORAGE_KEY = 'minedle-notation';
let notationPref = readStorageJSON(NOTATION_STORAGE_KEY, null);
notationPref = notationPref === 'scientifique' ? 'scientifique' : 'abrege';
setNotationMode(notationPref);

// segmented Abrégé / Scientifique toggle in the Paramètres modal
function applyNotationUI() {
  for (const btn of document.querySelectorAll('.notation-option')) {
    const active = btn.dataset.notation === notationPref;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  }
}
function setNotation(mode) {
  notationPref = mode === 'scientifique' ? 'scientifique' : 'abrege';
  setNotationMode(notationPref);
  safeSetItem(NOTATION_STORAGE_KEY, JSON.stringify(notationPref));
  applyNotationUI();
  // re-render every on-screen number in the new notation
  updateBlocksDisplay();
  updateEntities();
  updateShop();
  updateInventory();
  updateBonusDisplay();
  clickSound.play();
}
for (const btn of document.querySelectorAll('.notation-option')) {
  btn.addEventListener('click', () => setNotation(btn.dataset.notation));
}
applyNotationUI();

// single-tab flag (see the BroadcastChannel block further down)
let tabActive = true;
let lastPlaytimeTick = Date.now(); // session start, used to accumulate playtime

// single tab at a time: the most recently opened tab wins, older ones freeze
// (two live tabs would silently overwrite each other's saves)
if ('BroadcastChannel' in window) {
  const tabChannel = new BroadcastChannel('minedle-tab');
  tabChannel.postMessage('claim');

  tabChannel.addEventListener('message', (event) => {
    if (event.data !== 'claim' || !tabActive) return;
    tabActive = false;
    bgMusic.pause();
    document.getElementById('autre-onglet').style.display = 'flex';
    trapFocus(document.getElementById('autre-onglet')); // confine focus to the reload button
  });
}


// mined blocks and per-second info
let currentBlocksText = document.getElementById("blocs-actuels");
let blocksPerSecondText = document.getElementById("bps-label");
let blocksPerClickText = document.getElementById("bpc-label");
let ascensionButtonGain = document.getElementById("ascension-button-gain");
let ascensionButtonCount = document.getElementById("ascension-button-count");

let blockImgContainer = document.getElementById('bloc-img-container')
let blockImg = document.getElementById('bloc-img')

blockImg.addEventListener('click', mineBlock);

// reconcile the loaded save with the current catalogue (added/removed entities,
// upgrades, achievements) BEFORE validating, so a content update never freezes
// or wipes existing progress.
setData(migrateData(data));
// a corrupted or tampered localStorage entry must never reach the game loops:
// validate the loaded save with the same rules as an imported file, else reset
// to a fresh (cloned) default state.
if (!isValidGameData(data)) setData(structuredClone(DEFAULT_DATA));

// first save: persist the fresh state so a brand-new game survives a reload
if (!localStorage.getItem('minedle-data')) safeSetItem('minedle-data', JSON.stringify(data));


// the sacred call

// wire the offline-gains and settings modules with the index.js helpers they need
initOffline({ computeGlobalYieldPerSecond, saveProgress, clickSound });
initSettings({ clickSound });

// wire the stats modal with the index.js helpers it needs
initStats({ clickSound, computeGlobalYieldPerSecond });

// wire the shop/entities/inventory module with the index.js helpers it needs
initShop({ saveProgress, updateBlocksDisplay, refreshTooltips, computeGlobalYieldPerSecond, buyUpgradeSound, clickSound, restartAppleTimer });

// wire the level system with the index.js saveProgress helper
initLevels({ saveProgress });

// wire the achievements module with the index.js helpers it needs
initAchievements({ refreshTooltips, computeGlobalYieldPerSecond });

// give apples.js the index.js helpers it needs (replaces the old circular import)
initApples({ timeout, updateBlocksDisplay, saveProgress, checkGoldenAppleAchievements });

// bootstrap once every module is ready, preserving init() -> offline gains order
queueMicrotask(() => {
  init();
  grantOfflineGains();
  initOnboarding({ fresh: (data.blocsDepuisToujours || 0) === 0 }); // first-time bubble, only on a fresh start
});

// stats modal
function init() {
  restartAppleTimer();
  updateBlocksDisplay();
  updateLevel();
  updateEntities();
  updateShop();
  updateInventory();
  updateAchievements();
  updatePickaxeEntityImage();
}

// update game data in localStorage (via safeSetItem, which never throws).
// one-shot guard for the "storage full" notice: saveProgress runs every ~5s and
// on every click, so we warn the player at most once per session (no alert spam).
let saveErrorNotified = false;
function saveProgress() {
  if (!tabActive) return; // frozen tab: never overwrite the active tab's save
  const nowTs = Date.now();
  data.temps_de_jeu_ms = (data.temps_de_jeu_ms || 0) + (nowTs - lastPlaytimeTick); 
  lastPlaytimeTick = nowTs;
  data.derniere_visite = nowTs;
  // safeSetItem returns false on quota/unavailable storage; the in-memory state
  // stays valid so the game keeps running — we just warn the player once.
  if (!safeSetItem('minedle-data', JSON.stringify(data)) && !saveErrorNotified) {
    saveErrorNotified = true;
    alert("Impossible de sauvegarder ta progression : l'espace de stockage du navigateur est plein ou indisponible. Pense à exporter ta sauvegarde depuis les paramètres pour ne rien perdre.");
  }
}

// clicks can fire very fast (held key, autoclicker), and each saveProgress() is a
// synchronous full-state localStorage write. this coalesces click-driven saves to
// at most one per second: the first call writes immediately, calls within the
// window are folded into a single trailing write. all other save paths (purchases,
// level-ups, the 5 s interval, tab hide/close) keep calling saveProgress() directly.
let clickSaveTimer = null;
let clickSavePending = false;
function saveProgressThrottled() {
  if (clickSaveTimer) { clickSavePending = true; return; }
  saveProgress();
  clickSaveTimer = setTimeout(() => {
    clickSaveTimer = null;
    if (clickSavePending) { clickSavePending = false; saveProgressThrottled(); }
  }, 1000);
}

// remember the last applied highlight state so the ~20x/s display loop only
// rewrites the bonus styling when it actually changes, not on every tick.
let lastBpsBoosted = null;
let lastBpcBoosted = null;
let lastAscensionGain = null;

function setBoostStyle(el, boosted) {
  el.style.color = boosted ? "#6f6" : "";
  el.style.textShadow = boosted ? "0px 1px 4px black" : "none";
  el.style.fontWeight = boosted ? "bold" : "normal";
}

// update mined blocks display and per-second info
function updateBlocksDisplay() {
  let bps = computeGlobalYieldPerSecond() * prestigeMultiplier();
  let bpc = data.bpc * data.coefficientClic * prestigeMultiplier();

  // BPS is boosted only by FullMultiplier
  const bpsBoosted = activeBonus === "fullMultiplier";
  if (bpsBoosted) bps *= FULL_MULTIPLIER;
  if (bpsBoosted !== lastBpsBoosted) {
    lastBpsBoosted = bpsBoosted;
    setBoostStyle(blocksPerSecondText, bpsBoosted);
  }

  // BPC is boosted by MegaClick or FullMultiplier
  const bpcBoosted = activeBonus === "megaClick" || activeBonus === "fullMultiplier";
  if (activeBonus === "megaClick") bpc *= MEGA_CLICK_MULTIPLIER;
  else if (activeBonus === "fullMultiplier") bpc *= FULL_MULTIPLIER;
  if (bpcBoosted !== lastBpcBoosted) {
    lastBpcBoosted = bpcBoosted;
    setBoostStyle(blocksPerClickText, bpcBoosted);
  }

  // values change continuously, so these always update
  currentBlocksText.textContent = formatNumber(data.blocsActuels);
  blocksPerSecondText.textContent = 'par seconde : ' + formatNumber(bps);
  blocksPerClickText.textContent = 'par clic : ' + formatNumber(bpc);

  // ascension button: how many Nether stars an ascension would grant right now
  // (red at 0, green otherwise). only touch the DOM when the count actually changes.
  const ascGain = starsToGain();
  if (ascGain !== lastAscensionGain) {
    lastAscensionGain = ascGain;
    ascensionButtonCount.textContent = formatNumber(ascGain);
    ascensionButtonGain.classList.toggle('zero', ascGain < 1);
  }
}

// sum the per-second yield across all owned entities
function computeGlobalYieldPerSecond() {
  let bps = 0;
  data.entites.forEach(e => {
    bps += e.rendement_actuel * e.quantite * e.coefficient;
  });
  return parseFloat(bps.toFixed(2));
}

// click on the block
function mineBlock(event) {
  mineSound.play();
  // tactile "pop" on the block, retriggered on each click (auto-disabled under reduced-motion)
  blockImg.classList.remove('mining');
  void blockImg.offsetWidth; // force reflow so the animation restarts every click
  blockImg.classList.add('mining');

  // click animation (keyboard activation has no coordinates: use the block center)
  const fromKeyboard = event.detail === 0;
  const x = fromKeyboard ? blockImg.clientWidth / 2 : event.offsetX;
  const y = fromKeyboard ? blockImg.clientHeight / 2 : event.offsetY;
  const div = document.createElement('div')

  // check whether a bonus is active
  let multiplicateur = 1;
  if (activeBonus === "megaClick") {
      multiplicateur = MEGA_CLICK_MULTIPLIER;
  } else if (activeBonus === "fullMultiplier") {
      multiplicateur = FULL_MULTIPLIER;
  }

  const enBonus = multiplicateur > 1;
  div.textContent = `+${formatNumber(data.bpc * data.coefficientClic * prestigeMultiplier() * multiplicateur)}`
  const jitter = (Math.random() - 0.5) * 24; // spread overlapping rapid clicks
  div.style.cssText = `
  color: ${enBonus ? '#ffce5a' : '#fff'};
  position: absolute;
  top: ${y}px;
  left: ${x + jitter}px;
  font-size: ${enBonus ? '26px' : '20px'};
  font-weight: bold;
  text-shadow: 0.2vh 0.2vh #000a;
  pointer-events: none;
  white-space: nowrap;`;
  blockImgContainer.appendChild(div)
  div.classList.add('fade-up')
  timeout(div)

  // if a click-multiplier bonus is active
  const baseGain = data.bpc * data.coefficientClic * prestigeMultiplier();

  // compute total gain
  let totalGain = baseGain * multiplicateur;

  data.blocsDepuisToujours += totalGain;
  data.blocsActuels += totalGain;
  data.blocsMinesAvecClics += totalGain;

  checkLevelUp();
  checkClickAchievements();
  // entity/shop cost & affordability are refreshed by the 50 ms display loop;
  // on click we only need the immediate block-count feedback.
  updateBlocksDisplay();
  saveProgressThrottled(); // coalesced so rapid clicking won't hammer localStorage
}

// tooltips
document.addEventListener("DOMContentLoaded", () => {
  refreshTooltips();
});

document.getElementById('surtom').addEventListener('click', () => {
  unlockAchievement(28);
  window.open('https://surtom.yvelin.net/', '_blank');  
});

document.getElementById('cookie').addEventListener('click', () => {
  window.open('https://orteil.dashnet.org/cookieclicker/', '_blank');  
});

/* SAVE FILES (export / import) */

function exportProgress() {
  saveProgress(); // make sure localStorage matches the in-memory state

  const payload = { data };
  const checksum = fnv1aHash(JSON.stringify(payload));

  const fileContent = {
    app: SAVE_FILE_APP,
    version: SAVE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    checksum,
    payload,
  };

  const blob = new Blob([JSON.stringify(fileContent, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `minedle-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  closeSettingsModal();
}

// replace the current progress with an imported one (already validated)
function applyImportedData(importedData) {
  setData(migrateData(importedData)); // reconcile with the current catalogue (new/removed content)
  saveProgress();
  clearInventory();
  clearAchievements();
  init();
  closeSettingsModal();
  alert("Progression importée avec succès !");
}

async function importProgress() {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async function (event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = async function () {
      let fileContent;
      try {
        fileContent = JSON.parse(reader.result);
      } catch {
        alert("Fichier illisible : rien n'a été importé.");
        return;
      }

      if (!isValidSaveData(fileContent)) {
        alert("Fichier invalide ou corrompu : rien n'a été importé.");
        return;
      }

      if (!confirm("Importer cette sauvegarde remplacera ta progression actuelle. Continuer ?")) return;

      applyImportedData(fileContent.payload.data);
    };
    reader.readAsText(file);
  };
  input.click();
}

function deleteProgress(){
  if (!confirm("Supprimer définitivement ta progression ? Cette action est irréversible.")) return;

  clearInventory();
  clearAchievements();
  closeSettingsModal();

  document.getElementById('Pioche-entite').querySelector('img').src = 'assets/entities/wooden-pickaxe.webp';

  localStorage.removeItem('minedle-data');
  setData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  saveProgress();
  init();
}

function openAscensionModal() {
  clickSound.play();
  const stars = data.etoiles_nether || 0;
  const gain = starsToGain();
  document.getElementById('ascension-etoiles').textContent = formatNumber(stars);
  document.getElementById('ascension-bonus').textContent = `+${Math.round((prestigeMultiplier() - 1) * 100)} %`;
  document.getElementById('ascension-gain').textContent = formatNumber(gain);

  // the "owned" + "bonus" rows are only meaningful once you've ascended at least once
  const ascended = (data.ascensions || 0) >= 1;
  document.getElementById('ascension-row-etoiles').style.display = ascended ? '' : 'none';
  document.getElementById('ascension-row-bonus').style.display = ascended ? '' : 'none';

  // progress toward the next star: a filled bar + the blocks still needed, so the player
  // can see exactly how far the 1st / 2nd / ... star is
  const np = nextStarProgress();
  const pct = Math.floor(np.fraction * 100);
  document.getElementById('ascension-progress-fill').style.width = `${np.fraction * 100}%`;
  document.getElementById('ascension-progress-pct').textContent = `${pct} %`;
  document.getElementById('ascension-next-caption').textContent =
    `Encore ${formatNumber(np.remaining)} blocs (palier : ${formatNumber(np.bracketTarget)})`;
  document.getElementById('ascension-progress').setAttribute('aria-valuenow', String(pct));

  // only offer the button when at least one star would be earned
  document.getElementById('ascension-confirm').style.display = gain >= 1 ? '' : 'none';

  const modal = document.getElementById('ascension-modal');
  modal.style.display = 'block';
  trapFocus(modal);
}

function closeAscensionModal() {
  clickSound.play();
  const modal = document.getElementById('ascension-modal');
  modal.style.display = 'none';
  releaseFocus(modal);
}

function ascend() {
  const gain = starsToGain();
  if (gain < 1) return;
  if (!confirm(`Tu vas convertir ta partie en ${gain} étoile(s) du Nether (+${gain * 5} % de production permanents). Toute ta progression actuelle sera remise à zéro. Continuer ?`)) return;

  clickSound.play();
  performAscension(); // resets the run; stars, achievements and total playtime are kept

  // rebuild the fresh run UI (block tier, pickaxe, entities, shop, inventory)
  document.getElementById('Pioche-entite').querySelector('img').src = 'assets/entities/wooden-pickaxe.webp';
  clearInventory();
  updateLevel();
  updateEntities();
  updateShop();
  updateInventory();
  restartAppleTimer();
  refreshTooltips();
  updateBlocksDisplay();
  saveProgress();
  closeAscensionModal();
}


document.getElementById('parametres').addEventListener('click', () => {
  openSettingsModal();
});

// keyboard accessibility: Enter / Space activate role="button" elements, Escape closes the settings
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (document.getElementById('parametres-modal').style.display === 'block') closeSettingsModal();
    if (document.getElementById('stats-modal').style.display === 'block') closeStatsModal();
    if (document.getElementById('ascension-modal').style.display === 'block') closeAscensionModal();
    if (document.getElementById('hors-ligne').style.display === 'flex') closeOfflineModal();
    return;
  }

  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[role="button"]')) {
    event.preventDefault(); // prevent the page from scrolling on Space
    event.target.click();
  }
});

// delegated click handling: data-action buttons (replaces the old inline onclick
// attributes and window.* globals) plus closing a modal by clicking its backdrop.
document.addEventListener('click', (event) => {
  if (event.target === document.getElementById('parametres-modal')) { closeSettingsModal(); return; }
  if (event.target === document.getElementById('stats-modal')) { closeStatsModal(); return; }
  if (event.target === document.getElementById('ascension-modal')) { closeAscensionModal(); return; }

  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  switch (trigger.dataset.action) {
    case 'buy-entity':     buyEntity(trigger.dataset.nom); break;
    case 'buy-upgrade':    buyUpgrade(trigger.dataset.nom); break;
    case 'open-stats':     openStatsModal(); break;
    case 'close-stats':    closeStatsModal(); break;
    case 'open-ascension': openAscensionModal(); break;
    case 'close-ascension':closeAscensionModal(); break;
    case 'ascend':         ascend(); break;
    case 'close-settings': closeSettingsModal(); break;
    case 'close-offline':  closeOfflineModal(); break;
    case 'import':         importProgress(); break;
    case 'export':         exportProgress(); break;
    case 'delete':         deleteProgress(); break;
    case 'reload':         location.reload(); break;
  }
});

// game loop: production accrues on REAL elapsed time (delta-time), not a fixed
// amount per tick. browsers throttle a backgrounded tab's setInterval to ~1 s
// instead of 10 ms, so fixed-amount ticking would lose ~99% of background
// production; measuring elapsed time keeps it accurate whatever the tick rate.
// production logic: real-time accrual
let lastProductionTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const elapsedSeconds = (now - lastProductionTick) / 1000;
  lastProductionTick = now;

  let production = computeGlobalYieldPerSecond() * prestigeMultiplier() * elapsedSeconds;
  if (activeBonus === "fullMultiplier") production *= FULL_MULTIPLIER;

  data.blocsActuels += production;
  data.blocsDepuisToujours += production;
}, 10);

// display & game state checks
setInterval(() => {
  updateEntities();
  updateShop();
  checkLevelUp();

  checkBlockAchievements();
  checkPrestigeAchievements();

  updateBlocksDisplay();
}, 50);

// persistence: every 5 seconds, plus whenever the tab is hidden or closed
setInterval(saveProgress, 5000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress();
});
window.addEventListener('pagehide', saveProgress);

// refresh bonuses every second
setInterval(() => {
  if (activeBonus && activeBonus !== "instantGain") updateBonusDisplay();
}, 1000);