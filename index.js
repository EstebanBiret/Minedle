import { computeCost, computeYield, entities } from "./constants/entities.js?v=2";
import { shop } from "./constants/shop.js?v=2";
import { succes } from "./constants/success.js";

window.buyEntity = buyEntity 
window.buyUpgrade = buyUpgrade 
window.closeSettingsModal = closeSettingsModal 

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
const achievementUnlockedSound = new Audio('./assets/audio/success.mp3');
const goldenAppleSound = new Audio('./assets/audio/golden-apple.mp3');
buyEntitySound.volume = 0.5;
buyUpgradeSound.volume = 0.5;
achievementUnlockedSound.volume = 0.5;
goldenAppleSound.volume = 0.5;

// single-tab flag (see the BroadcastChannel block further down)
let tabActive = true;
let lastPlaytimeTick = Date.now(); // session start, used to accumulate playtime

// safe localStorage read: a corrupted entry must never brick the game
function readStorageJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    console.error(`Stored data for "${key}" is corrupted, falling back to defaults.`, error);
    return fallback;
  }
}

// ambient music
const MUSIC_STORAGE_KEY = 'minedle-music';
const bgMusic = new Audio('./assets/audio/bg-music.mp3');
bgMusic.loop = true;
bgMusic.preload = 'metadata'; // load the track duration for the progress bar

let musicPrefs = readStorageJSON(MUSIC_STORAGE_KEY, null);
if (!musicPrefs || typeof musicPrefs.muted !== 'boolean' || typeof musicPrefs.volume !== 'number' || !(musicPrefs.volume >= 0 && musicPrefs.volume <= 1)) {
  musicPrefs = { muted: true, volume: 0.5 };
}
let musicAutoplayHooked = false;

const musicSlider = document.getElementById('music-slider');
const musicIconOn = document.getElementById('music-icon-on');
const musicIconOff = document.getElementById('music-icon-off');

// apply prefs to the audio element + UI, persist them, and (re)start playback if needed
function applyMusicState() {
  const audible = !musicPrefs.muted && musicPrefs.volume > 0;

  bgMusic.volume = musicPrefs.muted ? 0 : musicPrefs.volume;
  musicIconOn.style.display = audible ? '' : 'none';
  musicIconOff.style.display = audible ? 'none' : '';
  musicSlider.value = Math.round(musicPrefs.volume * 100);
  localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(musicPrefs));

  if (audible && bgMusic.paused) {
    bgMusic.play().catch(() => {
      // autoplay blocked by the browser: retry on the next user interaction
      if (!musicAutoplayHooked) {
        musicAutoplayHooked = true;
        document.addEventListener('click', applyMusicState, { once: true });
      }
    });
  }
}

document.getElementById('music-toggle').addEventListener('click', () => {
  musicPrefs.muted = !musicPrefs.muted;
  if (!musicPrefs.muted && musicPrefs.volume === 0) musicPrefs.volume = 0.5; // unmuting at volume 0 would stay silent
  applyMusicState();
});

musicSlider.addEventListener('input', () => {
  musicPrefs.volume = musicSlider.value / 100;
  musicPrefs.muted = false; // moving the slider means the player wants to hear something
  applyMusicState();
});

// progress bar: follows playback, draggable to seek, wraps back to 0 when the track loops
const musicProgress = document.getElementById('music-progress');
let isSeekingMusic = false;

bgMusic.addEventListener('loadedmetadata', () => {
  musicProgress.max = bgMusic.duration;
});

bgMusic.addEventListener('timeupdate', () => {
  if (!isSeekingMusic) musicProgress.value = bgMusic.currentTime;
});

musicProgress.addEventListener('input', () => {
  isSeekingMusic = true; // while dragging, stop following playback
});

musicProgress.addEventListener('change', () => {
  bgMusic.currentTime = Number(musicProgress.value);
  isSeekingMusic = false;
});

applyMusicState();

// dynamic background: the looping video fades in over the drifting image once it can play;
// if the file is missing (or on small screens / reduced motion), the animated image stays
const bgVideo = document.getElementById('background-video');

if (window.matchMedia('(max-width: 1200px)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  bgVideo.remove();
} else {
  const markVideoReady = () => bgVideo.classList.add('ready');
  bgVideo.addEventListener('canplay', markVideoReady);
  if (bgVideo.readyState >= 3) markVideoReady(); // cached video: canplay may have fired before this script ran

  bgVideo.querySelector('source').addEventListener('error', () => bgVideo.remove());
  if (bgVideo.networkState === 3) bgVideo.remove(); // source selection already failed before this script ran

  // save battery: pause the background video while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!document.body.contains(bgVideo)) return;
    if (document.visibilityState === 'hidden') bgVideo.pause();
    else bgVideo.play().catch(() => {});
  });
}

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

// levels
let levels = ['stone', 'coal', 'iron', 'gold', 'redstone', 'lapis', 'emerald', 'diamond'];
let levelIndex = 0;
const MAX_LEVEL = 7;

// mined blocks and per-second info
let currentBlocksText = document.getElementById("blocs-actuels");
let blocksPerSecondText = document.getElementById("bps-label");
let blocksPerClickText = document.getElementById("bpc-label");

let blockImgContainer = document.getElementById('bloc-img-container')
let blockImg = document.getElementById('bloc-img')

blockImg.addEventListener('click', mineBlock);

// achievements
let missingAchievements = succes;

// bonus
let activeBonus = null;
let bonusEndTime = 0;

// retrieve data from local storage
const DEFAULT_DATA = {
  derniere_visite: 0,
  temps_de_jeu_ms: 0,
  blocsDepuisToujours: 0,
  blocsActuels: 0,
  bpc: 1,
  coefficientClic: 1,
  entites: entities.map(u => ({
    nom: u.nom,
    quantite: 0,
    cout_initial: u.cout_initial,
    cout_actuel: u.cout_initial,
    rendement_initial: u.rendement_initial,
    rendement_actuel: 0,
    coefficient: u.coefficient
  })),
  niveau: 0,
  blocsMinesAvecClics: 0,
  boutique: shop.map(u => ({
    id: u.id,
    nom: u.nom,
    cout: u.cout,
    categorie: u.categorie
  })),
  inventaire: [],
  succes: [],
  pommes_or: 0,
  delai_pommes_or_ms: 300000 // 5min
};
let data = readStorageJSON('minedle-data', DEFAULT_DATA); // load saved data, otherwise start a new game
if(data == DEFAULT_DATA) localStorage.setItem('minedle-data', JSON.stringify(data)); // first save

let appleTimer;

// the sacred call
init();

// offline gains: production earned while the game was closed
const OFFLINE_RATE = 0.5;            // fraction of the normal production earned offline
const OFFLINE_CAP_MS = 12 * 3600000; // gains stop accumulating after 12 hours away
const OFFLINE_MIN_MS = 60000;        // ignore absences shorter than a minute

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

function grantOfflineGains() {
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

function closeOfflineModal() {
  buyEntitySound.play();
  document.getElementById('hors-ligne').style.display = 'none';
}
window.closeOfflineModal = closeOfflineModal;

grantOfflineGains();

// stats modal
function openStatsModal() {
  buyEntitySound.play();

  const totalEntities = data.entites.reduce((sum, e) => sum + e.quantite, 0);
  // adaptive precision: a real but small manual share must not display as "0 %"
  const share = data.blocsDepuisToujours > 0 ? (100 * data.blocsMinesAvecClics / data.blocsDepuisToujours) : 0;
  const shareText = share >= 10 ? String(Math.round(share)) : share >= 0.1 ? share.toFixed(1).replace('.', ',') : share > 0 ? '< 0,1' : '0';

  document.getElementById('stat-blocs-total').innerHTML = formatNumber(data.blocsDepuisToujours);
  document.getElementById('stat-blocs-clics').innerHTML = `${formatNumber(data.blocsMinesAvecClics)} (${shareText} %)`;
  document.getElementById('stat-bps').innerHTML = `${formatNumber(computeGlobalYieldPerSecond())} / s`;
  document.getElementById('stat-pommes').innerHTML = formatNumber(data.pommes_or);
  document.getElementById('stat-temps').innerHTML = formatDuration(data.temps_de_jeu_ms || 0);
  document.getElementById('stat-entites').innerHTML = formatNumber(totalEntities);
  document.getElementById('stat-ameliorations').innerHTML = `${data.inventaire.length} / ${shop.length}`;
  document.getElementById('stat-succes').innerHTML = `${data.succes.length} / ${succes.length}`;

  document.getElementById('stats-modal').style.display = 'block';
  document.querySelector('#stats-modal .close').focus();
}

function closeStatsModal() {
  buyEntitySound.play();
  document.getElementById('stats-modal').style.display = 'none';
  document.getElementById('stats-button').focus();
}

window.openStatsModal = openStatsModal;
window.closeStatsModal = closeStatsModal;

function init() {
  // golden apples (init() can run again on import/delete: clear any pending timer to avoid duplicate spawns)
  clearTimeout(appleTimer);
  appleTimer = setTimeout(spawnGoldenApple, data.delai_pommes_or_ms);

  updateBlocksDisplay();
  updateLevel();
  updateEntities();
  updateShop();
  updateInventory();
  updateAchievements();
  updatePickaxeEntityImage();
}

/* LEVEL SECTION */

// check whether to move to the next level
function checkLevelUp() {
  if(levelIndex == MAX_LEVEL) return;
  const currentLevel = levels[levelIndex];
  switch (currentLevel) {
    case 'stone':
      if (data.blocsDepuisToujours >= 1000) {
        increaseLevel();
        unlockAchievement(1);
      }
      break;
    case 'coal':
      if (data.blocsDepuisToujours >= 10000) {
        increaseLevel();
        unlockAchievement(2);
      }
      break;
    case 'iron':
      if (data.blocsDepuisToujours >= 100000) {
        increaseLevel();
        unlockAchievement(3);
      }
      break;
    case 'gold':
      if (data.blocsDepuisToujours >= 1000000) {
        increaseLevel();
        unlockAchievement(4);
      }
      break;
    case 'redstone':
      if (data.blocsDepuisToujours >= 10000000) {
        increaseLevel();
        unlockAchievement(5);
      }
      break;
    case 'lapis':
      if (data.blocsDepuisToujours >= 100000000) {
        increaseLevel();
        unlockAchievement(6);
      }
      break;
    case 'emerald':
      if (data.blocsDepuisToujours >= 2000000000) {
        increaseLevel();
        unlockAchievement(7);
      }
      break;
  }
}

function increaseLevel() {
  levelIndex++;
  let newBlock = levels[levelIndex];
  document.getElementById('bloc-img').src = `assets/blocks/${newBlock}.webp`;
  document.querySelectorAll('.bloc-img-entite').forEach(e => e.src = `assets/blocks/${newBlock}.webp`);
  data.niveau = levelIndex;
  saveProgress();
}

// when returning to the game, restore the current level
function updateLevel() {
  levelIndex = data.niveau;
  let newBlock = levels[levelIndex];
  document.getElementById('bloc-img').src = `assets/blocks/${newBlock}.webp`;
  document.querySelectorAll('.bloc-img-entite').forEach(e => e.src = `assets/blocks/${newBlock}.webp`);
}

/* DISPLAY, SAVE & COMPUTE SECTION */

// update game data in localStorage
function saveProgress() {
  if (!tabActive) return; // frozen tab: never overwrite the active tab's save
  const nowTs = Date.now();
  data.temps_de_jeu_ms = (data.temps_de_jeu_ms || 0) + (nowTs - lastPlaytimeTick); // older saves may lack the field
  lastPlaytimeTick = nowTs;
  data.derniere_visite = nowTs;
  localStorage.setItem('minedle-data', JSON.stringify(data));
}

// update mined blocks display and per-second info
function updateBlocksDisplay() {
  let bps = computeGlobalYieldPerSecond();
  let bpc = data.bpc * data.coefficientClic;

  // if FullMultiplier is active, multiply BPS
  if (activeBonus === "fullMultiplier") {
    bps *= 7;
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
    bpc *= 777;
    blocksPerClickText.style.color = "#6f6";
    blocksPerClickText.style.textShadow = "0px 1px 4px black";
    blocksPerClickText.style.fontWeight = "bold";
  } else if (activeBonus === "fullMultiplier") {
    bpc *= 7;
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
// formats a number for display: spaces between thousands, comma decimals,
// abbreviated from one million ("2,5 millions")
function formatNumber(n) {
  n = Number(n);

  if (n < 1_000_000) {
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[\u202F\u00A0]/g, " ");
  }

  const suffixes = ["", "millions", "milliards", "billions", "billiards", "trillions", "trilliards", "quadrillions", "quadrilliards"]; // numbers up to 30 digits max
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

// compute blocks mined per second from entities
function computeGlobalYieldPerSecond() {
  let bps = 0;
  data.entites.forEach(e => {
    bps += e.rendement_actuel * e.quantite * e.coefficient;
  });
  return parseFloat(bps.toFixed(2));
}

/* SHOP SECTION */

function buyUpgrade(upgradeName) {
  let index = data.boutique.findIndex(a => a.nom === upgradeName);
  const upgrade = data.boutique.find(a => a.nom === upgradeName);
  if (!upgrade || data.blocsActuels < upgrade.cout) return;
  buyUpgradeSound.play();
  // remove from the shop
  let boughtUpgrade = data.boutique.splice(index, 1)[0];

  // add to inventory & update current blocks
  data.inventaire.push(boughtUpgrade);
  data.blocsActuels -= upgrade.cout;
 
  // hide the purchased upgrade
  document.getElementById(`${boughtUpgrade.nom}-amelioration`).classList.add('bloque');
  
  // apply the upgrade's effects
  if (upgrade.categorie === 'clic') {
    // double click efficiency
    data.bpc *= 2;
  }
  // golden apples
  else if(upgrade.categorie === 'pomme_or') {
    data.delai_pommes_or_ms *= 0.75; // delay reduced by 25%
  }
  // entity upgrade
  else {
    const matchingEntity = data.entites.find(ent => ent.nom === upgrade.categorie);
    if (matchingEntity) {
      // double the entity's efficiency
      matchingEntity.coefficient *= 2;
    } 
  }

  // finally, save everything
  updateBlocksDisplay();
  saveProgress();
  updateEntities();
  updateShop();
  updateInventory();
  updatePickaxeEntityImage();
  refreshTooltips();
}

function updateShop() {
  // hide already-purchased upgrades
  data.inventaire.forEach(a => {
    const upgrade = shop.find(ame => ame.id === a.id);
    if (upgrade) {
      const upgradeElement = document.getElementById(`${upgrade.nom}-amelioration`);
      upgradeElement.classList.add('bloque');
    }
  });

  // update remaining upgrades
  data.boutique.forEach(a => {
    const upgrade = shop.find(ame => ame.id === a.id);
    if (upgrade) {
      const upgradeElement = document.getElementById(`${upgrade.nom}-amelioration`);

      // click
      if (upgrade.categorie === 'clic') {
        if (data.blocsMinesAvecClics < upgrade.condition) {
          upgradeElement.classList.add('bloque');
        } else {
          upgradeElement.classList.remove('bloque');
        }
      }
      // golden apples
      else if(upgrade.categorie === 'pomme_or') {
        if (data.pommes_or < upgrade.condition) {
          upgradeElement.classList.add('bloque');
        } else {
          upgradeElement.classList.remove('bloque');
        }
      }
      // entity upgrade
      else {
        const matchingEntity = data.entites.find(ent => ent.nom === upgrade.categorie);
        if (matchingEntity && matchingEntity.quantite < upgrade.condition) {
          upgradeElement.classList.add('bloque');
        } else {
          upgradeElement.classList.remove('bloque');
        }
      }
      
      // then, if the entity is shown, check whether it can be bought
      if (data.blocsActuels >= a.cout) {
        upgradeElement.classList.remove('disabled');
        upgradeElement.querySelectorAll('*').forEach(child => {
          child.classList.remove('disabled');
        });

        document.getElementById(`${upgrade.nom}-cout`).classList.remove('disabled-cost');
        document.getElementById(`${upgrade.nom}-cout`).classList.add('enabled-cost');
      } else {
        upgradeElement.classList.add('disabled');
        upgradeElement.querySelectorAll('*').forEach(child => {
          child.classList.add('disabled');
        });

        document.getElementById(`${upgrade.nom}-cout`).classList.remove('enabled-cost');
        document.getElementById(`${upgrade.nom}-cout`).classList.add('disabled-cost');
      }
      document.getElementById(`${upgrade.nom}-cout`).innerHTML = formatNumber(Math.round(upgrade.cout));
    }
  });

  // show a message if no upgrade is available to buy
  const emptyMessage = document.getElementById('boutique-vide');
  if (emptyMessage) {
    const visibleUpgrades = document.querySelectorAll('#boutique-container .boutique:not(.bloque)').length;
    emptyMessage.style.display = visibleUpgrades === 0 ? 'block' : 'none';
  }
}

/* ENTITY SECTION */

// update the pickaxe image in the entity if pickaxe upgrades were bought
function updatePickaxeEntityImage() {
  const pickaxeEntityElement = document.getElementById('Pioche-entite');
  const pickaxeImage = pickaxeEntityElement.querySelector('img');

  const diamondPickaxe = data.inventaire.find(i => i.id === 7);
  if (diamondPickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 7).image;
    return;
  }
  const goldPickaxe = data.inventaire.find(i => i.id === 6);
  if (goldPickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 6).image;
    return;
  }
  const ironPickaxe = data.inventaire.find(i => i.id === 5);
  if (ironPickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 5).image;
    return;
  }
  const stonePickaxe = data.inventaire.find(i => i.id === 4);
  if (stonePickaxe) {
    pickaxeImage.src = shop.find(i => i.id === 4).image;
  }
}

function buyEntity(entityName) {
  const entity = data.entites.find(e => e.nom === entityName);

  if (!entity || data.blocsActuels < entity.cout_actuel) return;
  buyEntitySound.play();
  data.blocsActuels -= entity.cout_actuel;

  // update the entity's current yield, cost and quantity
  entity.quantite++;
  entity.cout_actuel = computeCost(entity.cout_initial, entity.quantite);
  entity.rendement_actuel = computeYield(entity.rendement_initial, entity.quantite);

  // each entity bought increases click efficiency by 2%
  data.coefficientClic *= 1.02;

  updateBlocksDisplay();
  saveProgress();
  updateEntities();
  updateShop();
  checkMiscAchievements();
  checkEntityAchievements();
}

function updateEntities() {
  data.entites.forEach(e => {
    const entity = entities.find(ent => ent.nom === e.nom);
    if (entity) {
      const entityElement = document.getElementById(`${entity.nom}-entite`);
      
      // decide whether to show the entity, based on its threshold and total blocks ever mined
      if (data.blocsDepuisToujours < entity.seuil_affichage) {
        entityElement.classList.add('bloque');
        return;
      } else {
        entityElement.classList.remove('bloque');
      }

      // then, if the entity is shown, check whether it can be bought
      if (data.blocsActuels >= e.cout_actuel) {
        entityElement.classList.remove('disabled');
        entityElement.querySelectorAll('*').forEach(child => {
          child.classList.remove('disabled');
        });

        document.getElementById(`${entity.nom}-cout`).classList.remove('disabled-cost');
        document.getElementById(`${entity.nom}-cout`).classList.add('enabled-cost');
      } else {
        entityElement.classList.add('disabled');
        entityElement.querySelectorAll('*').forEach(child => {
          child.classList.add('disabled');
        });

        document.getElementById(`${entity.nom}-cout`).classList.remove('enabled-cost');
        document.getElementById(`${entity.nom}-cout`).classList.add('disabled-cost');
      }

      document.getElementById(`${entity.nom}-quantite`).innerHTML = formatNumber(e.quantite);
      document.getElementById(`${entity.nom}-cout`).innerHTML = formatNumber(Math.round(e.cout_actuel));

      if(e.quantite > 0) {
        const percentage = ((e.rendement_actuel * e.quantite * e.coefficient / computeGlobalYieldPerSecond()) * 100).toFixed(2);
        entityElement.dataset.tooltipYieldRatio = `${percentage}% du rendement total`;
        entityElement.querySelectorAll("*").forEach((child) => {
          child.dataset.tooltipYieldRatio = `${percentage}% du rendement total`;
        });
      } else {
        entityElement.dataset.tooltipYieldRatio = '';
      } 
    }
  });
}

/* INVENTORY SECTION */

function updateInventory() {
  // update the inventory label
  let itemCount = data.inventaire.length;
  document.getElementById('inventaire-label').innerHTML = `Inventaire (${itemCount}/${shop.length})`;

  // and update the inventory items
  data.inventaire.forEach(a => {
    const inventoryItem = shop.find(item => item.id === a.id);
    const td = document.getElementById(`inventaire-${a.id}`);
    td.innerHTML = '';
    td.appendChild(document.createElement('img')).src = inventoryItem.image;

    // adjust this image's size
    td.querySelector('img').style.width = '70%';

    // add tooltips to the inventory items
    td.classList.add("tooltip-element");
    td.setAttribute("data-tooltip-title", inventoryItem.nom);
    td.setAttribute("data-tooltip-content-deux", inventoryItem.description);
    td.setAttribute("data-tooltip-rendement-ratio", "(Coût " + formatNumber(inventoryItem.cout) + ")");

    // and on their image
    td.querySelector('img').classList.add("tooltip-element");
    td.querySelector('img').setAttribute("data-tooltip-title", inventoryItem.nom);
    td.querySelector('img').setAttribute("data-tooltip-content-deux", inventoryItem.description);
    td.querySelector('img').setAttribute("data-tooltip-rendement-ratio", "(Coût " + formatNumber(inventoryItem.cout) + ")");
  });
}

// remove all inventory elements from the DOM
function clearInventory() {
  for (let i = 1; i <= 36; i++) {
    let inventoryCell = document.getElementById(`inventaire-${i}`);
    if (inventoryCell) {
      inventoryCell.innerHTML = '';
      inventoryCell.removeAttribute('data-tooltip-title');
      inventoryCell.removeAttribute('data-tooltip-content-deux');
      inventoryCell.removeAttribute('data-tooltip-rendement-ratio');
      inventoryCell.classList.remove('tooltip-element');

      let newElement = inventoryCell.cloneNode(true); // clone to remove the attached tooltip event
      inventoryCell.parentNode.replaceChild(newElement, inventoryCell);
    }
  }
}

/* ACHIEVEMENTS SECTION */ 

// remove all achievement elements from the DOM and their tooltips
function clearAchievements() {
  for (let i = 1; i <= 30; i++) {
    let achievementCell = document.getElementById(`succes-${i}`);
    if (achievementCell) {
      achievementCell.innerHTML = '';
      achievementCell.removeAttribute('data-tooltip-title');
      achievementCell.removeAttribute('data-tooltip-content-deux');
      achievementCell.classList.remove('tooltip-element');

      let newElement = achievementCell.cloneNode(true); // clone to remove the attached tooltip event
      achievementCell.parentNode.replaceChild(newElement, achievementCell);
    }
  }
}

// check whether a new golden-apple achievement is unlocked
function checkGoldenAppleAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // get all missing golden-apple achievements
  const goldenAppleAchievements = missingAchievements.filter(s => s.categorie === 'pomme_or');

  // all achievements unlocked for this type
  if(goldenAppleAchievements.length === 0) return;

  // iterate over missing golden-apple achievements
  goldenAppleAchievements.forEach(s => {
    if(data.pommes_or >= s.seuil) {
      unlockAchievement(s.id);
    }
  });
}

// check whether a new click achievement is unlocked
function checkClickAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // get all missing click achievements
  const clickAchievements = missingAchievements.filter(s => s.categorie === 'clics');

  // all achievements unlocked for this type
  if(clickAchievements.length === 0) return;

  // iterate over missing click achievements
  clickAchievements.forEach(s => {
    if(data.blocsMinesAvecClics >= s.seuil) unlockAchievement(s.id);
  });
}

// check whether a new block achievement is unlocked
function checkBlockAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // get all missing block achievements
  const blockAchievements = missingAchievements.filter(s => s.categorie === 'bps' || s.categorie === 'blocs_totaux');

  // all achievements unlocked for this type
  if(blockAchievements.length === 0) return;

  // iterate over missing block achievements
  blockAchievements.forEach(s => {
    if(s.categorie === 'bps') {
      // ignore the bonus for the achievement
      if(computeGlobalYieldPerSecond() >= s.seuil) unlockAchievement(s.id);
    }
    else { // total blocks since the beginning
      if(data.blocsDepuisToujours >= s.seuil) unlockAchievement(s.id);
    }
  });
}

// check whether a new entity achievement is unlocked
function checkEntityAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // get all missing entity achievements
  const entityAchievements = missingAchievements.filter(s => s.categorie === 'Pioche' || s.categorie === 'Villageois' || s.categorie === 'Poulet' || s.categorie === 'Zombie' || s.categorie === 'Mineshaft' || s.categorie === 'Champimeuh' || s.categorie === 'Araignée' || s.categorie === 'Golem de neige' || s.categorie === 'Wither' || s.categorie === 'Portail de l’End');

  // all achievements unlocked for this type
  if(entityAchievements.length === 0) return;

  // iterate over missing entity achievements
  entityAchievements.forEach(s => {
    const matchingEntity = data.entites.find(ent => ent.nom === s.categorie);
    if(matchingEntity && matchingEntity.quantite >= s.seuil) unlockAchievement(s.id);
  });
}

// check whether a new misc achievement is unlocked (25 of each entity)
function checkMiscAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // get all missing misc achievements
  const miscAchievements = missingAchievements.filter(s => s.categorie === 'divers');

  // all achievements unlocked for this type
  if(miscAchievements.length === 0) return;

  // check whether we have at least 25 of each entity
  let tenOfEach = true;
  data.entites.forEach(e => {
    if(e.quantite < 25) tenOfEach = false;
  });
  if(tenOfEach) unlockAchievement(27);  
}

function updateAchievements() {
  // first, update the current missingAchievements object based on what's already unlocked and the imported succes constant
  missingAchievements = succes.filter(s => !data.succes.some(succesDebloque => succesDebloque.id === s.id));

  // update the achievements label
  let achievementCount = data.succes.length;
  document.getElementById('succes-label').innerHTML = `Succès (${achievementCount}/${succes.length})`;

  // and update the achievement items
  data.succes.forEach(a => {
    const achievementItem = succes.find(item => item.id === a.id);
    const td = document.getElementById(`succes-${a.id}`);
    td.innerHTML = '';
    td.appendChild(document.createElement('img')).src = achievementItem.image;

    // adjust this image's size
    td.querySelector('img').style.width = '70%';

    // add tooltips to the inventory items
    td.classList.add("tooltip-element");
    td.setAttribute("data-tooltip-title", achievementItem.nom);
    td.setAttribute("data-tooltip-content-deux", achievementItem.description);

    // and on their image
    td.querySelector('img').classList.add("tooltip-element");
    td.querySelector('img').setAttribute("data-tooltip-title", achievementItem.nom);
    td.querySelector('img').setAttribute("data-tooltip-content-deux", achievementItem.description);
  });
}

function unlockAchievement(id) {
  // find the achievement in the missing list
  const achievementToUnlock = missingAchievements.find(s => s.id === id);
  if (!achievementToUnlock) return; // achievement already unlocked or nonexistent
  data.succes.push(achievementToUnlock);
  updateAchievements();
  refreshTooltips();
  achievementNotification(id);
}

function achievementNotification(id) {
  // find the achievement in the list
  const targetAchievement = succes.find(s => s.id === id);
  if (!targetAchievement) return;

  achievementUnlockedSound.play();
  
  const div = document.createElement('div');
  div.classList.add('notification-succes');
  document.body.appendChild(div);
  div.style.bottom = "-100px"; 

  const img = document.createElement('img');
  img.src = targetAchievement.image;
  img.classList.add('img-notification-succes');
  img.style.width = '15%';
  div.appendChild(img);

  const div2 = document.createElement('div');
  div2.classList.add('txt-notification-succes');

  const title = document.createElement('div');
  title.innerHTML = "Succès obtenu !";
  title.classList.add('titre-notification-succes');
  div2.appendChild(title);

  const achievementName = document.createElement('div');
  achievementName.innerHTML = targetAchievement.nom;
  achievementName.classList.add('nom-notification-succes');
  div2.appendChild(achievementName);

  div.appendChild(div2);
  
  setTimeout(() => {
    div.style.bottom = "20px";
  }, 10);
  setTimeout(() => {
    div.style.bottom = "-" + div.clientHeight + "px";
  }, 4500); 
  setTimeout(() => {
    div.remove();
  }, 5000); 
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
      multiplicateur = 777;
  } else if (activeBonus === "fullMultiplier") {
      multiplicateur = 7;
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

  // update localStorage

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
function refreshTooltips() {
  const tooltip = document.getElementById("tooltip");
  const tooltipTitle = document.getElementById("tooltip-title");
  const tooltipContent = document.getElementById("tooltip-content");
  const tooltipContentDeux = document.getElementById("tooltip-content-deux");
  const tooltipYieldRatio = document.getElementById("tooltip-rendement-ratio");
  const padding = 10;

  let suppressNextTap = false;

  document.addEventListener("touchstart", event => {
    if (!event.target.closest(".tooltip-element")) hideTooltip();
  }, { passive: true });

  document.querySelectorAll(".tooltip-element").forEach(element => {
    element.addEventListener("mouseover", event => {
      showTooltipFor(event.target);
      document.addEventListener("mousemove", updateTooltipPosition);
    });

    element.addEventListener("mouseout", () => {
      hideTooltip();
      document.removeEventListener("mousemove", updateTooltipPosition);
    });

    // touch devices: a long press shows the tooltip, a quick tap keeps its normal action
    let touchTimer = null;

    element.addEventListener("touchstart", event => {
      const touch = event.touches[0];
      const touchPoint = { pageX: touch.clientX, pageY: touch.clientY }; // clientX: the tooltip is position fixed
      touchTimer = setTimeout(() => {
        touchTimer = null;
        suppressNextTap = true;
        showTooltipFor(event.target);
        updateTooltipPosition(touchPoint);
      }, 450);
    }, { passive: true });

    element.addEventListener("touchmove", () => {
      clearTimeout(touchTimer);
      touchTimer = null;
    }, { passive: true });

    element.addEventListener("touchend", event => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      } else if (suppressNextTap) {
        suppressNextTap = false;
        event.preventDefault(); // long press: block the simulated click (no accidental purchase)
      }
    });
  });

  function showTooltipFor(target) {
    const { tooltipTitle: title, tooltipContent: content, tooltipContentDeux: contentDeux, tooltipYieldRatio: rendementRatio } = target.dataset;

    tooltipTitle.innerHTML = title || "";
    tooltipContent.innerHTML = content || "";
    tooltipContentDeux.innerHTML = contentDeux || "";
    tooltipYieldRatio.innerHTML = rendementRatio || "";

    tooltip.classList.add("visible");
  }

  function hideTooltip() {
    tooltip.classList.remove("visible");
    tooltip.classList.add("transparent");
  }

  function updateTooltipPosition(event) {
    const tooltipRect = tooltip.getBoundingClientRect();
    let newX = event.pageX + padding;
    let newY = event.pageY + padding;

    if (newX + tooltipRect.width > window.innerWidth) {
      newX = event.pageX - tooltipRect.width - padding;
    }
    if (newY + tooltipRect.height > window.innerHeight) {
      newY = event.pageY - tooltipRect.height - padding;
    }

    tooltip.style.left = `${newX}px`;
    tooltip.style.top = `${newY}px`;
    tooltip.classList.remove("transparent");
  }
}

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

/* SETTINGS */ 

/* SAVE FILES (export / import) */

const SAVE_FILE_APP = 'minedle';
const SAVE_FILE_VERSION = 1;

// FNV-1a 32-bit hash, used as an integrity checksum for save files
function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

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

// structural + integrity validation of an imported save file
function isValidSaveData(fileContent) {
  if (!fileContent || typeof fileContent !== 'object') return false;
  if (fileContent.app !== SAVE_FILE_APP) return false;
  if (typeof fileContent.checksum !== 'string') return false;
  if (!fileContent.payload || typeof fileContent.payload !== 'object') return false;
  if (fnv1aHash(JSON.stringify(fileContent.payload)) !== fileContent.checksum) return false;

  const d = fileContent.payload.data;
  if (!d || typeof d !== 'object') return false;

  const numericFields = ['blocsDepuisToujours', 'blocsActuels', 'bpc', 'coefficientClic', 'blocsMinesAvecClics', 'pommes_or'];
  for (const field of numericFields) {
    if (typeof d[field] !== 'number' || !isFinite(d[field]) || d[field] < 0) return false;
  }
  if (typeof d.delai_pommes_or_ms !== 'number' || d.delai_pommes_or_ms < 1000) return false;
  if (!Number.isInteger(d.niveau) || d.niveau < 0 || d.niveau > MAX_LEVEL) return false;
  if ('derniere_visite' in d && (typeof d.derniere_visite !== 'number' || !isFinite(d.derniere_visite) || d.derniere_visite < 0)) return false; // optional field (older saves)
  if ('temps_de_jeu_ms' in d && (typeof d.temps_de_jeu_ms !== 'number' || !isFinite(d.temps_de_jeu_ms) || d.temps_de_jeu_ms < 0)) return false; // optional field (older saves)

  if (![d.entites, d.boutique, d.inventaire, d.succes].every(Array.isArray)) return false;

  for (const e of d.entites) {
    if (!e || typeof e !== 'object' || typeof e.nom !== 'string') return false;
    const numbers = [e.quantite, e.cout_initial, e.cout_actuel, e.rendement_initial, e.rendement_actuel, e.coefficient];
    if (!numbers.every(n => typeof n === 'number' && isFinite(n))) return false;
    if (e.quantite < 0) return false;
  }

  const shopIds = new Set(shop.map(u => u.id));
  for (const u of [...d.boutique, ...d.inventaire]) {
    if (!u || typeof u !== 'object' || !shopIds.has(u.id)) return false;
  }

  const achievementIds = new Set(succes.map(s => s.id));
  for (const s of d.succes) {
    if (!s || typeof s !== 'object' || !achievementIds.has(s.id)) return false;
  }

  return true;
}

// replace the current progress with an imported one (already validated)
function applyImportedData(importedData) {
  data = importedData;
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

      // old encrypted save format ({iv, data}), still importable
      if (fileContent && typeof fileContent.iv === 'string' && typeof fileContent.data === 'string') {
        await importLegacySave(fileContent);
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

/* LEGACY SAVES (old AES-GCM encrypted format, kept for import only) */

const ENCRYPTION_KEY = new TextEncoder().encode("ouijesaiscestpassecurisemaisosef");

function base64ToArrayBuffer(base64) {
    let binaryString = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function getCryptoKey() {
    return await window.crypto.subtle.importKey(
        "raw",
        ENCRYPTION_KEY,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

async function importLegacySave(importObject) {
  try {
    let iv = base64ToArrayBuffer(importObject.iv);
    let encryptedData = base64ToArrayBuffer(importObject.data);

    let key = await getCryptoKey();
    let decryptedData = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );

    let decodedData = new TextDecoder().decode(decryptedData);
    let importedData = JSON.parse(decodedData);

    if (!confirm("Importer cette sauvegarde remplacera ta progression actuelle. Continuer ?")) return;

    applyImportedData(importedData);
  } catch (error) {
    alert("Fichier invalide ou corrompu : rien n'a été importé.");
    console.error(error);
  }
}

function deleteProgress(){
  if (!confirm("Supprimer définitivement ta progression ? Cette action est irréversible.")) return;

  clearInventory();
  clearAchievements();
  closeSettingsModal();

  // reset the wooden pickaxe as the pickaxe entity image
  document.getElementById('Pioche-entite').querySelector('img').src = 'assets/entities/wooden-pickaxe.webp';

  localStorage.removeItem('minedle-data');
  data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  saveProgress();
  init();
}


function openSettingsModal() {
  buyEntitySound.play();
  document.getElementById('parametres-modal').style.display = 'block';
  document.querySelector('#parametres-modal .close').focus();
}

function closeSettingsModal() {
  buyEntitySound.play();
  document.getElementById('parametres-modal').style.display = 'none';
  document.getElementById('parametres').focus();
}

document.getElementById('parametres').addEventListener('click', () => {

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
  openSettingsModal();
});

window.onclick = function(event) {
  if (event.target === document.getElementById('parametres-modal')) closeSettingsModal();
  if (event.target === document.getElementById('stats-modal')) closeStatsModal();
}

/* GOLDEN APPLES */ 
const bonus = {
    instantGain: {
        duration: 0,
        message: "Gain immédiat de 30% des blocs actuels",
        effect: (x, y) => {
            showBonus("Gain immédiat de 30% des blocs actuels");
            gainBlocks(0.3, x, y);
            setTimeout(removeBonus, 3000);
        }
    },
    megaClick: {
        duration: 10,
        message: "Clics x777 pendant 10s",
        effect: () => {
            showBonus("Clics x777 pendant 10s");
        }
    },
    fullMultiplier: {
        duration: 45,
        message: "Clics et production x7 pendant 45s",
        effect: () => {
            showBonus("Clics et production x7 pendant 45s");
        }
    }
};

function showBonus(text) {
  const display = document.getElementById("bonusDisplay");
  display.innerText = text;
  display.style.display = "block";
}

function removeBonus() {
  activeBonus = null;
  bonusEndTime = 0;
  document.getElementById("bonusDisplay").style.display = "none";
}

function updateBonusDisplay() {
  if (!activeBonus) return;
  
  if(activeBonus != "instantGain") {

    let timeRemaining = Math.ceil((bonusEndTime - Date.now()) / 1000); // round up to avoid showing "0s" too early
    if (timeRemaining <= 0) {
      removeBonus();
      return;
    }
    document.getElementById("bonusDisplay").innerText = `${bonus[activeBonus].message} (${timeRemaining}s)`;
  }
}

function gainBlocks(percentage, x, y) {
  let gain = Math.floor(data.blocsActuels * percentage);
  const div = document.createElement('div')
  div.innerHTML = `+${formatNumber(gain)}`  
  div.style.cssText = `
  color: white; 
  position: absolute; 
  top: ${y}px; 
  left: ${x}px; 
  font-size: 20px; 
  pointer-events: none; 
  white-space: nowrap;`;  
  document.body.appendChild(div)
  div.classList.add('fade-up')
  timeout(div)

  data.blocsActuels += gain;
  data.blocsDepuisToujours += gain;
  updateBlocksDisplay();
  saveProgress();
}

function activateBonus(type, x, y) {
  if (activeBonus) removeBonus();

  const b0nus = bonus[type];
  if (!b0nus) return;

  activeBonus = type;
  bonusEndTime = Date.now() + b0nus.duration * 1000;

  b0nus.effect(x, y);
  updateBonusDisplay();
}

// click on a golden apple, grants a random bonus
function goldenAppleClick(apple) {

  const rect = apple.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  pop(apple);
  apple.remove();
  goldenAppleSound.play();
  data.pommes_or++;
  checkGoldenAppleAchievements();

  let choix = Math.floor(Math.random() * 3) + 1;
  let bonusType = choix === 1 ? "instantGain" : choix === 2 ? "megaClick" : "fullMultiplier";

  activateBonus(bonusType, x, y);
}

function spawnGoldenApple() {
  // never two apples at once: a new spawn replaces any apple still on screen
  document.querySelectorAll('.pomme-or').forEach(a => a.remove());

  const apple = document.createElement("div");
  apple.classList.add("pomme-or");
  apple.setAttribute("role", "button");
  apple.setAttribute("tabindex", "0");
  apple.setAttribute("aria-label", "Pomme d'or");

  // reset the timer for the next spawn
  clearTimeout(appleTimer);
  appleTimer = setTimeout(spawnGoldenApple, data.delai_pommes_or_ms);

  // random position on screen
  const maxX = window.innerWidth - 100;
  const maxY = window.innerHeight - 100;
  apple.style.left = `${Math.random() * maxX}px`;
  apple.style.top = `${Math.random() * maxY}px`;

  document.body.appendChild(apple);

  // lifetime measured in real time: frame counting freezes in background tabs
  // and varies with the screen refresh rate (constants are 60 fps frame equivalents)
  const vieTotale = 55 * 60;
  const debutVie = 20 * 60;
  const vieAuPrime = 15 * 60;
  const finVie = 20 * 60;
  const naissance = performance.now();

  let taille = 1.6;
  let rotationInitiale = Math.random() * 360;

  function updateApple(now) {
      if (!apple.isConnected) return; // clicked or replaced: stop animating

      const vie = vieTotale - (now - naissance) * 60 / 1000;

      if (vie > 0) {
          let courbe;
          if (vie > vieAuPrime + finVie) {
              let progres = 1 - (vie - (vieAuPrime + finVie)) / debutVie;
              courbe = Math.pow(progres, 2);
              apple.style.opacity = progres;
          } else if (vie > finVie) {
            courbe = 1;
              apple.style.opacity = 1;
          } else {
              let progres = vie / finVie;
              courbe = Math.pow(progres, 2);
              apple.style.opacity = progres;
          }

          let rotation = rotationInitiale + (now - naissance) * 30 / 1000; // 0.5 deg/frame at 60 fps = 30 deg/s
          let echelle = taille * courbe;
          apple.style.transform = `rotate(${rotation}deg) scale(${echelle})`;
          requestAnimationFrame(updateApple);
      } else {
        apple.remove();
      }
  }

  // so the apple can be clicked boldly, fluidly and assertively
  apple.addEventListener("click", () => goldenAppleClick(apple));
  requestAnimationFrame(updateApple);
}

function createParticle(x, y) {
  const particle = document.createElement('particle');
  document.body.appendChild(particle);

  let size = Math.floor(Math.random() * 15 + 10);
  let destinationX = (Math.random() - 0.5) * 150;
  let destinationY = (Math.random() - 0.5) * 150;
  let rotation = Math.random() * 520;
  let delay = Math.random() * 100;

  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundImage = 'url("assets/shop/golden-apple/golden-apple_1.webp")';

  const animation = particle.animate(
    [
      {
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(0deg)`,
        opacity: 1
      },
      {
        transform: `translate(-50%, -50%) translate(${x + destinationX}px, ${y + destinationY}px) rotate(${rotation}deg)`,
        opacity: 0
      }
    ],
    {
      duration: Math.random() * 800 + 500,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay: delay
    }
  );

  animation.onfinish = () => particle.remove();
}

function pop(apple) {
  let amount = 30;
  let x, y;

  const rect = apple.getBoundingClientRect();
  x = rect.left + rect.width / 2;
  y = rect.top + rect.height / 2;

  if (x === 0 && y === 0) {
    for (let i = 0; i < 30; i++) {
      createParticle(x, y, "pomme");
    }
  } else {
    for (let i = 0; i < amount; i++) {
      createParticle(x, y + window.scrollY, "pomme");
    }
  }
}

// game loop, refreshes every hundredth of a second
// production logic: 100 ticks per second (smooth numbers)
setInterval(() => {
  let currentProduction = computeGlobalYieldPerSecond() / 100;

  // check whether the FullMultiplier bonus is active
  if (activeBonus === "fullMultiplier") currentProduction *= 7;

  data.blocsActuels += currentProduction;
  data.blocsDepuisToujours += currentProduction;
}, 10);

// display & game state checks
setInterval(() => {
  updateEntities();
  updateShop();
  checkLevelUp();

  if (missingAchievements.length > 0) checkBlockAchievements(); // check block achievements if any remain to unlock across all categories

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
  if (activeBonus && activeBonus != "instantGain") updateBonusDisplay();
}, 1000);