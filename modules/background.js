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
