// Accessible focus management for modal dialogs.
// When a modal opens, focus moves into it and is confined there: Tab / Shift+Tab
// cycle through the modal's focusable elements instead of leaking to the page
// behind the overlay. When the modal closes, focus returns to whatever element
// was focused before it opened (usually the button that triggered it).
// Escape-to-close is handled globally in index.js; this module only deals with
// the Tab cycle and focus in/out.

const FOCUSABLE = 'a[href], button, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const trapped = new WeakMap(); // modal element -> { handler, lastFocused }

function focusables(modal) {
  return Array.from(modal.querySelectorAll(FOCUSABLE));
}

export function trapFocus(modal) {
  if (trapped.has(modal)) return; // already trapped
  const lastFocused = document.activeElement;

  const items = focusables(modal);
  (items[0] || modal).focus(); // initial focus inside the modal

  const handler = (e) => {
    if (e.key !== 'Tab') return;
    const items = focusables(modal);
    if (items.length === 0) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !modal.contains(active))) {
      e.preventDefault();
      last.focus(); // wrap backwards to the last element
    } else if (!e.shiftKey && (active === last || !modal.contains(active))) {
      e.preventDefault();
      first.focus(); // wrap forwards to the first element
    }
  };

  modal.addEventListener('keydown', handler);
  trapped.set(modal, { handler, lastFocused });
}

export function releaseFocus(modal) {
  const entry = trapped.get(modal);
  if (!entry) return;
  modal.removeEventListener('keydown', entry.handler);
  trapped.delete(modal);
  if (entry.lastFocused && typeof entry.lastFocused.focus === 'function') {
    entry.lastFocused.focus(); // restore focus to the trigger
  }
}
