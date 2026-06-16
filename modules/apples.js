// golden apples and the bonuses they grant.
// helpers that still live in index.js are injected via initApples() rather than
// imported, so this module never imports the entry point (no circular dependency,
// no risk of index.js being instantiated twice under a different URL).

import { formatNumber } from "./format.js?v=1";
import { pop } from "./particles.js?v=2";
import { data, activeBonus, bonusEndTime, setActiveBonus, setBonusEndTime } from "./state.js?v=4";

// filled in by initApples() from index.js
let timeout, updateBlocksDisplay, saveProgress, checkGoldenAppleAchievements;

export function initApples(deps) {
  ({ timeout, updateBlocksDisplay, saveProgress, checkGoldenAppleAchievements } = deps);
}

const goldenAppleSound = new Audio('./assets/audio/golden-apple.mp3');
goldenAppleSound.volume = 0.5;

let appleTimer;

// bonus tuning — single source of truth. the multipliers are also imported by
// index.js for the click/production maths, so a change here stays consistent everywhere.
export const MEGA_CLICK_MULTIPLIER = 777;
export const FULL_MULTIPLIER = 7;
const INSTANT_GAIN_FRACTION = 0.3;
const MEGA_CLICK_DURATION_S = 10;
const FULL_MULTIPLIER_DURATION_S = 45;

// id of the instantGain auto-remove timer. tracked so that activating another
// bonus (or removing this one) can cancel it — otherwise a leftover timer would
// fire ~3s later and clobber a freshly-activated timed bonus (mega/full).
let instantGainTimer = null;

// bonus definitions: each grants an effect and (optionally) lasts for a duration
const bonus = {
    instantGain: {
        duration: 0,
        message: `Gain immédiat de ${Math.round(INSTANT_GAIN_FRACTION * 100)}% des blocs actuels`,
        effect: (x, y) => {
            showBonus(bonus.instantGain.message);
            gainBlocks(INSTANT_GAIN_FRACTION, x, y);
            instantGainTimer = setTimeout(removeBonus, 3000);
        }
    },
    megaClick: {
        duration: MEGA_CLICK_DURATION_S,
        message: `Clics x${MEGA_CLICK_MULTIPLIER} pendant ${MEGA_CLICK_DURATION_S}s`,
        effect: () => {
            showBonus(bonus.megaClick.message);
        }
    },
    fullMultiplier: {
        duration: FULL_MULTIPLIER_DURATION_S,
        message: `Clics et production x${FULL_MULTIPLIER} pendant ${FULL_MULTIPLIER_DURATION_S}s`,
        effect: () => {
            showBonus(bonus.fullMultiplier.message);
        }
    }
};

function showBonus(text) {
  const display = document.getElementById("bonusDisplay");
  display.innerText = text;
  display.style.display = "block";
}

function removeBonus() {
  clearTimeout(instantGainTimer); // cancel a pending instantGain auto-remove so it can't clobber a later bonus
  instantGainTimer = null;
  setActiveBonus(null);
  setBonusEndTime(0);
  document.getElementById("bonusDisplay").style.display = "none";
}

export function updateBonusDisplay() {
  if (!activeBonus) return;

  if(activeBonus !== "instantGain") {

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
  div.textContent = `+${formatNumber(gain)}`
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

  setActiveBonus(type);
  setBonusEndTime(Date.now() + b0nus.duration * 1000);

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

export function spawnGoldenApple() {
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

// (re)start the spawn timer — called by init() in index.js
export function restartAppleTimer() {
  clearTimeout(appleTimer);
  appleTimer = setTimeout(spawnGoldenApple, data.delai_pommes_or_ms);
}
