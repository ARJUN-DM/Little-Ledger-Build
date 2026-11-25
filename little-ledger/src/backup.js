import { normalizeList } from './store.js';
import { todayISO } from './format.js';

export const BACKUP_VERSION = 1;

/** The saved document: enough to rebuild the ledger exactly. */
export function buildBackup(list) {
  return {
    v: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: list,
  };
}

export function backupFilename(stamp = todayISO()) {
  return `little-ledger-backup-${stamp}.json`;
}

export function csvFilename(stamp = todayISO()) {
  return `little-ledger-${stamp}.csv`;
}

/**
 * Reads a backup file. Accepts the versioned envelope and the bare array older
 * builds wrote; every row still goes through the store's normalizer, so a
 * malformed file yields nothing rather than half an import.
 */
export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const rows = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' && Array.isArray(raw.transactions) ? raw.transactions : null);

  if (!rows) return { ok: false, error: 'That file is not a Little Ledger backup.' };

  const transactions = normalizeList(rows);
  if (!transactions.length) {
    return {
      ok: false,
      error: rows.length
        ? 'No usable entries in that file.'
        : 'That backup has no entries.',
    };
  }

  return { ok: true, transactions };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** date,type,category,amount,note — with a BOM so Excel reads it as UTF-8. */
export function toCSV(list) {
  const rows = [
    ['Date', 'Type', 'Category', 'Amount', 'Note'],
    ...list.map((item) => [
      item.date,
      item.type,
      item.category,
      Number(item.amount).toFixed(2),
      item.note || '',
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Saves text as a file. Android and desktop get a normal download; iOS gets the
 * share sheet, which is how a downloaded file reaches the Files app there.
 * Resolves to 'downloaded', 'shared', or 'cancelled'.
 */
export async function saveTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });

  if (isIOS() && typeof navigator.share === 'function' && typeof File === 'function') {
    const file = new File([blob], filename, { type: mime });
    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      } catch (error) {
        if (error && error.name === 'AbortError') return 'cancelled';
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
