import { accountLabel, summarize } from '../store.js';
import { esc, entryRow, filterBar, totalsBlock } from '../ui.js';
import {
  applyFilters, filterCount, filterSummary, isFiltered, monthGroups, movementOf,
  openingBalance, yearsOf,
} from '../ledger.js';
import { formatMoney, formatMonth, monthKeyOf } from '../format.js';

function money(value) {
  return `${value < 0 ? '\u2212' : ''}${formatMoney(value)}`;
}

/** Opening, this month's movement and closing, worded for the account. */
function balanceRows(account, opening, totals, closing) {
  const credit = account === 'credit';
  return `
    <dl class="balance-rows">
      <div><dt>${credit ? 'Owed at start' : 'Opening'}</dt><dd class="num">${money(opening)}</dd></div>
      <div><dt>${credit ? 'Spent this month' : 'Income'}</dt><dd class="num">${money(credit ? totals.expense : totals.income)}</dd></div>
      <div><dt>${credit ? 'Paid' : 'Expenses'}</dt><dd class="num">${money(credit ? totals.paid : -totals.expense)}</dd></div>
      <div><dt>${credit ? 'Change in owed' : 'Net'}</dt><dd class="num">${money(movementOf(totals, account))}</dd></div>
      <div class="is-closing"><dt>${credit ? 'Owed at end' : 'Closing'}</dt><dd class="num">${money(closing)}</dd></div>
    </dl>
  `;
}

/** Year picker: All years, then every year that actually holds an entry. */
function yearBar(years, year) {
  return `
    <div class="year-bar">
      <label class="field-label" for="year-select">Year</label>
      <select id="year-select" class="year-select">
        <option value="all"${year === 'all' ? ' selected' : ''}>All years</option>
        ${years.map((item) => `<option value="${esc(item)}"${item === year ? ' selected' : ''}>${esc(item)}</option>`).join('')}
      </select>
    </div>
  `;
}

/** One card per month; each carries its own opening and closing balance. */
export function renderMonths({ list, account = 'debit', year = 'all' }) {
  const years = yearsOf(list);
  const scoped = year === 'all' ? list : list.filter((item) => String(item.date).slice(0, 4) === year);
  const groups = monthGroups(scoped);
  const credit = account === 'credit';

  const cards = groups.map((group) => {
    const totals = summarize(group.items);
    const opening = openingBalance(list, group.key, account);
    const closing = opening + movementOf(totals, account);
    const count = group.items.length;
    return `
      <li class="month-card" data-action="open-month" data-month="${esc(group.key)}" role="button" tabindex="0">
        <span class="month-card-head">
          <span class="month-card-name">${esc(formatMonth(group.key))}</span>
          <span class="month-card-count">${count} ${count === 1 ? 'entry' : 'entries'}</span>
        </span>
        <span class="month-card-nums num">
          <span class="month-card-in">${totals.income ? '+' : ''}${formatMoney(totals.income)}</span>
          <span class="month-card-out">${totals.expense ? '\u2212' : ''}${formatMoney(totals.expense)}</span>
          <span class="month-card-net">${money(movementOf(totals, account))}</span>
        </span>
        <span class="month-card-balance num">
          <span>${credit ? 'Owed' : 'Open'} ${money(opening)}</span>
          <span>${credit ? 'Owed' : 'Close'} ${money(closing)}</span>
        </span>
      </li>
    `;
  }).join('');

  return `
    <header class="ledger-head">
      <p class="eyebrow">Cash book &middot; ${esc(accountLabel(account))} &middot; ${groups.length} ${groups.length === 1 ? 'month' : 'months'}</p>
      <h1 class="ledger-title">Months</h1>
    </header>

    ${yearBar(years, year)}

    ${groups.length
      ? `<ul class="months">${cards}</ul>`
      : '<p class="empty">No months here yet. Entries you record show up month by month.</p>'}

    ${totalsBlock(scoped, {
      account,
      label: year === 'all' ? 'All years' : year,
      empty: scoped.length === 0,
    })}
  `;
}

/** Every entry filed under one month, with its carried balance and filters. */
export function renderMonth({ list, account = 'debit', monthKey, filters }) {
  const items = list.filter((item) => monthKeyOf(item.date) === monthKey);
  const shown = applyFilters(items, filters);
  const totals = summarize(items);
  const opening = openingBalance(list, monthKey, account);
  const closing = opening + movementOf(totals, account);
  const active = isFiltered(filters);
  const credit = account === 'credit';

  const label = active
    ? `${filterSummary(filters, account)} \u00b7 ${shown.length} of ${items.length}`
    : `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`;

  return `
    <header class="topbar">
      <button type="button" class="link-back" data-action="back-months">&lsaquo; Months</button>
      <span class="eyebrow">${esc(accountLabel(account))} &middot; ${items.length} ${items.length === 1 ? 'entry' : 'entries'}</span>
    </header>

    <p class="eyebrow">Cash book</p>
    <h1 class="ledger-title">${esc(formatMonth(monthKey))}</h1>

    ${balanceRows(account, opening, totals, closing)}

    ${filterBar({
      count: filterCount(filters),
      summary: filterSummary(filters, account),
      active,
    })}

    <ul class="entries">
      ${shown.length
        ? shown.map(entryRow).join('')
        : `<li class="empty">${items.length
          ? 'No entries match this filter.'
          : `No ${credit ? 'credit' : ''} entries in this month.`}</li>`}
    </ul>

    ${totalsBlock(shown, { account, label, empty: shown.length === 0 })}
  `;
}
