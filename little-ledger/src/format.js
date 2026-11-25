const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 1234.5 -> "1,234.50" */
export function formatMoney(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '0.00';
  const fixed = Math.abs(value).toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${decimals}`;
}

export function toISO(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO() {
  return toISO(new Date());
}

/** "2026-11-23" -> "2026-11" */
export function monthKeyOf(isoDate) {
  return String(isoDate).slice(0, 7);
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

/** "2026-11" -> "November 2026" */
export function formatMonth(monthKey) {
  const [year, month] = String(monthKey).split('-');
  const name = MONTHS[Number(month) - 1] || monthKey;
  return `${name} ${year}`;
}

/** "2026-11-23" -> "Nov 23, 2026" */
export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const name = MONTHS[(month || 1) - 1] || '';
  return `${name.slice(0, 3)} ${day}, ${year}`;
}

/** "2026-11-23" -> "11/23" */
export function formatDateShort(isoDate) {
  const [, month, day] = String(isoDate).split('-');
  return `${month}/${day}`;
}
