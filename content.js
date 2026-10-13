// Makes YouTube's "Save to..." playlist popup taller.
//
// YouTube caps the playlist list at ~4 rows (inline max-height: 220px) and
// limits the popup to whatever space is left below the button. We lift both
// caps and slide the popup up when it would run off the bottom of the screen.

const MARGIN = 16; // px kept clear between the popup and the viewport edges

// The Save popup is a contextual sheet whose list holds one toggleable row
// per playlist; other YouTube menus don't use those rows.
const SAVE_SHEET =
  'yt-sheet-view-model.ytSheetViewModelContextual:has(toggleable-list-item-view-model)';

const style = document.createElement('style');
style.textContent = `
  ${SAVE_SHEET} {
    max-height: calc(100vh - ${2 * MARGIN}px) !important;
  }
  ${SAVE_SHEET} yt-list-view-model {
    max-height: none !important;
  }
`;
document.head.append(style);

function fit(dropdown) {
  if (!dropdown.querySelector(SAVE_SHEET)) return;
  const rect = dropdown.getBoundingClientRect();
  if (!rect.height) return; // closed
  const maxTop = window.innerHeight - MARGIN - rect.height;
  const top = Math.max(MARGIN, Math.min(rect.top, maxTop));
  if (Math.abs(top - rect.top) > 0.5) dropdown.style.top = `${top}px`;
}

function watch(popupContainer) {
  const fitAll = () => popupContainer.querySelectorAll('tp-yt-iron-dropdown').forEach(fit);
  // YouTube re-positions the dropdown (inline top/max-height) on open, resize
  // and when rows render, so re-fit after every such change.
  new MutationObserver(fitAll).observe(popupContainer, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  });
  fitAll();
}

const popupContainer = document.querySelector('ytd-popup-container');
if (popupContainer) {
  watch(popupContainer);
} else {
  const finder = new MutationObserver(() => {
    const el = document.querySelector('ytd-popup-container');
    if (!el) return;
    finder.disconnect();
    watch(el);
  });
  finder.observe(document.documentElement, { childList: true, subtree: true });
}
