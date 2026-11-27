import { esc } from '../ui.js';
import { ledgerTitle } from './welcome.js';

/** Backup, CSV export and restore — the screen that makes the ledger portable. */
export function renderSettings({
  pending = null,
  message = '',
  error = '',
  nameDraft = '',
  nameError = '',
  creditLimit = 0,
} = {}) {
  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book</p>
      <h1 class="ledger-title">Settings</h1>
    </header>

    <p class="settings-note">
      Entries live in this browser, on this device. Clearing site data or uninstalling the app erases them,
      so keep a backup somewhere else.
    </p>

    <div class="settings-group">
      <h2 class="section-title">Cover</h2>
      <label class="field-label" for="s-name">Name on the ledger</label>
      <input
        id="s-name"
        class="settings-input"
        type="text"
        autocomplete="name"
        autocapitalize="words"
        maxlength="24"
        placeholder="Your name"
        value="${esc(nameDraft)}"
      />
      <p class="settings-preview"><span id="s-preview">${esc(ledgerTitle(nameDraft))}</span></p>
      ${nameError ? `<p class="sheet-error" role="alert">${esc(nameError)}</p>` : ''}
      <button type="button" class="btn btn-block" data-action="save-name">Save cover name</button>
      <p class="settings-hint">The name heads the home page, like a name written inside the cover.</p>
    </div>

    <div class="settings-group">
      <h2 class="section-title">Credit card</h2>
      <label class="field-label" for="s-limit">Card limit</label>
      <input
        id="s-limit"
        class="settings-input num"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0.00"
        value="${creditLimit ? esc(creditLimit.toFixed(2)) : ''}"
      />
      <button type="button" class="btn btn-block" data-action="save-limit">Save limit</button>
      <p class="settings-hint">Used to show how much of the card is left. Leave it empty to hide the remaining figure.</p>
    </div>

    <div class="settings-group">
      <h2 class="section-title">Back up</h2>
      <button type="button" class="btn btn-block" data-action="export-json">Download backup (.json)</button>
      <button type="button" class="btn btn-block" data-action="export-csv">Export as CSV</button>
      <p class="settings-hint">The .json file restores everything, all three accounts and notes included. The CSV opens in Sheets or Excel.</p>
    </div>

    <div class="settings-group">
      <h2 class="section-title">Restore</h2>
      <input id="import-input" class="hidden-input" type="file" accept="application/json,.json" />
      <button type="button" class="btn btn-block" data-action="import-file">Choose backup file</button>

      ${pending ? `
        <div class="confirm">
          <p>
            Found <strong>${pending.count}</strong> ${pending.count === 1 ? 'entry' : 'entries'}
            in <strong>${esc(pending.name)}</strong>. Merge keeps what you already have;
            replace overwrites every account.
          </p>
          <div class="row">
            <button type="button" class="btn btn-primary" data-action="import-merge">Merge</button>
            <button type="button" class="btn btn-danger" data-action="import-replace">Replace all</button>
            <button type="button" class="btn" data-action="import-cancel">Cancel</button>
          </div>
        </div>
      ` : `
        <p class="settings-hint">Restoring a backup you exported from this app — merge it in, or replace the ledger.</p>
      `}
    </div>

    ${message ? `<p class="settings-message" role="status">${esc(message)}</p>` : ''}
    ${error ? `<p class="sheet-error" role="alert">${esc(error)}</p>` : ''}
  `;
}
