type CurrencyConfig = {
  locale: string;
  symbol: string;
  fractionDigits: number;
  label: string;
};

/** Supported currencies. To add one, add an entry here. */
export const CURRENCIES = {
  VND: {
    locale: 'vi-VN',
    symbol: '₫',
    fractionDigits: 0,
    label: 'Đồng Việt Nam',
  },
} as const satisfies Record<string, CurrencyConfig>;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as [
  CurrencyCode,
  ...CurrencyCode[],
];

export const DEFAULT_CURRENCY: CurrencyCode = 'VND';

const getConfig = (currency: string): CurrencyConfig | undefined =>
  (CURRENCIES as Record<string, CurrencyConfig>)[currency];

const amountFormatters = new Map<string, Intl.NumberFormat>();
const currencyFormatters = new Map<string, Intl.NumberFormat>();

const getAmountFormatter = (currency: string) => {
  let formatter = amountFormatters.get(currency);
  if (!formatter) {
    const config = getConfig(currency);
    formatter = new Intl.NumberFormat(config?.locale, {
      minimumFractionDigits: config?.fractionDigits,
      maximumFractionDigits: config?.fractionDigits ?? 2,
    });
    amountFormatters.set(currency, formatter);
  }
  return formatter;
};

const getCurrencyFormatter = (currency: string) => {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    const config = getConfig(currency);
    formatter = new Intl.NumberFormat(config?.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: config?.fractionDigits,
      maximumFractionDigits: config?.fractionDigits,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
};

export const getCurrencySymbol = (currency: string): string =>
  getConfig(currency)?.symbol ?? currency;

/** Number only, formatted for the currency's locale, e.g. `32.640.000`. */
export const formatAmount = (value: number, currency: string): string =>
  getAmountFormatter(currency).format(value);

/** Amount with currency symbol, e.g. `32.640.000 ₫`. */
export const formatCurrency = (value: number, currency: string): string => {
  try {
    return getCurrencyFormatter(currency).format(value);
  } catch {
    // Unknown / invalid currency code.
    return `${formatAmount(value, currency)} ${currency}`;
  }
};

/** Parses user-typed text (as produced by `formatAmount`) back to a number. */
export const parseAmount = (text: string, currency: string): number => {
  const fractionDigits = getConfig(currency)?.fractionDigits ?? 0;
  if (fractionDigits === 0) {
    const digits = text.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  const decimal =
    getAmountFormatter(currency)
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value ?? '.';
  const [integer = '', fraction = ''] = text.split(decimal);
  const normalized = `${integer.replace(/\D/g, '')}.${fraction
    .replace(/\D/g, '')
    .slice(0, fractionDigits)}`;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

/**
 * Formats text as the user types and returns where the caret belongs: after
 * the same number of digits as before, whatever separators were added.
 */
export const formatAmountInputWithCaret = (
  text: string,
  caret: number,
  currency: string,
): { formatted: string; caret: number } => {
  const formatted = formatAmountInput(text, currency);
  const digitsBeforeCaret = text.slice(0, caret).replace(/\D/g, '').length;
  let seen = 0;
  let position = 0;
  while (position < formatted.length && seen < digitsBeforeCaret) {
    if (/\d/.test(formatted.charAt(position))) seen++;
    position++;
  }
  return { formatted, caret: position };
};

/**
 * Formats text as the user types: digits grouped with the currency's group
 * separator, plus the decimal part when the currency has fraction digits.
 * Decimals are not padded, so `12,` and `12,5` survive while typing.
 */
export const formatAmountInput = (text: string, currency: string): string => {
  const fractionDigits = getConfig(currency)?.fractionDigits ?? 0;
  const parts = getAmountFormatter(currency).formatToParts(1000.1);
  const group = parts.find((p) => p.type === 'group')?.value ?? '';
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';

  // Without decimals every non-digit is just a group separator, not a decimal.
  const segments = fractionDigits === 0 ? [text] : text.split(decimal);
  const rawInteger = segments[0] ?? '';
  const rawFraction = segments.length > 1 ? segments.slice(1).join('') : null;
  const integer = rawInteger.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, group);

  if (fractionDigits === 0 || rawFraction === null) return grouped;
  return `${grouped || '0'}${decimal}${rawFraction
    .replace(/\D/g, '')
    .slice(0, fractionDigits)}`;
};
