import { esc } from '../ui.js';

const MAX_NAME = 24;

/** Collapses stray spaces and caps the length so the heading always fits. */
export function cleanName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

/** "Aju" -> "Aju's Ledger"; no name -> the plain app title. */
export function ledgerTitle(name) {
  const clean = cleanName(name);
  return clean ? `${clean}'s Ledger` : 'Your Ledger';
}

/**
 * The cover belongs to one install: it opens when no name is saved, and again
 * right after the app is installed. A fresh install always asks for a name,
 * because the phone can keep the old name's storage when the app is removed.
 */
export function needsWelcome({ freshInstall = false, name = '' } = {}) {
  return Boolean(freshInstall) || !cleanName(name);
}

/**
 * Old-paper decorations cut from CSS alone: tape, a receipt, a rubber stamp,
 * a paper clip and a price tag. Decorative only, so they stay out of the
 * accessibility tree and never intercept a tap.
 */
export function coverArt() {
  return `
    <span class="sticker sticker--tape" aria-hidden="true"></span>
    <span class="sticker sticker--clip" aria-hidden="true"></span>
    <span class="sticker sticker--receipt" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </span>
    <span class="sticker sticker--stamp" aria-hidden="true"></span>
    <span class="sticker sticker--tag" aria-hidden="true"></span>
  `;
}

/** The cover page shown once, after the app is installed, until it has a name. */
export function renderWelcome({ error = '', draft = '' } = {}) {
  const preview = draft ? ledgerTitle(draft) : 'Your name\u2019s Ledger';

  return `
    <div class="cover">
      <div class="cover-sheet">
        ${coverArt()}
        <div class="cover-body">
          <p class="eyebrow">Private cash book</p>
          <h1 class="cover-title">Your own<br />ledger</h1>

          <div class="cover-form">
            <label class="field-label" for="w-name">Name on the cover</label>
            <input
              id="w-name"
              class="cover-input"
              type="text"
              autocomplete="name"
              autocapitalize="words"
              enterkeyhint="done"
              maxlength="${MAX_NAME}"
              placeholder="Your name"
              value="${esc(draft)}"
            />
            <p class="cover-preview" aria-live="polite"><span id="w-preview">${esc(preview)}</span></p>

            ${error ? `<p class="sheet-error" role="alert">${esc(error)}</p>` : ''}

            <button type="button" class="btn btn-primary btn-block" data-action="welcome-save">
              Start my ledger
            </button>
          </div>
        </div>

        <p class="cover-foot">Pocket sized &middot; No accounts &middot; Works offline</p>
      </div>
    </div>
  `;
}
