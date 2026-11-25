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

/** One row of the ledger, shared by Home and Transactions. */
export function entryRow(transaction) {
  const income = transaction.type === 'income';
  return `
    <li class="entry" data-action="open" data-id="${esc(transaction.id)}" role="button" tabindex="0">
      <span class="entry-main">
        <span class="entry-cat">${esc(transaction.category)}</span>
        <span class="entry-note">${transaction.note ? esc(transaction.note) : '\u2014'}</span>
      </span>
      <span class="entry-date num">${esc(formatDateShort(transaction.date))}</span>
      <span class="entry-amt num">${income ? '+' : '\u2212'}${formatMoney(transaction.amount)}</span>
    </li>
  `;
}
