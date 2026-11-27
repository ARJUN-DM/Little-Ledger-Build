import { accountLabel, accountTypes, typeLabel } from './store.js';
import { esc } from './ui.js';
import { SORTS, cloneFilters, emptyFilters } from './ledger.js';

let overlayEl = null;
let sheetEl = null;
let state = null;

function build() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'sheet-overlay';
  overlayEl.addEventListener('click', close);

  sheetEl = document.createElement('section');
  sheetEl.className = 'sheet';
  sheetEl.setAttribute('role', 'dialog');
  sheetEl.setAttribute('aria-modal', 'true');
  sheetEl.setAttribute('aria-label', 'Filter entries');
  sheetEl.addEventListener('change', onChange);
  sheetEl.addEventListener('click', onClick);

  document.getElementById('sheet-root').append(overlayEl, sheetEl);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state) close();
  });
}

function onChange(event) {
  if (!state) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  if (input.dataset.cat) {
    toggle(state.draft.categories, input.dataset.cat, input.checked);
    paint();
  } else if (input.dataset.type) {
    toggle(state.draft.types, input.dataset.type, input.checked);
    paint();
  }
}

function toggle(list, value, on) {
  const index = list.indexOf(value);
  if (on && index === -1) list.push(value);
  if (!on && index !== -1) list.splice(index, 1);
}

function onClick(event) {
  if (!state) return;
  const button = event.target.closest('[data-action]');
  if (!button) return;

  switch (button.dataset.action) {
    case 'filter-close':
      close();
      break;
    case 'filter-sort':
      state.draft.sort = button.dataset.sort;
      paint();
      break;
    case 'filter-all-cats':
      state.draft.categories = [...state.categories];
      paint();
      break;
    case 'filter-no-cats':
      state.draft.categories = [];
      paint();
      break;
    case 'filter-all-types':
      state.draft.types = [...state.types];
      paint();
      break;
    case 'filter-no-types':
      state.draft.types = [];
      paint();
      break;
    case 'filter-reset':
      state.draft = emptyFilters();
      apply();
      break;
    case 'filter-apply':
      apply();
      break;
    default:
      break;
  }
}

function apply() {
  const next = cloneFilters(state.draft);
  const done = state.onApply;
  close();
  if (done) done(next);
}

function paint() {
  sheetEl.innerHTML = view();
}

function view() {
  const { draft, categories, types, label } = state;

  const categoryRows = categories.map((category) => `
    <label class="check">
      <input type="checkbox" data-cat="${esc(category)}"${draft.categories.includes(category) ? ' checked' : ''} />
      <span>${esc(category)}</span>
    </label>
  `).join('');

  const typeRows = types.map((type) => `
    <label class="check">
      <input type="checkbox" data-type="${esc(type)}"${draft.types.includes(type) ? ' checked' : ''} />
      <span>${esc(typeLabel(type))}</span>
    </label>
  `).join('');

  return `
    <div class="sheet-head">
      <div>
        <p class="eyebrow">${esc(label)}</p>
        <h2 class="sheet-title">Filter entries</h2>
      </div>
      <button type="button" class="sheet-close" data-action="filter-close" aria-label="Close">&times;</button>
    </div>

    <div class="field">
      <div class="section-head">
        <span class="field-label">Categories</span>
        <span class="filter-links">
          <button type="button" class="link" data-action="filter-all-cats">All</button>
          <button type="button" class="link" data-action="filter-no-cats">None</button>
        </span>
      </div>
      <div class="checks">
        ${categoryRows || '<p class="filter-hint">No categories in this account yet.</p>'}
      </div>
    </div>

    <div class="field">
      <div class="section-head">
        <span class="field-label">Type</span>
        <span class="filter-links">
          <button type="button" class="link" data-action="filter-all-types">All</button>
          <button type="button" class="link" data-action="filter-no-types">None</button>
        </span>
      </div>
      <div class="checks">${typeRows}</div>
    </div>

    <div class="field">
      <span class="field-label">Sort order</span>
      <div class="seg" role="group" aria-label="Sort order">
        ${SORTS.map((sort) => `
          <button type="button" class="seg-btn${draft.sort === sort.id ? ' is-active' : ''}"
            data-action="filter-sort" data-sort="${esc(sort.id)}">${esc(sort.label)}</button>
        `).join('')}
      </div>
      <p class="filter-hint">Sort is one choice at a time; categories and types stack.</p>
    </div>

    <div class="sheet-actions">
      <button type="button" class="btn" data-action="filter-reset">Reset</button>
      <button type="button" class="btn btn-primary" data-action="filter-apply">Apply</button>
    </div>
  `;
}

export function openFilterSheet({ account = 'debit', entries = [], filters, onApply }) {
  if (!sheetEl) build();

  const categories = [];
  entries.forEach((item) => {
    if (!categories.includes(item.category)) categories.push(item.category);
  });
  categories.sort((a, b) => a.localeCompare(b));

  state = {
    label: `${accountLabel(account)} \u00b7 ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`,
    categories,
    types: accountTypes(account),
    draft: cloneFilters(filters),
    onApply,
  };

  paint();
  requestAnimationFrame(() => {
    overlayEl.classList.add('is-open');
    sheetEl.classList.add('is-open');
    document.body.classList.add('sheet-open');
  });
}

function close() {
  if (!state) return;
  state = null;
  overlayEl.classList.remove('is-open');
  sheetEl.classList.remove('is-open');
  document.body.classList.remove('sheet-open');
}
