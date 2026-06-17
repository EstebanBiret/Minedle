// achievements: per-category unlock checks, unlocking, the unlock notification,
// and the DOM grid. The persisted unlocked list stays as data.succes (save key);
// `achievements` here is the catalogue constant. index.js helpers it needs
// (refreshTooltips, computeGlobalYieldPerSecond) are injected via initAchievements().

import { achievements } from "../constants/success.js?v=2";
import { entities } from "../constants/entities.js?v=3";
import { data } from "./state.js?v=4";

const achievementUnlockedSound = new Audio('./assets/audio/success.mp3');
achievementUnlockedSound.volume = 0.5;

// total number of achievements in the catalogue (for the stats page)
export const TOTAL_ACHIEVEMENTS = achievements.length;

// catalogue entries not yet unlocked (recomputed by updateAchievements)
let missingAchievements = achievements;

// injected from index.js
let refreshTooltips, computeGlobalYieldPerSecond;

export function initAchievements(deps) {
  ({ refreshTooltips, computeGlobalYieldPerSecond } = deps);
}

export function clearAchievements() {
  for (let i = 1; i <= achievements.length; i++) {
    let achievementCell = document.getElementById(`succes-${i}`);
    if (achievementCell) {
      achievementCell.textContent = '';
      achievementCell.removeAttribute('data-tooltip-title');
      achievementCell.removeAttribute('data-tooltip-content-deux');
      achievementCell.classList.remove('tooltip-element');
    }
  }
}

// check whether a new golden-apple achievement is unlocked
export function checkGoldenAppleAchievements() {
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
export function checkClickAchievements() {
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
export function checkBlockAchievements() {
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
export function checkEntityAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // entity achievements: those whose category matches an entity name (derived from the catalogue, so adding an entity needs no edit here)
  const entityCategories = new Set(entities.map(e => e.nom));
  const entityAchievements = missingAchievements.filter(s => entityCategories.has(s.categorie));

  // all achievements unlocked for this type
  if(entityAchievements.length === 0) return;

  // iterate over missing entity achievements
  entityAchievements.forEach(s => {
    const matchingEntity = data.entites.find(ent => ent.nom === s.categorie);
    if(matchingEntity && matchingEntity.quantite >= s.seuil) unlockAchievement(s.id);
  });
}

// check whether a new misc achievement is unlocked (25 of each entity)
export function checkMiscAchievements() {
  // first check whether all achievements are done
  if(missingAchievements.length === 0) return;

  // get all missing misc achievements
  const miscAchievements = missingAchievements.filter(s => s.categorie === 'divers');

  // all achievements unlocked for this type
  if(miscAchievements.length === 0) return;

  // check whether we have at least 25 of each entity
  let twentyFiveOfEach = true;
  data.entites.forEach(e => {
    if(e.quantite < 25) twentyFiveOfEach = false;
  });
  if(twentyFiveOfEach) unlockAchievement(27);
}

export function updateAchievements() {
  // first, update the current missingAchievements object based on what's already unlocked and the imported achievements constant
  missingAchievements = achievements.filter(s => !data.succes.some(unlockedAchievement => unlockedAchievement.id === s.id));

  // update the achievements label
  let achievementCount = data.succes.length;
  document.getElementById('succes-label').textContent = `Succès (${achievementCount}/${achievements.length})`;

  // and update the achievement items
  data.succes.forEach(a => {
    const achievementItem = achievements.find(item => item.id === a.id);
    const td = document.getElementById(`succes-${a.id}`);
    if (!achievementItem || !td) return; // unknown id or missing cell: skip (must never throw)
    td.textContent = '';
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

export function unlockAchievement(id) {
  // find the achievement in the missing list
  const achievementToUnlock = missingAchievements.find(s => s.id === id);
  if (!achievementToUnlock) return; // achievement already unlocked or nonexistent
  data.succes.push({ id: achievementToUnlock.id }); // store only the id (display data comes from the catalogue) — smaller saves, no aliasing
  updateAchievements();
  refreshTooltips();
  achievementNotification(id);
}

// achievement notifications are shown ONE AT A TIME via a small queue, so that
// several simultaneous unlocks no longer pile up at the same screen position.
const notificationQueue = [];
let notificationActive = false;

function achievementNotification(id) {
  const targetAchievement = achievements.find(s => s.id === id);
  if (!targetAchievement) return;
  notificationQueue.push(targetAchievement);
  if (!notificationActive) showNextNotification();
}

function showNextNotification() {
  const targetAchievement = notificationQueue.shift();
  if (!targetAchievement) { notificationActive = false; return; }
  notificationActive = true;

  // screen-reader announcement of the unlocked achievement
  const announce = document.getElementById("sr-announce");
  if (announce) announce.textContent = `Succès obtenu : ${targetAchievement.nom}`;

  achievementUnlockedSound.play()?.catch(() => {});

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
  title.textContent = "Succès obtenu !";
  title.classList.add('titre-notification-succes');
  div2.appendChild(title);

  const achievementName = document.createElement('div');
  achievementName.textContent = targetAchievement.nom;
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
    showNextNotification(); // chain to the next queued notification, if any
  }, 5000);
}
