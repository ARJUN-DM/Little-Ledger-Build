/**
 * Thin wrapper around the browser's Storage (localStorage).
 * Every value is stored as JSON under a namespaced key, and reads fall back
 * to an in-memory map when Storage is unavailable (private mode, file://, ...).
 */
const NAMESPACE = 'little-ledger';

const memory = new Map();

function backing() {
  try {
    const probe = '__little_ledger_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (error) {
    console.warn('[Little Ledger] Storage unavailable, using memory fallback.', error);
    return null;
  }
}

const backingStore = backing();

export const Storage = {
  /** False when the browser blocks localStorage, so entries only live for this session. */
  available: Boolean(backingStore),

  get(key, fallback = null) {
    const name = `${NAMESPACE}/${key}`;
    try {
      const raw = backingStore ? backingStore.getItem(name) : memory.get(name);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`[Little Ledger] Could not read "${key}".`, error);
      return fallback;
    }
  },

  set(key, value) {
    const name = `${NAMESPACE}/${key}`;
    const raw = JSON.stringify(value);
    try {
      if (backingStore) backingStore.setItem(name, raw);
      else memory.set(name, raw);
      return true;
    } catch (error) {
      console.warn(`[Little Ledger] Could not write "${key}".`, error);
      return false;
    }
  },
};
