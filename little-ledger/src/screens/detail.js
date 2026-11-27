import { accountLabel, partnerAccountOf, typeLabel } from '../store.js';
import { esc, growsBalance, signed } from '../ui.js';
import { formatDate, formatMoney, toISO } from '../format.js';

export function renderDetail(transaction, { confirming = false, backLabel = 'Ledger' } = {}) {
  const partner = partnerAccountOf(transaction);
  const positive = growsBalance(transaction);
  const stamp = transaction.type === 'income'
    ? 'Received'
    : transaction.type === 'payment'
      ? 'Paid in'
      : 'Paid';

  return `
    <header class="topbar">
      <button type="button" class="link-back" data-action="back">&lsaquo; ${esc(backLabel)}</button>
      <span class="eyebrow">Folio ${esc(transaction.id.slice(-6))}</span>
    </header>

    <p class="eyebrow">${esc(accountLabel(transaction.account))} &middot; ${esc(typeLabel(transaction.type))} &middot; ${esc(transaction.category)}</p>
    <p class="detail-amount num">${signed(transaction.amount, positive)}</p>
    <span class="detail-stamp">${stamp}</span>

    <dl class="detail-rows">
      <div><dt>Date</dt><dd class="num">${esc(formatDate(transaction.date))}</dd></div>
      <div><dt>Account</dt><dd>${esc(accountLabel(transaction.account))}</dd></div>
      <div><dt>Type</dt><dd>${esc(typeLabel(transaction.type))}</dd></div>
      <div><dt>Category</dt><dd>${esc(transaction.category)}</dd></div>
      <div><dt>Note</dt><dd>${transaction.note ? esc(transaction.note) : '\u2014'}</dd></div>
      <div><dt>Recorded</dt><dd class="num">${esc(formatDate(toISO(new Date(transaction.createdAt))))}</dd></div>
    </dl>

    ${partner ? `
      <p class="linked-note">
        Linked to the ${esc(accountLabel(partner))} account. Editing the amount, date or note here
        updates both sides; deleting removes both.
      </p>
    ` : ''}

    ${confirming ? `
      <div class="confirm">
        <p>${partner
          ? `Delete this entry? It also removes the matching ${esc(formatMoney(transaction.amount))} entry in ${esc(accountLabel(partner))}.`
          : 'Delete this entry? The ledger totals update immediately.'}</p>
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
