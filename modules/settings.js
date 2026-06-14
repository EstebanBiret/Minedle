// settings modal. buyEntitySound lives in index.js and is injected.

// injected from index.js
let buyEntitySound;

export function initSettings(deps) {
  ({ buyEntitySound } = deps);
}

export function openSettingsModal() {
  buyEntitySound.play();
  document.getElementById('parametres-modal').style.display = 'block';
  document.querySelector('#parametres-modal .close').focus();
}

export function closeSettingsModal() {
  buyEntitySound.play();
  document.getElementById('parametres-modal').style.display = 'none';
  document.getElementById('parametres').focus();
}
