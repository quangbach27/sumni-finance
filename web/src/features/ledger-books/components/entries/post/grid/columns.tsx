import { createTextColumn, keyColumn } from 'react-datasheet-grid';

import {
  DEFAULT_CURRENCY,
  formatAmount,
  formatAmountInput,
  parseAmount,
} from '@/lib/currency';

import { categoryColumn } from './category-cell';
import { dateColumn } from './date-cell';
import { tagColumn } from './tag-cell';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { Column } from 'react-datasheet-grid';

// Fixed widths so the totals row below the grid lines up with its columns.
export const WIDTH = { date: 144, text: 200, amount: 160 } as const;

/** Column index the cursor jumps back to after the last column. */
export const CATEGORY_COL = 1;

const fixedWidth = (width: number) => ({
  basis: width,
  grow: 0,
  shrink: 0,
  minWidth: width,
});

const amountColumn = createTextColumn<number>({
  alignRight: true,
  deletedValue: 0,
  parseUserInput: (text) => parseAmount(text, DEFAULT_CURRENCY),
  parsePastedValue: (text) => parseAmount(text, DEFAULT_CURRENCY),
  formatBlurredInput: (value) =>
    value ? formatAmount(value, DEFAULT_CURRENCY) : '',
  formatInputOnFocus: (value) =>
    value ? formatAmountInput(String(value), DEFAULT_CURRENCY) : '',
  formatForCopy: (value) => String(value),
});

const plainText = createTextColumn<string>({
  deletedValue: '',
  parseUserInput: (text) => text,
  parsePastedValue: (text) => text,
  formatBlurredInput: (value) => value,
  formatInputOnFocus: (value) => value,
  formatForCopy: (value) => value,
});

function HeaderTitle({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="block text-right leading-tight">
      {label}
      <span className="text-muted-foreground block text-xs font-normal">
        {hint}
      </span>
    </span>
  );
}

/** Ids of the columns that hold an amount. */
export const AMOUNT_COLUMN_IDS = ['inflow', 'outflow'];

export const COLUMNS: Partial<Column<LedgerEntryRow, any, any>>[] = [
  { ...dateColumn, id: 'date', title: 'Ngày', ...fixedWidth(WIDTH.date) },
  {
    ...categoryColumn,
    id: 'category',
    title: 'Danh mục',
    ...fixedWidth(WIDTH.text),
  },
  { ...tagColumn, id: 'tag', title: 'Thẻ', ...fixedWidth(WIDTH.text) },
  {
    ...keyColumn<LedgerEntryRow, 'description'>('description', plainText),
    id: 'description',
    title: 'Diễn giải',
    basis: 280,
    grow: 1,
    shrink: 1,
    minWidth: 220,
  },
  {
    ...keyColumn<LedgerEntryRow, 'inflow'>('inflow', amountColumn),
    id: 'inflow',
    title: <HeaderTitle label="Nợ" hint="Thu vào" />,
    ...fixedWidth(WIDTH.amount),
    cellClassName: 'text-primary',
  },
  {
    ...keyColumn<LedgerEntryRow, 'outflow'>('outflow', amountColumn),
    id: 'outflow',
    title: <HeaderTitle label="Có" hint="Chi ra" />,
    ...fixedWidth(WIDTH.amount),
    cellClassName: 'text-destructive',
  },
];
