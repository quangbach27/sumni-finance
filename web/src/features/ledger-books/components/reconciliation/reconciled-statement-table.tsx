import { TableCell, TableRow } from '@/components/ui/table';

import { formatAmount } from '@/lib/currency';

import { DifferenceValue, ReconciledBadge } from './statement-cells';
import { CURRENCY } from './statement-row';
import StatementSystemCells from './statement-system-cells';
import StatementTableFrame from './statement-table-frame';

import type { StatementRow } from './statement-row';

/** Read-only table of statements once the whole period is reconciled. */
export default function ReconciledStatementTable({
  rows,
}: {
  rows: StatementRow[];
}) {
  return (
    <StatementTableFrame rows={rows}>
      {rows.map((r) => (
        <TableRow key={r.statement.uuid} className="tabular-nums">
          <StatementSystemCells row={r} />
          <TableCell className="text-right font-semibold">
            {formatAmount(r.actualBalance ?? 0, CURRENCY)}
          </TableCell>
          <TableCell className="text-right">
            <DifferenceValue difference={r.difference} />
          </TableCell>
          <TableCell className="pr-6">
            <ReconciledBadge />
          </TableCell>
        </TableRow>
      ))}
    </StatementTableFrame>
  );
}
