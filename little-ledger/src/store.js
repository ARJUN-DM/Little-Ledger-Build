import { Storage } from './storage.js';
import { todayISO } from './format.js';

/** The three ledgers. Each entry belongs to exactly one of them. */
export const ACCOUNTS = [
  { id: 'debit', label: 'Debit' },
  { id: 'credit', label: 'Credit' },
  { id: 'cash', label: 'Cash' },
];

export const ACCOUNT_IDS = ACCOUNTS.map((account) => account.id);

export function accountLabel(id) {
  const found = ACCOUNTS.find((account) => account.id === id);
  return found ? found.label : ACCOUNTS[0].label;
}

/** Categories shared by both directions of money. */
export const CATEGORIES = {
  expense: ['Groceries', 'Dining', 'Transport', 'Housing', 'Utilities', 'Health', 'Shopping', 'Other'],
  income: ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Other'],
};

/** Categories that only exist because money moved between two accounts. */
export const CREDIT_BILL = 'Credit bill';
export const ATM_CATEGORY = 'ATM withdrawal';
export const CASH_FROM_ATM = 'Cash withdrawal';
export const BILL_PAID = 'Bill paid';

const TYPES = ['expense', 'income', 'withdrawn', 'payment'];

const TYPE_LABELS = {
  expense: 'Expense',
  income: 'Income',
  withdrawn: 'Withdrawn',
  payment: 'Payment',
};

export function typeLabel(type) {
  return TYPE_LABELS[type] || TYPE_LABELS.expense;
}

/** Which type buttons the editor offers, and which the filters understand. */
export function accountTypes(account) {
  if (account === 'credit') return ['expense', 'payment'];
  if (account === 'cash') return ['expense', 'income'];
  return ['expense', 'income', 'withdrawn'];
}

/** The categories a person can pick for a type. */
export function categoriesFor(account, type) {
  if (account === 'credit') {
    return type === 'payment' ? [BILL_PAID] : CATEGORIES.expense.slice();
  }
  if (account === 'cash') {
    return (type === 'income' ? CATEGORIES.income : CATEGORIES.expense).slice();
  }
  if (type === 'withdrawn') return [ATM_CATEGORY];
  if (type === 'expense') return [...CATEGORIES.expense, CREDIT_BILL];
  return CATEGORIES.income.slice();
}

/** What a stored entry may legitimately carry, including the transfer categories. */
export function allowedCategories(account, type) {
  const options = categoriesFor(account, type);
  if (type === 'income' && account === 'cash') return [...options, CASH_FROM_ATM];
  return options;
}

const STORAGE_KEY = 'transactions';
const LIMIT_KEY = 'credit-limit';
const SCHEMA_VERSION = 2;

let sequence = 0;
function uid() {
  sequence += 1;
  return `tx-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function linkUid() {
  sequence += 1;
  return `ln-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const amount = Number(raw.amount);
  if (!Number.isFinite(amount)) return null;

  const account = ACCOUNT_IDS.includes(raw.account) ? raw.account : 'debit';

  let type = TYPES.includes(raw.type) ? raw.type : 'expense';
  // Keep types inside what the account can actually do.
  if (account === 'credit' && type === 'withdrawn') type = 'expense';
  if (account === 'credit' && type === 'income') type = 'payment';
  if (account !== 'credit' && type === 'payment') type = 'income';
  if (account !== 'debit' && type === 'withdrawn') type = 'expense';

  const allowed = allowedCategories(account, type);
  const category = allowed.includes(raw.category) ? raw.category : allowed[0];

  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
    ? raw.date
    : todayISO();

  const linkId = typeof raw.linkId === 'string' && raw.linkId ? raw.linkId : null;
  const linkedAccount = linkId && ACCOUNT_IDS.includes(raw.linkedAccount) ? raw.linkedAccount : null;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    account,
    amount: Math.round(Math.abs(amount) * 100) / 100,
    type,
    category,
    date,
    note: typeof raw.note === 'string' ? raw.note : '',
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
    linkId,
    role: linkId && (raw.role === 'mirror' || raw.role === 'source') ? raw.role : null,
    linkedAccount,
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
 * migrated in place, and every older entry becomes part of the Debit account.
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

persist();

function persist() {
  Storage.set(STORAGE_KEY, { v: SCHEMA_VERSION, transactions });
}

/** The other half a transfer creates, or null when the entry moves no money. */
function mirrorOf(entry) {
  if (entry.account !== 'debit') return null;
  if (entry.type === 'withdrawn') {
    return { account: 'cash', type: 'income', category: CASH_FROM_ATM, linkedAccount: 'debit' };
  }
  if (entry.type === 'expense' && entry.category === CREDIT_BILL) {
    return { account: 'credit', type: 'payment', category: BILL_PAID, linkedAccount: 'debit' };
  }
  return null;
}

function withMirror(source) {
  const mirror = normalize({
    id: uid(),
    createdAt: source.createdAt,
    amount: source.amount,
    date: source.date,
    note: source.note,
    linkId: source.linkId,
    role: 'mirror',
    ...mirrorOf(source),
  });
  transactions.push(mirror);
}

/**
 * Keeps every linked pair honest: the mirror always follows its source's
 * amount, date and note, and a source that is no longer a transfer loses its
 * mirror instead of leaving half a transfer behind.
 */
function reconcileLinks() {
  const sources = transactions.filter((item) => item.role === 'source' && item.linkId);

  sources.forEach((source) => {
    const wanted = mirrorOf(source);
    const partnerIndex = transactions.findIndex(
      (item) => item.linkId === source.linkId && item.id !== source.id,
    );

    if (!wanted) {
      if (partnerIndex !== -1) transactions.splice(partnerIndex, 1);
      source.linkId = null;
      source.role = null;
      source.linkedAccount = null;
      return;
    }

    source.linkedAccount = wanted.account;

    if (partnerIndex === -1) {
      withMirror(source);
      return;
    }

    const partner = transactions[partnerIndex];
    Object.assign(partner, {
      account: wanted.account,
      type: wanted.type,
      category: wanted.category,
      linkedAccount: wanted.linkedAccount,
      amount: source.amount,
      date: source.date,
      note: source.note,
    });
  });

  // Any mirror whose source vanished (old backup, half-deleted file) is a plain entry.
  const sourceLinks = new Set(
    transactions.filter((item) => item.role === 'source' && item.linkId).map((item) => item.linkId),
  );
  transactions.forEach((item) => {
    if (item.linkId && !sourceLinks.has(item.linkId)) {
      item.linkId = null;
      item.role = null;
      item.linkedAccount = null;
    }
  });
}

function emit() {
  listeners.forEach((listener) => listener());
}

function sortDesc(list) {
  return [...list].sort((a, b) => (a.date === b.date
    ? b.createdAt - a.createdAt
    : (a.date < b.date ? 1 : -1)));
}

/**
 * Money totals. `balance` is income minus outflow (Debit and Cash);
 * `owed` is spending minus payments (Credit). Withdrawals and credit-bill
 * payments count as outflow, exactly like an expense.
 */
export function summarize(list) {
  let income = 0;
  let expense = 0;
  let paid = 0;
  list.forEach((item) => {
    if (item.type === 'income') income += item.amount;
    else if (item.type === 'payment') paid += item.amount;
    else expense += item.amount;
  });
  return {
    income,
    expense,
    paid,
    balance: income - expense,
    owed: expense - paid,
  };
}

/** The account a linked entry reaches into, for wording. */
export function partnerAccountOf(transaction) {
  return transaction.linkId ? transaction.linkedAccount : null;
}

export const store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  all() {
    return sortDesc(transactions);
  },

  /** One account's ledger, newest first. */
  forAccount(account) {
    return sortDesc(transactions.filter((item) => item.account === account));
  },

  get(id) {
    return transactions.find((item) => item.id === id) || null;
  },

  creditLimit() {
    const value = Number(Storage.get(LIMIT_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  },

  setCreditLimit(value) {
    const amount = Number(value);
    Storage.set(LIMIT_KEY, Number.isFinite(amount) && amount > 0 ? amount : 0);
  },

  add(input) {
    const created = normalize({ ...input, id: uid(), createdAt: Date.now() });
    const mirror = mirrorOf(created);
    if (mirror) {
      created.linkId = linkUid();
      created.role = 'source';
      created.linkedAccount = mirror.account;
      transactions.push(created);
      withMirror(created);
    } else {
      transactions.push(created);
    }
    persist();
    emit();
    return created;
  },

  update(id, patch) {
    const index = transactions.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const previous = transactions[index];
    const isMirror = previous.role === 'mirror' && Boolean(previous.linkId);

    // A mirror cannot change account, type or category: only money, date and note.
    const safe = isMirror
      ? Object.fromEntries(
        ['amount', 'date', 'note'].filter((key) => key in patch).map((key) => [key, patch[key]]),
      )
      : patch;

    const updated = normalize({
      ...previous,
      ...safe,
      id,
      createdAt: previous.createdAt,
      linkId: previous.linkId,
      role: previous.role,
      linkedAccount: previous.linkedAccount,
    });

    if (!updated) return null;
    transactions[index] = updated;

    if (previous.linkId) {
      if (isMirror) {
        const partnerIndex = transactions.findIndex(
          (item) => item.linkId === previous.linkId && item.id !== id,
        );
        if (partnerIndex !== -1) {
          transactions[partnerIndex] = normalize({
            ...transactions[partnerIndex],
            amount: updated.amount,
            date: updated.date,
            note: updated.note,
          });
        }
      }
      reconcileLinks();
    }

    persist();
    emit();
    return updated;
  },

  remove(id) {
    const target = transactions.find((item) => item.id === id);
    if (!target) return false;

    const linkId = target.linkId;
    transactions = transactions.filter(
      (item) => item.id !== id && !(linkId && item.linkId === linkId),
    );
    persist();
    emit();
    return true;
  },

  /** Swap the whole ledger for a restored backup. */
  replaceAll(list) {
    transactions = normalizeList(list);
    reconcileLinks();
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
    reconcileLinks();
    persist();
    emit();
    return { added, updated };
  },
};
