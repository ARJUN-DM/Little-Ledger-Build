import { accountLabel, summarize, typeLabel } from './store.js';
import { monthKeyOf } from './format.js';

export const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'largest', label: 'Largest' },
];

export function emptyFilters() {
  return { categories: [], types: [], sort: 'newest' };
}

export function cloneFilters(filters) {
  return {
    categories: [...filters.categories],
    types: [...filters.types],
    sort: filters.sort,
  };
}

export function sortLabel(id) {
  const found = SORTS.find((sort) => sort.id === id);
  return found ? found.label : SORTS[0].label;
}

export function isFiltered(filters) {
  return filters.categories.length > 0
    || filters.types.length > 0
    || filters.sort !== 'newest';
}

/** How many choices differ from the default, for the Filter button badge. */
export function filterCount(filters) {
  return filters.categories.length
    + filters.types.length
    + (filters.sort === 'newest' ? 0 : 1);
}

function sortBy(list, sort) {
  if (sort === 'oldest') {
    return [...list].sort((a, b) => (a.date === b.date
      ? a.createdAt - b.createdAt
      : (a.date < b.date ? -1 : 1)));
  }
  if (sort === 'largest') {
    return [...list].sort((a, b) => (b.amount - a.amount || (a.date < b.date ? 1 : -1)));
  }
  return [...list].sort((a, b) => (a.date === b.date
    ? b.createdAt - a.createdAt
    : (a.date < b.date ? 1 : -1)));
}

/** Categories and types narrow the list; sort only reorders it. */
export function applyFilters(list, filters) {
  let items = list;
  if (filters.categories.length) {
    items = items.filter((item) => filters.categories.includes(item.category));
  }
  if (filters.types.length) {
    items = items.filter((item) => filters.types.includes(item.type));
  }
  return sortBy(items, filters.sort);
}

/** A one-line description of what the filter is doing, for under the button. */
export function filterSummary(filters, account) {
  const parts = [];
  if (filters.categories.length) parts.push(filters.categories.join(', '));
  if (filters.types.length) {
    parts.push(filters.types.map((type) => typeLabel(type)).join(', '));
  }
  if (filters.sort !== 'newest') parts.push(`${sortLabel(filters.sort)} first`);
  if (!parts.length) return `All ${accountLabel(account)} entries`;
  return parts.join(' \u00b7 ');
}

/** Entries grouped by month, newest month first. Shared by both list screens. */
export function monthGroups(list) {
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

/** Every year that has at least one entry, newest first. */
export function yearsOf(list) {
  const years = new Set(list.map((item) => String(item.date).slice(0, 4)));
  return [...years].sort((a, b) => (a < b ? 1 : -1));
}

/** Everything dated before the first day of the month. */
function before(list, monthKey) {
  const first = `${monthKey}-01`;
  return list.filter((item) => item.date < first);
}

/** Opening balance of a month: the account's total up to the month before. */
export function openingBalance(list, monthKey, account) {
  const totals = summarize(before(list, monthKey));
  return account === 'credit' ? totals.owed : totals.balance;
}

/** How much the month moved the headline figure (owed grows on Credit). */
export function movementOf(totals, account) {
  return account === 'credit' ? totals.owed : totals.balance;
}
