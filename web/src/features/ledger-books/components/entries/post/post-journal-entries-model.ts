import { isApiError } from '@/lib/clients';
import { DEFAULT_CURRENCY, formatAmount } from '@/lib/currency';

import { isFilled } from './post-journal-entries-schema';

import type { LedgerEntryDraft } from '../../../api/post-ledger-entries';
import type {
  LedgerEntriesFormValues,
  LedgerEntryRow,
} from './post-journal-entries-schema';
import type { UseFormSetError } from 'react-hook-form';

export { isFilled };

export const INITIAL_ROWS = 8;
export const ADD_ROWS = 10;

export const createRow = (): LedgerEntryRow => ({
  date: '',
  categoryUuid: '',
  tagUuid: '',
  description: '',
  inflow: 0,
  outflow: 0,
});

export const createRows = (count: number): LedgerEntryRow[] =>
  Array.from({ length: count }, createRow);

/** Keeps one amount per row: editing Nợ clears Có and vice versa. */
export const normalizeRows = (next: LedgerEntryRow[], prev: LedgerEntryRow[]) =>
  next.map((row, i) => {
    if (row.inflow > 0 && row.outflow > 0) {
      const before = prev.at(i);
      return before && before.inflow !== row.inflow
        ? { ...row, outflow: 0 }
        : { ...row, inflow: 0 };
    }
    return row;
  });

export type Totals = { inflow: number; outflow: number; count: number };

export const computeTotals = (rows: LedgerEntryRow[]): Totals =>
  rows.reduce<Totals>(
    (acc, row) =>
      isFilled(row)
        ? {
            inflow: acc.inflow + row.inflow,
            outflow: acc.outflow + row.outflow,
            count: acc.count + 1,
          }
        : acc,
    { inflow: 0, outflow: 0, count: 0 },
  );

/** Fund source balance once the batch is posted. */
export const getBalanceAfter = (
  currentBalance: number,
  totals: Pick<Totals, 'inflow' | 'outflow'>,
) => currentBalance + totals.inflow - totals.outflow;

/** `+1.000` for inflow (Nợ), `−1.000` for outflow (Có). */
export const formatSignedAmount = (
  value: number,
  direction: 'inflow' | 'outflow',
) =>
  `${direction === 'inflow' ? '+' : '−'}${formatAmount(value, DEFAULT_CURRENCY)}`;

/** Filled rows as API drafts, plus each draft's form row index (for mapping server errors). */
export const toDrafts = (rows: LedgerEntryRow[]) => {
  const filled = rows.filter(isFilled);
  const drafts: LedgerEntryDraft[] = filled.map((row) => ({
    date: row.date,
    description: row.description.trim(),
    amount: row.inflow > 0 ? row.inflow : row.outflow,
    direction: row.inflow > 0 ? 'inflow' : 'outflow',
    categoryUuid: row.tagUuid || row.categoryUuid || undefined,
  }));
  const rowIndexes = rows.flatMap((row, i) => (isFilled(row) ? [i] : []));
  return { drafts, rowIndexes };
};

/** Puts server validation errors back on the rows they came from. */
export const mapServerErrorsToRows = (
  error: unknown,
  rowIndexes: number[],
  setError: UseFormSetError<LedgerEntriesFormValues>,
) => {
  if (!isApiError(error)) return;
  // Entry index in the request is the position among the filled rows.
  rowIndexes.forEach((rowIndex, i) => {
    const detail = error.detailsFor(String(i)).at(0);
    if (detail) {
      setError(`rows.${rowIndex}.description`, {
        type: 'server',
        message: detail.message,
      });
    }
  });
};
