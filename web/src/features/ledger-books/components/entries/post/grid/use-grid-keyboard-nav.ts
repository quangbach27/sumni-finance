import { useCallback, useRef } from 'react';

import { ADD_ROWS, createRows } from '../post-journal-entries-model';
import { CATEGORY_COL, COLUMNS } from './columns';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { KeyboardEvent } from 'react';
import type { DataSheetGridRef } from 'react-datasheet-grid';

/**
 * Cursor movement for the grid: `advance` goes to the next cell (wrapping to
 * the next row, adding rows at the end) and Enter in a cell input calls it.
 */
export function useGridKeyboardNav(
  rows: LedgerEntryRow[],
  setRows: (rows: LedgerEntryRow[]) => void,
) {
  const gridRef = useRef<DataSheetGridRef>(null);

  const addRows = useCallback(
    () => setRows([...rows, ...createRows(ADD_ROWS)]),
    [rows, setRows],
  );

  const advance = useCallback(
    (row: number, col: number) => {
      const lastCol = COLUMNS.length - 1;
      const target =
        col >= lastCol
          ? { row: row + 1, col: CATEGORY_COL }
          : { row, col: col + 1 };
      if (target.row >= rows.length) {
        addRows();
        setTimeout(() => gridRef.current?.setActiveCell(target), 0);
      } else {
        gridRef.current?.setActiveCell(target);
      }
    },
    [rows.length, addRows],
  );

  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    const cell = gridRef.current?.activeCell;
    if (
      e.key !== 'Enter' ||
      e.shiftKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      !cell ||
      !(e.target instanceof HTMLInputElement) ||
      !e.currentTarget.contains(e.target)
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    advance(
      cell.row,
      COLUMNS.findIndex((c) => c.id === cell.colId),
    );
  };

  return { gridRef, advance, addRows, onKeyDownCapture };
}
