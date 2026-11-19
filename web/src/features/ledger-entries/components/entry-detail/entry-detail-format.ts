import { formatDate } from '@/lib/date';

import type { LedgerEntry } from '../../api/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** `dd/MM HH:mm` */
export const formatDayTime = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** `ACB · 7821` for a bank, the fund source name for cash. */
export const formatEntryFundSource = (entry: LedgerEntry) => {
  const { bank_code, account_number, name } = entry.fund_source;
  return bank_code && account_number
    ? `${bank_code} · ${account_number.slice(-4)}`
    : name;
};

/** Strikethrough for voided rows; 2px so it stays visible on coloured text. */
export const VOIDED_STRIKE_CLASS_NAME = 'line-through decoration-2';

export const isInflow = (entry: LedgerEntry) => entry.direction === 'inflow';

/** Only a posted, non-reversal entry of an open period can be cancelled. */
export const canCancelEntry = (entry: LedgerEntry) =>
  entry.status === 'posted' &&
  entry.kind === 'normal' &&
  entry.ledger_period.status === 'opened';
