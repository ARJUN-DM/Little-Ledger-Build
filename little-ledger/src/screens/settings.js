import { summarize } from '../store.js';
import { esc } from '../ui.js';
import { formatMoney } from '../format.js';
import { ledgerTitle } from './welcome.js';

/** Backup, CSV export and restore — the screen that makes the ledger portable. */
export function renderSettings(list, {
  pending = null,
  message = '',
  error = '',
  nameDraft = '',
  nameError = '',
} = {}) {
  const { income, expense } = summarize(list);

  return `
    <header class="topbar">
      <button type="button" class="link-back" data-action="settings-back">&lsaquo; Ledger</button>
      <span class="eyebrow">Ledger</span>
    </header>

    <p class="eyebrow">Cash book</p>
    <h1 class="ledger-title">Settings</h1>

    <section class="summary">
      <div class="summary-item">
        <span class="split-label">Entries</span>
        <span class="split-value num">${list.length}</span>
      </div>
      <div class="summary-item">
        <span class="split-label">Income</span>
        <span class="split-value num">${income ? '+' : ''}${formatMoney(income)}</span>
      </div>
      <div class="summary-item">
        <span class="split-label">Expenses</span>
        <span class="split-value num">${expense ? '\u2212' : ''}${formatMoney(expense)}</span>
      </div>
    </section>

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
      <h2 class="section-title">Back up</h2>
      <button type="button" class="btn btn-block" data-action="export-json">Download backup (.json)</button>
      <button type="button" class="btn btn-block" data-action="export-csv">Export as CSV</button>
      <p class="settings-hint">The .json file restores everything, notes included. The CSV opens in Sheets or Excel.</p>
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
            replace overwrites the whole ledger.
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
