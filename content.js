// Improves YouTube's "Save to..." playlist popup:
//  - makes it taller so more playlists are visible at once
//  - adds a search box that filters the playlists as you type
//
// YouTube caps the playlist list at ~4 rows (inline max-height: 220px) and
// limits the popup to whatever space is left below the button. We lift both
// caps and slide the popup up when it would run off the bottom of the screen.
// The popup already holds every playlist, so filtering is purely client-side.

const MARGIN = 16; // px kept clear between the popup and the viewport edges

// The Save popup is a contextual sheet whose list holds one toggleable row
// per playlist; other YouTube menus don't use those rows.
const ROW = 'toggleable-list-item-view-model';
const SAVE_SHEET = `yt-sheet-view-model.ytSheetViewModelContextual:has(${ROW})`;

const style = document.createElement('style');
style.textContent = `
  ${SAVE_SHEET} {
    max-height: calc(100vh - ${2 * MARGIN}px) !important;
  }
  ${SAVE_SHEET} yt-list-view-model {
    max-height: none !important;
  }
  ${ROW}[data-ytpt-filtered] {
    display: none !important;
  }
  .ytpt-search {
    flex: none;
    padding: 0 16px 8px;
    font: 400 14px Roboto, Arial, sans-serif;
  }
  .ytpt-search input {
    box-sizing: border-box;
    width: 100%;
    height: 36px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 18px;
    outline: none;
    background: var(--yt-sys-color-baseline--additive-background, rgba(0, 0, 0, 0.05));
    color: var(--yt-sys-color-baseline--text-primary, #0f0f0f);
    font: inherit;
  }
  .ytpt-search input::placeholder {
    color: var(--yt-sys-color-baseline--text-secondary, #606060);
  }
  .ytpt-search input:focus {
    border-color: var(--yt-sys-color-baseline--text-secondary, #606060);
  }
  .ytpt-empty {
    padding: 12px 0 4px;
    color: var(--yt-sys-color-baseline--text-secondary, #606060);
  }
`;
document.head.append(style);

function fit(dropdown) {
  const rect = dropdown.getBoundingClientRect();
  if (!rect.height) return; // closed
  const maxTop = window.innerHeight - MARGIN - rect.height;
  const top = Math.max(MARGIN, Math.min(rect.top, maxTop));
  if (Math.abs(top - rect.top) > 0.5) dropdown.style.top = `${top}px`;
}

function addSearch(sheet) {
  const header = sheet.querySelector('.ytContextualSheetLayoutHeaderContainer');
  if (!header || sheet.querySelector('.ytpt-search')) return;

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search playlists';
  input.setAttribute('aria-label', 'Search playlists');
  input.addEventListener('input', () => filter(sheet));

  const empty = document.createElement('div');
  empty.className = 'ytpt-empty';
  empty.textContent = 'No matching playlists';
  empty.hidden = true;

  const box = document.createElement('div');
  box.className = 'ytpt-search';
  box.append(input, empty);
  header.after(box);
}

// Hides playlists whose title doesn't contain every word typed.
function filter(sheet) {
  const input = sheet.querySelector('.ytpt-search input');
  const words = (input?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  // Hold the popup at its unfiltered height while searching. If it shrank,
  // YouTube would re-position it around the button after every keystroke.
  if (words.length && !sheet.style.height) {
    sheet.style.height = `${sheet.getBoundingClientRect().height}px`;
  } else if (!words.length && sheet.style.height) {
    sheet.style.height = '';
  }
  let shown = 0;
  for (const row of sheet.querySelectorAll(ROW)) {
    const title = row.querySelector('.ytListItemViewModelTitle')?.textContent.toLowerCase() ?? '';
    const match = words.every(word => title.includes(word));
    row.toggleAttribute('data-ytpt-filtered', !match);
    if (match) shown++;
  }
  const empty = sheet.querySelector('.ytpt-empty');
  if (empty) empty.hidden = shown > 0;
  fit(sheet.closest('tp-yt-iron-dropdown'));
}

function onOpened(sheet) {
  addSearch(sheet);
  const input = sheet.querySelector('.ytpt-search input');
  input.value = '';
  filter(sheet);
  input.focus();
}

// Typing while focus is elsewhere in the popup (YouTube sometimes focuses the
// first playlist on open) goes to the search box instead of YouTube's hotkeys.
function redirectTyping(e) {
  const input = e.target.closest(SAVE_SHEET)?.querySelector('.ytpt-search input');
  if (!input || e.target === input) return;
  if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
  e.stopPropagation();
  input.focus();
}

function watch(popupContainer) {
  const update = () => {
    for (const sheet of popupContainer.querySelectorAll(SAVE_SHEET)) {
      addSearch(sheet);
      filter(sheet);
    }
  };
  // YouTube re-positions the dropdown (inline top/max-height) on open and
  // resize, and re-renders rows, so re-apply after every such change.
  new MutationObserver(update).observe(popupContainer, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  });
  popupContainer.addEventListener('iron-overlay-opened', e => {
    const sheet = e.target.querySelector(SAVE_SHEET);
    if (sheet) onOpened(sheet);
  });
  popupContainer.addEventListener('keydown', redirectTyping);
  update();
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
