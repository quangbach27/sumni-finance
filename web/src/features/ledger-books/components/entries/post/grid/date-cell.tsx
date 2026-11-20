import { useEffect, useRef } from 'react';

import DateInput from '@/components/shared/date-picker/date-input';

import { formatDate, parseTypedDate } from '@/lib/date';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { CellProps, Column } from 'react-datasheet-grid';

/** Date cell: type `31/10/2026` or pick from the calendar. */
const DateCell = ({
  rowData,
  setRowData,
  focus,
  stopEditing,
}: CellProps<LedgerEntryRow, unknown>) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focus) ref.current?.focus();
    else ref.current?.blur();
  }, [focus]);

  return (
    <div className="relative size-full">
      <DateInput
        ref={ref}
        value={rowData.date}
        onChange={(date) => setRowData({ ...rowData, date })}
        className="h-full rounded-none border-0 bg-transparent pr-8 pl-1 text-center text-sm shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent"
        style={{ pointerEvents: focus ? 'auto' : 'none' }}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Enter') stopEditing({ nextRow: true });
        }}
      />
    </div>
  );
};

export const dateColumn: Partial<Column<LedgerEntryRow, unknown, string>> = {
  component: DateCell,
  keepFocus: true,
  disableKeys: true,
  copyValue: ({ rowData }) => formatDate(rowData.date),
  pasteValue: ({ rowData, value }) => ({
    ...rowData,
    date:
      parseTypedDate(
        value,
        rowData.date ? Number(rowData.date.slice(0, 4)) : undefined,
      ) ?? value,
  }),
  deleteValue: ({ rowData }) => ({ ...rowData, date: '' }),
  isCellEmpty: ({ rowData }) => !rowData.date,
};
