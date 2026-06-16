import { initShop, buyUpgrade, updateShop, buyEntity, updateEntities, updateInventory, clearInventory, updatePickaxeEntityImage } from "./modules/shop.js?v=3";
import { initStats, openStatsModal, closeStatsModal } from "./modules/stats.js?v=1";
import { refreshTooltips } from "./modules/tooltips.js?v=2";
import { initOffline, grantOfflineGains, closeOfflineModal } from "./modules/offline.js?v=1";
import { initSettings, openSettingsModal, closeSettingsModal } from "./modules/settings.js?v=1";
import { formatNumber, formatDuration } from "./modules/format.js?v=1";
import { readStorageJSON, DEFAULT_DATA, MAX_LEVEL, data, setData, activeBonus, bonusEndTime, safeSetItem } from "./modules/state.js?v=4";
import { initApples, spawnGoldenApple, restartAppleTimer, updateBonusDisplay, MEGA_CLICK_MULTIPLIER, FULL_MULTIPLIER } from "./modules/apples.js?v=5";
import { fnv1aHash, isValidSaveData, isValidGameData, SAVE_FILE_APP, SAVE_FILE_VERSION } from "./modules/save.js?v=3";
import { initAchievements, clearAchievements, checkGoldenAppleAchievements, checkClickAchievements, checkBlockAchievements, checkEntityAchievements, checkMiscAchievements, updateAchievements, unlockAchievement } from "./modules/achievements.js?v=2";
import { initLevels, checkLevelUp, updateLevel } from "./modules/levels.js?v=1";
import { bgMusic } from "./modules/music.js?v=2";
import "./modules/background.js?v=1";

window.buyEntity = buyEntity 
window.buyUpgrade = buyUpgrade 
window.openStatsModal = openStatsModal
window.closeStatsModal = closeStatsModal
window.closeSettingsModal = closeSettingsModal 
window.closeOfflineModal = closeOfflineModal

window.importProgress = importProgress 
window.exportProgress = exportProgress 
window.deleteProgress = deleteProgress 

console.log('Bienvenue jeune explorateur !');

// remove divs after a delay (click animations)
const timeout = (div) => {
  setTimeout(() => {
    div.remove()
  }, 400)
}

// sounds
const buyEntitySound = new Audio('./assets/audio/entity.mp3');
const buyUpgradeSound = new Audio('./assets/audio/shop.mp3');
buyEntitySound.volume = 0.5;
buyUpgradeSound.volume = 0.5;

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
  });
}


// mined blocks and per-second info
let currentBlocksText = document.getElementById("blocs-actuels");
let blocksPerSecondText = document.getElementById("bps-label");
let blocksPerClickText = document.getElementById("bpc-label");

let blockImgContainer = document.getElementById('bloc-img-container')
let blockImg = document.getElementById('bloc-img')

blockImg.addEventListener('click', mineBlock);

// a corrupted or tampered localStorage entry must never reach the game loops:
// validate the loaded save with the same rules as an imported file, else reset
// to a fresh (cloned) default state.
if (!isValidGameData(data)) setData(structuredClone(DEFAULT_DATA));

// first save: persist the fresh state so a brand-new game survives a reload
if (!localStorage.getItem('minedle-data')) safeSetItem('minedle-data', JSON.stringify(data));


// the sacred call

// wire the offline-gains and settings modules with the index.js helpers they need
initOffline({ computeGlobalYieldPerSecond, saveProgress, buyEntitySound });
initSettings({ buyEntitySound });

// wire the stats modal with the index.js helpers it needs
initStats({ buyEntitySound, computeGlobalYieldPerSecond });

// wire the shop/entities/inventory module with the index.js helpers it needs
initShop({ saveProgress, updateBlocksDisplay, refreshTooltips, computeGlobalYieldPerSecond, buyUpgradeSound, buyEntitySound });

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

// update mined blocks display and per-second info
function updateBlocksDisplay() {
  let bps = computeGlobalYieldPerSecond();
  let bpc = data.bpc * data.coefficientClic;

  // if FullMultiplier is active, multiply BPS
  if (activeBonus === "fullMultiplier") {
    bps *= FULL_MULTIPLIER;
    blocksPerSecondText.style.color = "#6f6";
    blocksPerSecondText.style.textShadow = "0px 1px 4px black";
    blocksPerSecondText.style.fontWeight = "bold";
  } else {
    blocksPerSecondText.style.color = "";
    blocksPerSecondText.style.textShadow = "none";
    blocksPerSecondText.style.fontWeight = "normal";
  }

  // if MegaClick is active, multiply BPC
  if (activeBonus === "megaClick") {
    bpc *= MEGA_CLICK_MULTIPLIER;
    blocksPerClickText.style.color = "#6f6";
    blocksPerClickText.style.textShadow = "0px 1px 4px black";
    blocksPerClickText.style.fontWeight = "bold";
  } else if (activeBonus === "fullMultiplier") {
    bpc *= FULL_MULTIPLIER;
    blocksPerClickText.style.color = "#6f6";
    blocksPerClickText.style.textShadow = "0px 1px 4px black";
    blocksPerClickText.style.fontWeight = "bold";
  } else {
    blocksPerClickText.style.color = "";
    blocksPerClickText.style.textShadow = "none";
    blocksPerClickText.style.fontWeight = "normal";
  }

  // update the values display
  currentBlocksText.innerHTML = formatNumber(data.blocsActuels);
  blocksPerSecondText.innerHTML = 'par seconde : ' + formatNumber(bps);
  blocksPerClickText.innerHTML = 'par clic : ' + formatNumber(bpc);
}

// format the block count for better readability
function computeGlobalYieldPerSecond() {
  let bps = 0;
  data.entites.forEach(e => {
    bps += e.rendement_actuel * e.quantite * e.coefficient;
  });
  return parseFloat(bps.toFixed(2));
}

// click on the block
function mineBlock(event) {

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

  div.innerHTML = `+${formatNumber(data.bpc * data.coefficientClic * multiplicateur)}`  
  div.style.cssText = `
  color: white; 
  position: absolute; 
  top: ${y}px; 
  left: ${x}px; 
  font-size: 20px; 
  pointer-events: none; 
  white-space: nowrap;`;  
  blockImgContainer.appendChild(div)
  div.classList.add('fade-up')
  timeout(div)

  // if a click-multiplier bonus is active
  const baseGain = data.bpc * data.coefficientClic;

  // compute total gain
  let totalGain = baseGain * multiplicateur;

  data.blocsDepuisToujours += totalGain;
  data.blocsActuels += totalGain;
  data.blocsMinesAvecClics += totalGain;

  checkLevelUp();
  checkClickAchievements();
  updateEntities();
  updateShop();
  updateBlocksDisplay();
  saveProgress();
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
  setData(importedData);
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
      } catch (error) {
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


document.getElementById('parametres').addEventListener('click', () => {
  openSettingsModal();
});

// keyboard accessibility: Enter / Space activate role="button" elements, Escape closes the settings
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (document.getElementById('parametres-modal').style.display === 'block') closeSettingsModal();
    if (document.getElementById('stats-modal').style.display === 'block') closeStatsModal();
    if (document.getElementById('hors-ligne').style.display === 'flex') closeOfflineModal();
    return;
  }

  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[role="button"]')) {
    event.preventDefault(); // prevent the page from scrolling on Space
    event.target.click();
  }
});

window.onclick = function(event) {
  if (event.target === document.getElementById('parametres-modal')) closeSettingsModal();
  if (event.target === document.getElementById('stats-modal')) closeStatsModal();
}

// game loop, refreshes every hundredth of a second
// production logic: 100 ticks per second (smooth numbers)
setInterval(() => {
  let currentProduction = computeGlobalYieldPerSecond() / 100;

  // check whether the FullMultiplier bonus is active
  if (activeBonus === "fullMultiplier") currentProduction *= FULL_MULTIPLIER;

  data.blocsActuels += currentProduction;
  data.blocsDepuisToujours += currentProduction;
}, 10);

// display & game state checks
setInterval(() => {
  updateEntities();
  updateShop();
  checkLevelUp();

  checkBlockAchievements();

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