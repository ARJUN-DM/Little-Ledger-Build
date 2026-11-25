import { summarize } from '../store.js';
import { esc, entryRow } from '../ui.js';
import { formatMoney, formatMonth, monthKeyOf } from '../format.js';

/** Entries grouped by month, newest month first. */
function monthGroups(list) {
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
  return groups.sort((a, b) => (a.key < b.key ? 1 : -1));
}

function monthSummary({ income, expense, balance }) {
  return `
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
  `;
}

/** One card per month that has entries; tap a card to read that month. */
export function renderMonths(list) {
  const groups = monthGroups(list);

  const cards = groups.map((group) => {
    const totals = summarize(group.items);
    const { income, expense, balance } = totals;
    const count = group.items.length;
    return `
      <li class="month-card" data-action="open-month" data-month="${esc(group.key)}" role="button" tabindex="0">
        <span class="month-card-head">
          <span class="month-card-name">${esc(formatMonth(group.key))}</span>
          <span class="month-card-count">${count} ${count === 1 ? 'entry' : 'entries'}</span>
        </span>
        <span class="month-card-nums num">
          <span class="month-card-in">${income ? '+' : ''}${formatMoney(income)}</span>
          <span class="month-card-out">${expense ? '\u2212' : ''}${formatMoney(expense)}</span>
          <span class="month-card-net">${balance > 0 ? '+' : balance < 0 ? '\u2212' : ''}${formatMoney(balance)}</span>
        </span>
      </li>
    `;
  }).join('');

  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book &middot; ${groups.length} ${groups.length === 1 ? 'month' : 'months'}</p>
      <h1 class="ledger-title">Months</h1>
    </header>

    ${groups.length
      ? `<ul class="months">${cards}</ul>`
      : '<p class="empty">No months yet. Entries you record show up here, month by month.</p>'}
  `;
}

/** Every entry filed under one month. */
export function renderMonth(list, monthKey) {
  const items = list.filter((item) => monthKeyOf(item.date) === monthKey);
  const { income, expense, balance } = summarize(items);
  const count = items.length;

  return `
    <header class="topbar">
      <button type="button" class="link-back" data-action="back-months">&lsaquo; Months</button>
      <span class="eyebrow">${count} ${count === 1 ? 'entry' : 'entries'}</span>
    </header>

    <p class="eyebrow">Cash book</p>
    <h1 class="ledger-title">${esc(formatMonth(monthKey))}</h1>

    ${monthSummary({ income, expense, balance })}

    <ul class="entries">
      ${count
        ? items.map(entryRow).join('')
        : '<li class="empty">No entries in this month.</li>'}
    </ul>
  `;
}
