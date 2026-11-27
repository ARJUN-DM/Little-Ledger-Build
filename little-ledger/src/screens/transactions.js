import { accountLabel, summarize } from '../store.js';
import { esc, entryRow, filterBar, summaryCards, totalsBlock } from '../ui.js';
import {
  applyFilters, filterCount, filterSummary, isFiltered, monthGroups,
} from '../ledger.js';
import { formatMoney, formatMonth } from '../format.js';

/** One account's ledger: month groups, filter bar, and a total that always closes the list. */
export function renderTransactions({ list, account = 'debit', filters }) {
  const shown = applyFilters(list, filters);
  const totals = summarize(list);
  const active = isFiltered(filters);

  const groups = monthGroups(shown);

  const body = groups.map((group) => {
    const net = summarize(group.items);
    const movement = account === 'credit' ? net.owed : net.balance;
    return `
      <div class="month-head">
        <h2>${esc(formatMonth(group.key))}</h2>
        <span class="month-net">${movement > 0 ? '+' : movement < 0 ? '\u2212' : ''}${formatMoney(movement)}</span>
      </div>
      <ul class="entries">${group.items.map(entryRow).join('')}</ul>
    `;
  }).join('');

  const label = active
    ? `${filterSummary(filters, account)} \u00b7 ${shown.length} of ${list.length}`
    : `${list.length} ${list.length === 1 ? 'entry' : 'entries'}`;

  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book &middot; ${esc(accountLabel(account))} &middot; ${list.length} ${list.length === 1 ? 'entry' : 'entries'}</p>
      <h1 class="ledger-title">Transactions</h1>
    </header>

    ${filterBar({
      count: filterCount(filters),
      summary: filterSummary(filters, account),
      active,
    })}

    <section class="summary">
      ${summaryCards(totals, account)}
    </section>

    <button type="button" class="btn btn-primary btn-block" data-action="add">Add transaction</button>

    ${body || '<p class="empty">No entries match. Clear the filter, or record a new transaction.</p>'}

    ${totalsBlock(shown, { account, label: label, empty: shown.length === 0 })}
  `;
}
