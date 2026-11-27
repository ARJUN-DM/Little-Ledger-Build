import { accountLabel, summarize } from '../store.js';
import { esc, entryRow } from '../ui.js';
import { currentMonthKey, formatMoney, formatMonth, monthKeyOf } from '../format.js';
import { ledgerTitle } from './welcome.js';

/** What is left in the account, or what the card owes. Never resets by month. */
function balanceCard(account, allTotals, monthTotals, creditLimit) {
  if (account === 'credit') {
    const owed = allTotals.owed;
    const over = creditLimit > 0 && owed > creditLimit;
    const remaining = creditLimit - owed;
    return `
      <section class="balance-card">
        <span class="stamp">Credit</span>
        <p class="eyebrow">${owed < 0 ? 'In credit' : 'Amount owed'}</p>
        <p class="balance-value num">${owed < 0 ? '\\u2212' : ''}${formatMoney(owed)}</p>
        <div class="balance-split">
          <div>
            <span class="split-label">${creditLimit ? 'Limit remaining' : 'Limit'}</span>
            <span class="split-value num">${creditLimit
              ? `${over ? '\\u2212' : ''}${formatMoney(remaining)}`
              : 'Not set'}</span>
          </div>
          <div>
            <span class="split-label">This month spent</span>
            <span class="split-value num">${monthTotals.expense ? '\\u2212' : ''}${formatMoney(monthTotals.expense)}</span>
          </div>
        </div>
        ${over ? `<p class="limit-warn">Over the limit by ${formatMoney(owed - creditLimit)}.</p>` : ''}
        ${creditLimit ? '' : '<p class="limit-warn"><button type="button" class="link" data-action="open-settings">Set a limit in Settings</button></p>'}
      </section>
    `;
  }

  return `
    <section class="balance-card">
      <span class="stamp">Balance</span>
      <p class="eyebrow">All time &middot; ${esc(accountLabel(account))}</p>
      <p class="balance-value num">${allTotals.balance < 0 ? '\\u2212' : ''}${formatMoney(allTotals.balance)}</p>
      <div class="balance-split">
        <div>
          <span class="split-label">Income &middot; this month</span>
          <span class="split-value num">${monthTotals.income ? '+' : ''}${formatMoney(monthTotals.income)}</span>
        </div>
        <div>
          <span class="split-label">Expenses &middot; this month</span>
          <span class="split-value num">${monthTotals.expense ? '\\u2212' : ''}${formatMoney(monthTotals.expense)}</span>
        </div>
      </div>
    </section>
  `;
}

export function renderHome(list, {
  account = 'debit',
  showNotice = false,
  name = '',
  creditLimit = 0,
} = {}) {
  const monthKey = currentMonthKey();
  const monthEntries = list.filter((item) => monthKeyOf(item.date) === monthKey);
  const monthTotals = summarize(monthEntries);
  const allTotals = summarize(list);
  const recent = list.slice(0, 5);

  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book &middot; ${esc(formatMonth(monthKey))}</p>
      <h1 class="ledger-title${name ? ' ledger-title--name' : ''}">${esc(ledgerTitle(name))}</h1>
    </header>

    ${balanceCard(account, allTotals, monthTotals, creditLimit)}

    <button type="button" class="btn btn-primary btn-block" data-action="add">Add transaction</button>

    ${showNotice ? `
      <aside class="device-note" role="note">
        <p>Entries live on this device only. <button type="button" class="link" data-action="open-settings">Back up</button></p>
        <button type="button" class="device-note-close" data-action="dismiss-notice" aria-label="Dismiss">&times;</button>
      </aside>
    ` : ''}

    <section>
      <div class="section-head">
        <h2 class="section-title">Recent ${esc(accountLabel(account))} entries</h2>
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
