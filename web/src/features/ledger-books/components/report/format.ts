import { formatAmount } from '@/lib/currency';

export const signed = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatAmount(Math.abs(value), 'VND')}`;

export const differenceTone = (value: number) =>
  value < 0 ? 'text-destructive' : value > 0 ? 'text-primary' : '';

/** Zero amounts render as a dash, as in the report design. */
export const amountOrDash = (value: number) =>
  value === 0 ? '—' : formatAmount(value, 'VND');
