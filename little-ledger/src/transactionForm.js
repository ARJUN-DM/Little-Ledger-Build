import { CATEGORIES, store } from './store.js';
import { esc } from './ui.js';
import { todayISO } from './format.js';

let overlayEl = null;
let sheetEl = null;
let state = null;
let focusTimer = 0;

/** Matches the slide-up transition so a desktop keyboard never covers it. */
const FOCUS_DELAY = 340;

/** Phones and tablets keep the keypad down: the sheet slides in fully, then you tap Amount. */
const TOUCH_FIRST = window.matchMedia('(pointer: coarse)').matches;

function build() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'sheet-overlay';
  overlayEl.addEventListener('click', closeSheet);

  sheetEl = document.createElement('section');
  sheetEl.className = 'sheet';
  sheetEl.setAttribute('role', 'dialog');
  sheetEl.setAttribute('aria-modal', 'true');
  sheetEl.setAttribute('aria-label', 'Transaction editor');
  sheetEl.addEventListener('input', onInput);
  sheetEl.addEventListener('click', onClick);

  document.getElementById('sheet-root').append(overlayEl, sheetEl);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state) closeSheet();
  });
}

function onInput(event) {
  if (!state) return;
  const { id, value } = event.target;
  if (id === 'f-amount') state.draft.amount = value;
  else if (id === 'f-note') state.draft.note = value;
  else if (id === 'f-date') state.draft.date = value;
}

function onClick(event) {
  if (!state) return;
  const button = event.target.closest('[data-action]');
  if (!button) return;

  switch (button.dataset.action) {
    case 'sheet-close':
      closeSheet();
      break;
    case 'sheet-type':
      setType(button.dataset.type);
      break;
    case 'sheet-cat':
      state.draft.category = button.dataset.category;
      state.error = '';
      paint();
      break;
    case 'sheet-save':
      save();
      break;
    default:
      break;
  }
}

function setType(type) {
  if (state.draft.type === type) return;
  state.draft.type = type;
  const options = CATEGORIES[type];
  if (!options.includes(state.draft.category)) state.draft.category = options[0];
  state.error = '';
  paint();
}

function save() {
  const amount = Number.parseFloat(String(state.draft.amount).replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    state.error = 'Enter an amount greater than zero.';
    paint();
    focusAmount();
    return;
  }

  const payload = {
    amount: Math.round(amount * 100) / 100,
    type: state.draft.type,
    category: state.draft.category,
    date: state.draft.date || todayISO(),
    note: state.draft.note.trim(),
  };

  if (state.mode === 'edit') store.update(state.id, payload);
  else store.add(payload);

  const done = state.onDone;
  closeSheet();
  if (done) done();
}

function paint() {
  sheetEl.innerHTML = view();
}

function focusAmount(delay = 0) {
  window.clearTimeout(focusTimer);
  const focus = () => {
    if (!state) return;
    const input = sheetEl.querySelector('#f-amount');
    if (input) input.focus({ preventScroll: true });
  };

  if (delay > 0) focusTimer = window.setTimeout(focus, delay);
  else focus();
}

function view() {
  const draft = state.draft;
  const isEdit = state.mode === 'edit';
  const chips = CATEGORIES[draft.type].map((category) => `
    <button
      type="button"
      class="chip${category === draft.category ? ' is-active' : ''}"
      data-action="sheet-cat"
      data-category="${esc(category)}"
    >${esc(category)}</button>
  `).join('');

  return `
    <div class="sheet-head">
      <div>
        <p class="eyebrow">${isEdit ? 'Edit entry' : 'New entry'}</p>
        <h2 class="sheet-title">${isEdit ? 'Amend the ledger' : 'Record a transaction'}</h2>
      </div>
      <button type="button" class="sheet-close" data-action="sheet-close" aria-label="Close">&times;</button>
    </div>

    <div class="field">
      <label class="field-label" for="f-amount">Amount</label>
      <div class="amount-input">
        <input id="f-amount" class="num" type="text" inputmode="decimal" autocomplete="off"
          placeholder="0.00" value="${esc(draft.amount)}" />
      </div>
    </div>

    <div class="field">
      <span class="field-label">Type</span>
      <div class="seg" role="group" aria-label="Transaction type">
        <button type="button" class="seg-btn${draft.type === 'expense' ? ' is-active' : ''}"
          data-action="sheet-type" data-type="expense">Expense</button>
        <button type="button" class="seg-btn${draft.type === 'income' ? ' is-active' : ''}"
          data-action="sheet-type" data-type="income">Income</button>
      </div>
    </div>

    <div class="field">
      <span class="field-label">Category</span>
      <div class="chips">${chips}</div>
    </div>

    <div class="field">
      <label class="field-label" for="f-date">Date</label>
      <input id="f-date" class="num" type="date" value="${esc(draft.date)}" />
    </div>

    <div class="field">
      <label class="field-label" for="f-note">Note</label>
      <input id="f-note" type="text" autocomplete="off" placeholder="Optional detail"
        value="${esc(draft.note)}" />
    </div>

    ${state.error ? `<p class="sheet-error" role="alert">${esc(state.error)}</p>` : ''}

    <div class="sheet-actions">
      <button type="button" class="btn" data-action="sheet-close">Cancel</button>
      <button type="button" class="btn btn-primary" data-action="sheet-save">
        ${isEdit ? 'Save changes' : 'Save entry'}
      </button>
    </div>
  `;
}

export function openSheet({ mode = 'create', transaction = null, onDone = null } = {}) {
  if (!sheetEl) build();

  state = {
    mode,
    id: transaction ? transaction.id : null,
    onDone,
    error: '',
    draft: {
      amount: transaction ? String(transaction.amount) : '',
      type: transaction ? transaction.type : 'expense',
      category: transaction ? transaction.category : CATEGORIES.expense[0],
      date: transaction ? transaction.date : todayISO(),
      note: transaction ? (transaction.note || '') : '',
    },
  };

  paint();
  requestAnimationFrame(() => {
    overlayEl.classList.add('is-open');
    sheetEl.classList.add('is-open');
    document.body.classList.add('sheet-open');
    if (!TOUCH_FIRST) focusAmount(FOCUS_DELAY);
  });
}

export function closeSheet() {
  if (!state) return;
  state = null;
  window.clearTimeout(focusTimer);
  overlayEl.classList.remove('is-open');
  sheetEl.classList.remove('is-open');
  document.body.classList.remove('sheet-open');
}
