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
