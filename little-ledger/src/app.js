import { Storage } from './storage.js';
import { store } from './store.js';
import { renderHome } from './screens/home.js';
import { renderTransactions } from './screens/transactions.js';
import { renderMonths, renderMonth } from './screens/months.js';
import { renderDetail } from './screens/detail.js';
import { renderSettings } from './screens/settings.js';
import { cleanName, ledgerTitle, needsWelcome, renderWelcome } from './screens/welcome.js';
import { renderInstall } from './screens/install.js';
import { openSheet } from './transactionForm.js';
import { backupFilename, buildBackup, csvFilename, parseBackup, saveTextFile, toCSV } from './backup.js';

const screenEl = document.getElementById('screen');
const tabbarEl = document.getElementById('tabbar');

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'months', label: 'Months' },
];

const NAME_KEY = 'name';
/** Set when the browser reports a finished install, so a reinstall asks again. */
const FRESH_KEY = 'fresh-install';

/** True when the app runs from the home screen instead of a browser tab. */
function isInstalled() {
  if (window.navigator.standalone === true) return true;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches;
}

/** iOS never fires beforeinstallprompt, so it gets written instructions instead. */
function isIOS() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

const savedName = Storage.get(NAME_KEY);
let name = typeof savedName === 'string' ? cleanName(savedName) : '';
let welcome = { error: '', draft: '' };
let install = { message: '', canPrompt: false };
let deferredInstall = null;

/** A browser visitor sees the install page unless they chose the browser once. */
function startRoute() {
  if (!isInstalled()) {
    return Storage.get('browser-mode') === true
      ? { name: 'home', id: null, month: null, back: null }
      : { name: 'install', id: null, month: null, back: null };
  }
  return {
    name: needsWelcome({ freshInstall: Storage.get(FRESH_KEY) === true, name }) ? 'welcome' : 'home',
    id: null,
    month: null,
    back: null,
  };
}

let route = startRoute();
let confirmingDelete = false;
let lastKey = '';
let settings = { pending: null, message: '', error: '', nameDraft: '', nameError: '' };
let noticeDismissed = Storage.get('notice-dismissed') === true;

function tabsHTML(active) {
  return TABS.map((tab) => `
    <button
      type="button"
      class="tab${tab.id === active ? ' is-active' : ''}"
      data-action="tab"
      data-tab="${tab.id}"
      ${tab.id === active ? 'aria-current="page"' : ''}
    >${tab.label}</button>
  `).join('');
}

function render() {
  const list = store.all();
  const key = `${route.name}:${route.id || route.month || ''}`;

  screenEl.classList.toggle('screen--bleed', route.name === 'welcome' || route.name === 'install');

  if (route.name === 'welcome') {
    screenEl.innerHTML = renderWelcome(welcome);
    tabbarEl.hidden = true;
  } else if (route.name === 'install') {
    screenEl.innerHTML = renderInstall(install);
    tabbarEl.hidden = true;
  } else if (route.name === 'detail') {
    const transaction = store.get(route.id);
    if (!transaction) {
      go(route.back || { name: 'transactions' });
      return;
    }
    screenEl.innerHTML = renderDetail(transaction, {
      confirming: confirmingDelete,
      backLabel: route.back && route.back.name === 'month' ? 'Months' : 'Ledger',
    });
    tabbarEl.hidden = true;
  } else if (route.name === 'month') {
    screenEl.innerHTML = renderMonth(list, route.month);
    tabbarEl.hidden = true;
  } else if (route.name === 'settings') {
    screenEl.innerHTML = renderSettings(list, settings);
    tabbarEl.hidden = true;
  } else {
    screenEl.innerHTML = route.name === 'home'
      ? renderHome(list, { showNotice: !noticeDismissed, name: isInstalled() ? name : '' })
      : route.name === 'months'
        ? renderMonths(list)
        : renderTransactions(list);
    tabbarEl.hidden = false;
    tabbarEl.innerHTML = tabsHTML(route.name);
  }

  if (key !== lastKey) {
    screenEl.scrollTop = 0;
    lastKey = key;
  }
}

function go(next) {
  route = next;
  confirmingDelete = false;
  render();
}

/** The browser's Install button, or a two-step guide when no prompt is available. */
async function installApp() {
  if (!deferredInstall) {
    install.message = isIOS()
      ? 'Tap Share, then \u201cAdd to Home Screen\u201d.'
      : 'Open the browser menu and choose \u201cInstall app\u201d or \u201cAdd to Home screen\u201d.';
    render();
    return;
  }

  const prompt = deferredInstall;
  deferredInstall = null;
  install.canPrompt = false;
  prompt.prompt();

  const choice = await prompt.userChoice.catch(() => null);
  install.message = choice && choice.outcome === 'accepted'
    ? 'Installed \u2014 open Ledger from your home screen.'
    : 'Install dismissed. The button stays here whenever you want it.';
  render();
}

/** Writes the name on the cover, then opens the ledger for good. */
function saveSettingsName() {
  const field = document.getElementById('s-name');
  const raw = field ? field.value : settings.nameDraft;
  const value = cleanName(raw);

  if (!value) {
    settings.nameError = 'Write a name on the cover first.';
    settings.nameDraft = raw;
    settings.message = '';
    render();
    return;
  }

  name = value;
  Storage.set(NAME_KEY, name);
  settings.nameDraft = name;
  settings.nameError = '';
  settings.message = 'Cover name saved.';
  render();
}

function saveName() {
  const field = document.getElementById('w-name');
  const raw = field ? field.value : '';
  const value = cleanName(raw);

  if (!value) {
    welcome = { error: 'Write a name on the cover first.', draft: raw };
    render();
    return;
  }

  name = value;
  Storage.set(NAME_KEY, name);
  Storage.set(FRESH_KEY, false);
  welcome = { error: '', draft: '' };
  route = { name: 'home', id: null, month: null, back: null };
  render();
}

/** Say so when the browser blocks localStorage, instead of losing entries silently. */
function mountStorageNotice() {
  if (Storage.available) return;
  const notice = document.createElement('p');
  notice.className = 'storage-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = 'Private mode — entries last for this session only';
  document.body.appendChild(notice);
}

/** Saves the ledger as a backup (.json) or a spreadsheet-friendly .csv file. */
async function exportLedger(kind) {
  const csv = kind === 'csv';
  const filename = csv ? csvFilename() : backupFilename();
  const text = csv ? toCSV(store.all()) : JSON.stringify(buildBackup(store.all()), null, 2);

  try {
    const outcome = await saveTextFile(filename, text, csv ? 'text/csv' : 'application/json');
    if (outcome === 'cancelled') return;
    settings.message = outcome === 'shared' ? `${filename} shared.` : `Saved ${filename}.`;
    settings.error = '';
  } catch (error) {
    console.warn('[Little Ledger] Could not save the export.', error);
    settings.message = '';
    settings.error = 'Could not save that file. Try again.';
  }
  render();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const { protocol, hostname } = window.location;
  const secure = protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
  if (!secure) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('[Little Ledger] Service worker registration failed.', error);
    });
  });
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  switch (target.dataset.action) {
    case 'tab':
      if (route.name !== 'detail' && route.name !== 'month') go({ name: target.dataset.tab });
      break;
    case 'add':
      openSheet({ mode: 'create', onDone: render });
      break;
    case 'open': {
      const from = route.name === 'detail' ? route.back : route;
      go({ name: 'detail', id: target.dataset.id, back: from });
      break;
    }
    case 'open-month':
      go({ name: 'month', month: target.dataset.month });
      break;
    case 'back':
      go(route.back || { name: 'transactions' });
      break;
    case 'back-months':
      go({ name: 'months' });
      break;
    case 'open-settings':
      settings = { pending: null, message: '', error: '', nameDraft: name, nameError: '' };
      go({ name: 'settings', back: route.name === 'detail' || route.name === 'month' ? route.back : route });
      history.pushState({ view: 'settings' }, '');
      break;
    case 'settings-back':
      go(route.back || { name: 'home' });
      break;
    case 'welcome-save':
      saveName();
      break;
    case 'install-app':
      await installApp();
      break;
    case 'continue-browser':
      Storage.set('browser-mode', true);
      go({ name: 'home' });
      break;
    case 'save-name':
      saveSettingsName();
      break;
    case 'dismiss-notice':
      noticeDismissed = true;
      Storage.set('notice-dismissed', true);
      render();
      break;
    case 'export-json':
      await exportLedger('json');
      break;
    case 'export-csv':
      await exportLedger('csv');
      break;
    case 'import-file': {
      const input = document.getElementById('import-input');
      if (input) input.click();
      break;
    }
    case 'import-merge': {
      if (!settings.pending) break;
      const pending = settings.pending;
      settings.pending = null;
      const { added, updated } = store.mergeAll(pending.transactions);
      settings.error = '';
      settings.message = `Merged: ${added} new ${added === 1 ? 'entry' : 'entries'}${updated ? `, ${updated} updated` : ''}.`;
      render();
      break;
    }
    case 'import-replace': {
      if (!settings.pending) break;
      const count = store.replaceAll(settings.pending.transactions);
      settings.pending = null;
      settings.error = '';
      settings.message = `Ledger replaced with ${count} ${count === 1 ? 'entry' : 'entries'}.`;
      render();
      break;
    }
    case 'import-cancel':
      settings.pending = null;
      settings.error = '';
      render();
      break;
    case 'edit': {
      const transaction = store.get(target.dataset.id);
      if (transaction) openSheet({ mode: 'edit', transaction, onDone: render });
      break;
    }
    case 'delete':
      confirmingDelete = true;
      render();
      break;
    case 'delete-cancel':
      confirmingDelete = false;
      render();
      break;
    case 'delete-confirm': {
      const back = route.back || { name: 'transactions' };
      store.remove(target.dataset.id);
      go(back);
      break;
    }
    default:
      break;
  }
});

document.addEventListener('change', async (event) => {
  const input = event.target;
  if (!input || input.id !== 'import-input') return;

  const file = input.files && input.files[0];
  if (!file) return;

  let text = '';
  try {
    text = await file.text();
  } catch (error) {
    console.warn('[Little Ledger] Could not read the backup file.', error);
    settings.message = '';
    settings.error = 'Could not read that file.';
    settings.pending = null;
    render();
    return;
  }

  const result = parseBackup(text);
  if (!result.ok) {
    settings.message = '';
    settings.error = result.error;
    settings.pending = null;
    render();
    return;
  }

  settings.pending = {
    name: file.name || 'backup.json',
    count: result.transactions.length,
    transactions: result.transactions,
  };
  settings.message = '';
  settings.error = '';
  render();
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!target) return;

  if (target.id === 'w-name') {
    const preview = document.getElementById('w-preview');
    if (!preview) return;
    const typed = cleanName(target.value);
    preview.textContent = typed ? ledgerTitle(typed) : 'Your name\u2019s Ledger';
    return;
  }

  if (target.id === 's-name') {
    settings.nameDraft = target.value;
    const preview = document.getElementById('s-preview');
    if (preview) preview.textContent = ledgerTitle(target.value);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target && event.target.id === 'w-name') {
    event.preventDefault();
    saveName();
    return;
  }

  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.closest) return;

  const monthCard = event.target.closest('[data-action="open-month"]');
  if (monthCard) {
    event.preventDefault();
    go({ name: 'month', month: monthCard.dataset.month });
    return;
  }

  const row = event.target.closest('[data-action="open"]');
  if (!row) return;
  event.preventDefault();
  go({ name: 'detail', id: row.dataset.id, back: route.name === 'detail' ? route.back : route });
});

/** The phone's back button leaves Settings for Home instead of closing the app. */
window.addEventListener('popstate', () => {
  if (route.name === 'settings') go({ name: 'home' });
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstall = event;
  install.canPrompt = true;
  install.message = '';
  if (route.name === 'install') render();
});

window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  install.canPrompt = false;
  install.message = 'Installed \u2014 open Ledger from your home screen.';
  // Storage survives an uninstall on many phones, so mark this install as new.
  Storage.set(FRESH_KEY, true);
  if (route.name === 'install') render();
});

store.subscribe(render);
render();
mountStorageNotice();
registerServiceWorker();
