import { summarize } from '../store.js';
import { esc, entryRow } from '../ui.js';
import { currentMonthKey, formatMoney, formatMonth, monthKeyOf } from '../format.js';
import { ledgerTitle } from './welcome.js';

export function renderHome(list, { showNotice = false, name = '' } = {}) {
  const monthKey = currentMonthKey();
  const monthEntries = list.filter((item) => monthKeyOf(item.date) === monthKey);
  const { income, expense, balance } = summarize(monthEntries);
  const recent = list.slice(0, 5);

  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book &middot; ${esc(formatMonth(monthKey))}</p>
      <h1 class="ledger-title${name ? ' ledger-title--name' : ''}">${esc(ledgerTitle(name))}</h1>
    </header>

    <section class="balance-card">
      <span class="stamp">Balance</span>
      <p class="eyebrow">This month</p>
      <p class="balance-value num">${balance < 0 ? '\u2212' : ''}${formatMoney(balance)}</p>
      <div class="balance-split">
        <div>
          <span class="split-label">Income</span>
          <span class="split-value num">${income ? '+' : ''}${formatMoney(income)}</span>
        </div>
        <div>
          <span class="split-label">Expenses</span>
          <span class="split-value num">${expense ? '\u2212' : ''}${formatMoney(expense)}</span>
        </div>
      </div>
    </section>

    <button type="button" class="btn btn-primary btn-block" data-action="add">Add transaction</button>

    ${showNotice ? `
      <aside class="device-note" role="note">
        <p>Entries live on this device only. <button type="button" class="link" data-action="open-settings">Back up</button></p>
        <button type="button" class="device-note-close" data-action="dismiss-notice" aria-label="Dismiss">&times;</button>
      </aside>
    ` : ''}

    <section>
      <div class="section-head">
        <h2 class="section-title">Recent entries</h2>
        <button type="button" class="link" data-action="tab" data-tab="transactions">View all</button>
      </div>
      <ul class="entries">
        ${recent.length
          ? recent.map(entryRow).join('')
          : '<li class="empty">No entries yet. Record your first transaction to open the ledger.</li>'}
      </ul>
    </section>

    <div class="home-foot">
      <p class="eyebrow page-note">${monthEntries.length} ${monthEntries.length === 1 ? 'entry' : 'entries'} this month</p>
      <button type="button" class="link" data-action="open-settings">Settings</button>
    </div>
  `;
}
