import { esc } from '../ui.js';
import { formatDate, formatMoney, toISO } from '../format.js';

export function renderDetail(transaction, { confirming = false, backLabel = 'Ledger' } = {}) {
  const income = transaction.type === 'income';

  return `
    <header class="topbar">
      <button type="button" class="link-back" data-action="back">&lsaquo; ${esc(backLabel)}</button>
      <span class="eyebrow">Folio ${esc(transaction.id.slice(-6))}</span>
    </header>

    <p class="eyebrow">${income ? 'Income' : 'Expense'} &middot; ${esc(transaction.category)}</p>
    <p class="detail-amount num">${income ? '+' : '\u2212'}${formatMoney(transaction.amount)}</p>
    <span class="detail-stamp">${income ? 'Received' : 'Paid'}</span>

    <dl class="detail-rows">
      <div><dt>Date</dt><dd class="num">${esc(formatDate(transaction.date))}</dd></div>
      <div><dt>Type</dt><dd>${income ? 'Income' : 'Expense'}</dd></div>
      <div><dt>Category</dt><dd>${esc(transaction.category)}</dd></div>
      <div><dt>Note</dt><dd>${transaction.note ? esc(transaction.note) : '\u2014'}</dd></div>
      <div><dt>Recorded</dt><dd class="num">${esc(formatDate(toISO(new Date(transaction.createdAt))))}</dd></div>
    </dl>

    ${confirming ? `
      <div class="confirm">
        <p>Delete this entry? The ledger totals update immediately.</p>
        <div class="row">
          <button type="button" class="btn btn-danger" data-action="delete-confirm" data-id="${esc(transaction.id)}">Delete</button>
          <button type="button" class="btn" data-action="delete-cancel">Cancel</button>
        </div>
      </div>
    ` : `
      <div class="detail-actions">
        <button type="button" class="btn btn-primary" data-action="edit" data-id="${esc(transaction.id)}">Edit</button>
        <button type="button" class="btn btn-danger" data-action="delete" data-id="${esc(transaction.id)}">Delete</button>
      </div>
    `}
  `;
}
