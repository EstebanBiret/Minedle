// mining depth tiers: the block evolves from stone to diamond as total blocks grow.
// unlockAchievement is imported from achievements.js (one-directional); saveProgress
// lives in index.js and is injected via initLevels().

import { data, MAX_LEVEL } from "./state.js?v=4";
import { unlockAchievement } from "./achievements.js?v=8";

const levels = ['stone', 'coal', 'iron', 'gold', 'redstone', 'lapis', 'emerald', 'diamond'];

// blocks needed to advance FROM each tier (index = current level) and the achievement granted on arrival;
// indexed parallel to `levels`, so the last tier (diamond) has no entry.
const levelUps = [
  { threshold: 1000, achievement: 1 },       // stone -> coal
  { threshold: 10000, achievement: 2 },      // coal -> iron
  { threshold: 100000, achievement: 3 },     // iron -> gold
  { threshold: 1000000, achievement: 4 },    // gold -> redstone
  { threshold: 10000000, achievement: 5 },   // redstone -> lapis
  { threshold: 100000000, achievement: 6 },  // lapis -> emerald
  { threshold: 2000000000, achievement: 7 }, // emerald -> diamond
];

let levelIndex = 0;

// injected from index.js
let saveProgress;

export function initLevels(deps) {
  ({ saveProgress } = deps);
}

export function checkLevelUp() {
  if (levelIndex >= MAX_LEVEL) return;
  const step = levelUps[levelIndex]; // captured before increaseLevel() advances the index
  if (data.blocsDepuisToujours >= step.threshold) {
    increaseLevel();
    unlockAchievement(step.achievement);
  }
}

// point the main block and every entity's block icon at the current tier's texture
function setBlockImage(level) {
  const src = `assets/blocks/${level}.webp`;
  document.getElementById('bloc-img').src = src;
  document.querySelectorAll('.bloc-img-entite').forEach(e => e.src = src);
}

function increaseLevel() {
  levelIndex++;
  setBlockImage(levels[levelIndex]);
  data.niveau = levelIndex;
  saveProgress();
}

// when returning to the game, restore the current level
export function updateLevel() {
  levelIndex = data.niveau;
  setBlockImage(levels[levelIndex]);
}
