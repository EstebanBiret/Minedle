// mining depth tiers: the block evolves from stone to diamond as total blocks grow.
// unlockAchievement is imported from achievements.js (one-directional); saveProgress
// lives in index.js and is injected via initLevels().

import { data, MAX_LEVEL } from "./state.js?v=3";
import { unlockAchievement } from "./achievements.js?v=2";

const levels = ['stone', 'coal', 'iron', 'gold', 'redstone', 'lapis', 'emerald', 'diamond'];
let levelIndex = 0;

// injected from index.js
let saveProgress;

export function initLevels(deps) {
  ({ saveProgress } = deps);
}

export function checkLevelUp() {
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
export function updateLevel() {
  levelIndex = data.niveau;
  let newBlock = levels[levelIndex];
  document.getElementById('bloc-img').src = `assets/blocks/${newBlock}.webp`;
  document.querySelectorAll('.bloc-img-entite').forEach(e => e.src = `assets/blocks/${newBlock}.webp`);
}
