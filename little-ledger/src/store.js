import { Storage } from './storage.js';
import { todayISO } from './format.js';

export const CATEGORIES = {
  expense: ['Groceries', 'Dining', 'Transport', 'Housing', 'Utilities', 'Health', 'Shopping', 'Other'],
  income: ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Other'],
};

const STORAGE_KEY = 'transactions';
const SCHEMA_VERSION = 1;

let sequence = 0;
function uid() {
  sequence += 1;
  return `tx-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount)) return null;

  const type = raw.type === 'income' ? 'income' : 'expense';
  const category = typeof raw.category === 'string' && raw.category
    ? raw.category
    : CATEGORIES[type][0];
  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
    ? raw.date
    : todayISO();

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    amount: Math.round(Math.abs(amount) * 100) / 100,
    type,
    category,
    date,
    note: typeof raw.note === 'string' ? raw.note : '',
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
  };
}

export function normalizeList(list) {
  return Array.isArray(list) ? list.map(normalize).filter(Boolean) : [];
}

/** Demo rows written by older builds, dropped so the ledger starts at zero. */
function withoutLegacySamples(items) {
  return items.filter((item) => !(typeof item.id === 'string' && item.id.startsWith('sample-')));
}

/**
 * Reads the saved ledger. The value is a versioned envelope so the shape can
 * change later without dropping entries; a bare array from older builds is
 * migrated in place. A fresh install starts empty, at zero.
 */
function load() {
  const stored = Storage.get(STORAGE_KEY);

  if (Array.isArray(stored)) {
    return withoutLegacySamples(normalizeList(stored));
  }

  if (stored && typeof stored === 'object' && Array.isArray(stored.transactions)) {
    return withoutLegacySamples(normalizeList(stored.transactions));
  }

  return [];
}

let transactions = load();
const listeners = new Set();

function persist() {
  Storage.set(STORAGE_KEY, { v: SCHEMA_VERSION, transactions });
}

persist();

function emit() {
  listeners.forEach((listener) => listener());
}

function sortDesc(list) {
  return [...list].sort((a, b) => (a.date === b.date
    ? b.createdAt - a.createdAt
    : (a.date < b.date ? 1 : -1)));
}

export function summarize(list) {
  let income = 0;
  let expense = 0;
  list.forEach((item) => {
    if (item.type === 'income') income += item.amount;
    else expense += item.amount;
  });
  return { income, expense, balance: income - expense };
}

export const store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  all() {
    return sortDesc(transactions);
  },

  get(id) {
    return transactions.find((item) => item.id === id) || null;
  },

  add(input) {
    const created = normalize({ ...input, id: uid(), createdAt: Date.now() });
    transactions.push(created);
    persist();
    emit();
    return created;
  },

  update(id, patch) {
    const index = transactions.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const previous = transactions[index];
    const updated = normalize({ ...previous, ...patch, id, createdAt: previous.createdAt });
    transactions[index] = updated;
    persist();
    emit();
    return updated;
  },

  remove(id) {
    const before = transactions.length;
    transactions = transactions.filter((item) => item.id !== id);
    if (transactions.length === before) return false;
    persist();
    emit();
    return true;
  },

  /** Swap the whole ledger for a restored backup. */
  replaceAll(list) {
    transactions = normalizeList(list);
    persist();
    emit();
    return transactions.length;
  },

  /** Add restored entries, updating any whose id already exists. */
  mergeAll(list) {
    const byId = new Map(transactions.map((item) => [item.id, item]));
    let added = 0;
    let updated = 0;

    normalizeList(list).forEach((item) => {
      const existing = byId.get(item.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(item)) updated += 1;
      } else {
        added += 1;
      }
      byId.set(item.id, item);
    });

    transactions = [...byId.values()];
    persist();
    emit();
    return { added, updated };
  },
};
