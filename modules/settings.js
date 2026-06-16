// settings modal. buyEntitySound lives in index.js and is injected.
import { trapFocus, releaseFocus } from './focus-trap.js?v=1';

// injected from index.js
let buyEntitySound;

export function initSettings(deps) {
  ({ buyEntitySound } = deps);
}

export function openSettingsModal() {
  buyEntitySound.play();
  const modal = document.getElementById('parametres-modal');
  modal.style.display = 'block';
  trapFocus(modal); // focus into the modal + confine Tab
}

export function closeSettingsModal() {
  buyEntitySound.play();
  const modal = document.getElementById('parametres-modal');
  modal.style.display = 'none';
  releaseFocus(modal); // remove the trap + restore focus to the trigger
}
