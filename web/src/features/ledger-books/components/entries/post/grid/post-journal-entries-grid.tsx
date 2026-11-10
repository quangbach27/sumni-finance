import { useCallback, useMemo } from 'react';

import { Plus } from 'lucide-react';
import { DataSheetGrid } from 'react-datasheet-grid';

import { Button } from '@/components/ui/button';

import { useRows } from '../../../../hooks/use-rows';
import {
  ADD_ROWS,
  computeTotals,
  createRow,
} from '../post-journal-entries-model';
import { COLUMNS } from './columns';
import { GridNavContext } from './grid-nav-context';
import KeyboardHints from './keyboard-hints';
import TotalsRow from './totals-row';
import { useAmountInputMask } from './use-amount-input-mask';
import { HEADER_HEIGHT, ROW_HEIGHT, useGridHeight } from './use-grid-height';
import { useGridKeyboardNav } from './use-grid-keyboard-nav';

import type { LedgerEntryRow } from '../post-journal-entries-schema';

type Props = { disabled?: boolean };

const GUTTER = 64;
const GUTTER_COLUMN = {
  basis: GUTTER,
  minWidth: GUTTER,
  grow: 0,
  shrink: 0,
};

/** Spreadsheet-style entry grid with totals, "add rows" and keyboard hints. */
export default function PostJournalEntriesGrid({ disabled }: Props) {
  const { rows, setRows, rowErrors } = useRows();
  const totals = useMemo(() => computeTotals(rows), [rows]);

  const { gridRef, advance, addRows, onKeyDownCapture } = useGridKeyboardNav(
    rows,
    setRows,
  );
  const { onBeforeInputCapture, onInputCapture } = useAmountInputMask(gridRef);
  const height = useGridHeight(rows.length);

  const rowClassName = useCallback(
    ({ rowIndex }: { rowIndex: number }) =>
      rowErrors?.[rowIndex] ? 'dsg-row-error' : undefined,
    [rowErrors],
  );

  return (
    <GridNavContext.Provider value={advance}>
      <div
        className="flex flex-col gap-4"
        onKeyDownCapture={onKeyDownCapture}
        onBeforeInputCapture={onBeforeInputCapture}
        onInputCapture={onInputCapture}
      >
        <div className="bg-card overflow-hidden rounded-lg border">
          <DataSheetGrid<LedgerEntryRow>
            ref={gridRef}
            value={rows}
            onChange={setRows}
            columns={COLUMNS}
            createRow={createRow}
            rowClassName={rowClassName}
            height={height}
            rowHeight={ROW_HEIGHT}
            headerRowHeight={HEADER_HEIGHT}
            gutterColumn={GUTTER_COLUMN}
            addRowsComponent={false}
            disableContextMenu
            disableExpandSelection={false}
            lockRows={disabled}
            style={{ border: 0 }}
          />
          <TotalsRow totals={totals} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={addRows}
          >
            <Plus data-icon="inline-start" />
            Thêm {ADD_ROWS} dòng
          </Button>
          <KeyboardHints />
        </div>
      </div>
    </GridNavContext.Provider>
  );
}
