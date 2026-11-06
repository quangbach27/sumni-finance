// All helpers use the browser's local time zone.

const pad = (n: number) => String(n).padStart(2, '0');

/** `Date` -> `YYYY-MM-DD` (local calendar day). */
export const toDateString = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** `YYYY-MM-DD` -> `Date` at local midnight; `undefined` when invalid. */
export const parseDateString = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : undefined;
};

/** `Date` or `YYYY-MM-DD` -> `dd/mm/yyyy`. */
export const formatDate = (value: Date | string): string => {
  const date = typeof value === 'string' ? parseDateString(value) : value;
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

export const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 0);
