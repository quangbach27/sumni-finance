import { AlertTriangle } from 'lucide-react';

import { TableCell, TableRow } from '@/components/ui/table';

import {
  ActualBalanceInput,
  ConfirmButton,
  DifferenceValue,
  MismatchActions,
  MismatchBadge,
  ReconciledBadge,
} from './statement-cells';
import { mismatchMessage } from './statement-row';
import StatementSystemCells from './statement-system-cells';
import StatementTableFrame, {
  STATEMENT_TABLE_COLUMNS,
} from './statement-table-frame';

import type { StatementListProps, StatementRow } from './statement-row';

type RowProps = Omit<StatementListProps, 'rows'> & { row: StatementRow };

function StatusCell({
  row,
  disabled,
  confirmingStatementUuid,
  onConfirm,
}: Omit<RowProps, 'onActualBalanceChange'>) {
  switch (row.status) {
    case 'reconciled':
      return <ReconciledBadge />;
    case 'mismatch':
      return <MismatchBadge />;
    case 'match':
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="text-muted-foreground text-sm">
            Khớp, chờ xác nhận
          </span>
          <ConfirmButton
            size="sm"
            confirming={confirmingStatementUuid === row.statement.uuid}
            disabled={disabled || confirmingStatementUuid !== undefined}
            onClick={() => onConfirm(row.statement.uuid)}
          />
        </div>
      );
    case 'empty':
      return row.isTyping ? null : (
        <span className="text-muted-foreground text-sm">Chưa nhập</span>
      );
  }
}

function UnreconciledStatementRow(props: RowProps) {
  const { row, disabled, onActualBalanceChange } = props;
  const message = row.error ?? mismatchMessage(row);
  return (
    <>
      <TableRow className="tabular-nums">
        <StatementSystemCells row={row} />
        <TableCell className="text-right">
          <ActualBalanceInput
            row={row}
            disabled={disabled}
            className="ml-auto w-40"
            onChange={(text) => onActualBalanceChange(row.statement.uuid, text)}
          />
        </TableCell>
        <TableCell className="text-right">
          <DifferenceValue difference={row.difference} />
        </TableCell>
        <TableCell className="pr-6">
          <StatusCell {...props} />
        </TableCell>
      </TableRow>
      {message && (
        <TableRow className="bg-destructive/5 border-l-destructive hover:bg-destructive/5 border-l-4">
          <TableCell
            colSpan={STATEMENT_TABLE_COLUMNS}
            className="px-6 whitespace-normal"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-start gap-2 text-sm">
                <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                <span>{message}</span>
              </p>
              {row.status === 'mismatch' && (
                <MismatchActions className="flex gap-2" />
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** Desktop table where the user enters real balances and confirms each statement. */
export default function UnreconciledStatementTable({
  rows,
  ...rest
}: StatementListProps) {
  return (
    <StatementTableFrame rows={rows}>
      {rows.map((r) => (
        <UnreconciledStatementRow key={r.statement.uuid} row={r} {...rest} />
      ))}
    </StatementTableFrame>
  );
}
