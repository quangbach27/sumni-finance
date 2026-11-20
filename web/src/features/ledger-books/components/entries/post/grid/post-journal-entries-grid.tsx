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
import TotalsRow from './totals-row';
import { useAmountInputMask } from './use-amount-input-mask';
import { HEADER_HEIGHT, ROW_HEIGHT, useGridHeight } from './use-grid-height';
import { useGridKeyboardNav } from './use-grid-keyboard-nav';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { ReactNode } from 'react';

type Props = {
  disabled?: boolean;
  /** Left side of the footer (e.g. balance summary). */
  summary?: ReactNode;
  children?: ReactNode;
};

const GUTTER = 48;
const GUTTER_COLUMN = {
  basis: GUTTER,
  minWidth: GUTTER,
  grow: 0,
  shrink: 0,
};

/** Spreadsheet-style entry grid with totals and one action line (add rows + children). */
export default function PostJournalEntriesGrid({
  disabled,
  summary,
  children,
}: Props) {
  const { rows, setRows, rowErrors } = useRows();
  const totals = useMemo(() => computeTotals(rows), [rows]);

  const { gridRef, advance, addRows, onKeyDownCapture } = useGridKeyboardNav(
    rows,
    setRows,
  );
  const { onBeforeInputCapture, onInputCapture } = useAmountInputMask(gridRef);
  const { ref: slotRef, height } = useGridHeight<HTMLDivElement>();

  const rowClassName = useCallback(
    ({ rowIndex }: { rowIndex: number }) =>
      rowErrors?.[rowIndex] ? 'dsg-row-error' : undefined,
    [rowErrors],
  );

  return (
    <GridNavContext.Provider value={advance}>
      <div
        className="flex min-h-0 flex-1 flex-col gap-2"
        onKeyDownCapture={onKeyDownCapture}
        onBeforeInputCapture={onBeforeInputCapture}
        onInputCapture={onInputCapture}
      >
        <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
          <div ref={slotRef} className="min-h-0 flex-1">
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
          </div>
          <TotalsRow totals={totals} summary={summary} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={addRows}
          >
            <Plus data-icon="inline-start" />
            Thêm {ADD_ROWS} dòng
          </Button>
          <div className="flex items-center gap-2">{children}</div>
        </div>
      </div>
    </GridNavContext.Provider>
  );
}
