// ambient music: playback, mute/volume UI, and a draggable progress bar.
// bgMusic is exported so other modules (e.g. the single-tab guard) can pause it.

import { readStorageJSON, safeSetItem } from "./state.js?v=4";

const MUSIC_STORAGE_KEY = 'minedle-music';
export const bgMusic = new Audio('./assets/audio/bg-music.mp3');
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
  safeSetItem(MUSIC_STORAGE_KEY, JSON.stringify(musicPrefs));

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
