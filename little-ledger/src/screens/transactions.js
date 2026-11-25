import { summarize } from '../store.js';
import { esc, entryRow } from '../ui.js';
import { formatMoney, formatMonth, monthKeyOf } from '../format.js';

export function renderTransactions(list) {
  const { income, expense, balance } = summarize(list);

  const groups = [];
  const byMonth = new Map();
  list.forEach((item) => {
    const key = monthKeyOf(item.date);
    if (!byMonth.has(key)) {
      const group = { key, items: [] };
      byMonth.set(key, group);
      groups.push(group);
    }
    byMonth.get(key).items.push(item);
  });

  const body = groups.map((group) => {
    const net = summarize(group.items).balance;
    return `
      <div class="month-head">
        <h2>${esc(formatMonth(group.key))}</h2>
        <span class="month-net">${net > 0 ? '+' : net < 0 ? '\u2212' : ''}${formatMoney(net)}</span>
      </div>
      <ul class="entries">${group.items.map(entryRow).join('')}</ul>
    `;
  }).join('');

  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book &middot; ${list.length} ${list.length === 1 ? 'entry' : 'entries'}</p>
      <h1 class="ledger-title">Transactions</h1>
    </header>

    <section class="summary">
      <div class="summary-item">
        <span class="split-label">Income</span>
        <span class="split-value num">${income ? '+' : ''}${formatMoney(income)}</span>
      </div>
      <div class="summary-item">
        <span class="split-label">Expenses</span>
        <span class="split-value num">${expense ? '\u2212' : ''}${formatMoney(expense)}</span>
      </div>
      <div class="summary-item">
        <span class="split-label">Net</span>
        <span class="split-value num">${balance < 0 ? '\u2212' : ''}${formatMoney(balance)}</span>
      </div>
    </section>

    <button type="button" class="btn btn-primary btn-block" data-action="add">Add transaction</button>

    ${body || '<p class="empty">No entries yet. Record your first transaction to open the ledger.</p>'}
  `;
}
