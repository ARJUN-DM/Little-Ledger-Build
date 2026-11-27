import { accountLabel, summarize } from './store.js';
import { formatDateShort, formatMoney } from './format.js';

/** Escape user supplied text before it is interpolated into a template string. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

/** A signed money string, e.g. "−1,204.00". */
export function signed(amount, positive) {
  return `${positive ? '+' : '\u2212'}${formatMoney(amount)}`;
}

/** Money added to the account's headline figure: income on Debit/Cash, spending on Credit. */
export function growsBalance(transaction) {
  return transaction.account === 'credit'
    ? transaction.type === 'expense'
    : transaction.type === 'income';
}

/** The account a linked row points at, for the little tag on the row. */
function linkTag(transaction) {
  if (transaction.role !== 'mirror') return '';
  const from = transaction.linkedAccount || 'debit';
  return `<span class="entry-tag">\u21c4 ${esc(accountLabel(from))}</span>`;
}

/** One row of the ledger, shared by Home, Transactions and Months. */
export function entryRow(transaction) {
  const positive = growsBalance(transaction);
  const tag = linkTag(transaction);
  return `
    <li class="entry" data-action="open" data-id="${esc(transaction.id)}" role="button" tabindex="0">
      <span class="entry-main">
        <span class="entry-cat">${esc(transaction.category)}${tag}</span>
        <span class="entry-note">${transaction.note ? esc(transaction.note) : '\u2014'}</span>
      </span>
      <span class="entry-date num">${esc(formatDateShort(transaction.date))}</span>
      <span class="entry-amt num">${signed(transaction.amount, positive)}</span>
    </li>
  `;
}

/** Income / expense / net, or spent / paid / owed on the Credit account. */
export function summaryCards(totals, account) {
  if (account === 'credit') {
    return `
      <div class="summary-item">
        <span class="split-label">Spent</span>
        <span class="split-value num">${totals.expense ? `\u2212${formatMoney(totals.expense)}` : formatMoney(0)}</span>
      </div>
      <div class="summary-item">
        <span class="split-label">Paid</span>
        <span class="split-value num">${totals.paid ? `+${formatMoney(totals.paid)}` : formatMoney(0)}</span>
      </div>
      <div class="summary-item">
        <span class="split-label">Owed</span>
        <span class="split-value num">${totals.owed < 0 ? '\u2212' : ''}${formatMoney(totals.owed)}</span>
      </div>
    `;
  }

  return `
    <div class="summary-item">
      <span class="split-label">Income</span>
      <span class="split-value num">${totals.income ? '+' : ''}${formatMoney(totals.income)}</span>
    </div>
    <div class="summary-item">
      <span class="split-label">Expenses</span>
      <span class="split-value num">${totals.expense ? '\u2212' : ''}${formatMoney(totals.expense)}</span>
    </div>
    <div class="summary-item">
      <span class="split-label">Net</span>
      <span class="split-value num">${totals.balance < 0 ? '\u2212' : ''}${formatMoney(totals.balance)}</span>
    </div>
  `;
}

/**
 * The block that closes a list: how much went out and the net, for exactly the
 * rows above it. Always rendered, filtered or not.
 */
export function totalsBlock(items, { account, label = '', empty = false } = {}) {
  const totals = summarize(items);
  const credit = account === 'credit';
  const net = credit ? totals.owed : totals.balance;

  return `
    <section class="totals${empty ? ' totals--empty' : ''}">
      ${label ? `<p class="totals-label">${esc(label)}</p>` : ''}
      <div class="totals-row">
        <span class="split-label">${credit ? 'Spent' : 'Expenses'}</span>
        <span class="split-value num">${totals.expense ? `\u2212${formatMoney(totals.expense)}` : formatMoney(0)}</span>
      </div>
      <div class="totals-row totals-net">
        <span class="split-label">${credit ? 'Change in owed' : 'Net'}</span>
        <span class="split-value num">${net < 0 ? '\u2212' : ''}${formatMoney(net)}</span>
      </div>
    </section>
  `;
}

/** The Filter button plus what is currently applied. */
export function filterBar({ count = 0, summary = '', active = false } = {}) {
  return `
    <div class="filterbar">
      <button type="button" class="filter-btn${active ? ' is-active' : ''}" data-action="filter-open">
        Filter${count ? ` \u00b7 ${count}` : ''}
      </button>
      <span class="filter-summary">${esc(summary)}</span>
      ${active ? '<button type="button" class="link filter-clear" data-action="filter-clear">Clear</button>' : ''}
    </div>
    ${active ? '' : '<p class="filter-hint">Tap Filter to narrow by category, type or order.</p>'}
  `;
}
