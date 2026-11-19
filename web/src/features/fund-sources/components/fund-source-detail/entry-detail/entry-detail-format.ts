import { formatDate } from '@/lib/date';

import type { LedgerEntry } from '../../../api/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** `dd/MM HH:mm` */
export const formatDayTime = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(d).slice(0, 5)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** `ACB · 7821` for a bank, the fund source name for cash. */
export const formatEntryFundSource = (entry: LedgerEntry) => {
  const { bank_code, account_number, name } = entry.fund_source;
  return bank_code && account_number
    ? `${bank_code} · ${account_number.slice(-4)}`
    : name;
};

export const isInflow = (entry: LedgerEntry) => entry.direction === 'inflow';
