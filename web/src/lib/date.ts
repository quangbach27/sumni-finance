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

/** Whole calendar days from today until `date` (negative when past). */
export const daysUntil = (date: Date, from: Date = new Date()): number =>
  Math.round(
    (startOfDay(date).getTime() - startOfDay(from).getTime()) / 86_400_000,
  );

/**
 * Parses typed text into `YYYY-MM-DD`. Accepts `d/m`, `d/m/yy`, `d/m/yyyy`
 * (separators `/ - .`) and digits only (`3110`, `31102026`). A missing year
 * uses `defaultYear`. Returns `undefined` when the text is not a real date.
 */
export const parseTypedDate = (
  text: string,
  defaultYear: number = new Date().getFullYear(),
): string | undefined => {
  const value = text.trim();
  let day: number, month: number, year: number;

  const parts = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(value);
  if (parts) {
    day = Number(parts[1]);
    month = Number(parts[2]);
    year = parts[3] ? Number(parts[3]) : defaultYear;
  } else {
    const digits = /^(\d{2})(\d{2})(\d{2}|\d{4})?$/.exec(value);
    if (!digits) return undefined;
    day = Number(digits[1]);
    month = Number(digits[2]);
    year = digits[3] ? Number(digits[3]) : defaultYear;
  }
  if (year < 100) year += 2000;

  const date = parseDateString(`${year}-${pad(month)}-${pad(day)}`);
  return date ? toDateString(date) : undefined;
};

/** `dd/mm` within the current year, `dd/mm/yyyy` otherwise; the raw text when not a date. */
export const formatDateShort = (value: string): string => {
  const date = parseDateString(value);
  if (!date) return value;
  const full = formatDate(date);
  return date.getFullYear() === new Date().getFullYear()
    ? full.slice(0, 5)
    : full;
};
