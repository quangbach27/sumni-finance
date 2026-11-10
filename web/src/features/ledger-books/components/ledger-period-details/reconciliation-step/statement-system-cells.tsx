import { TableCell } from '@/components/ui/table';

import { formatAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import FundSourceInitials from '../../shared/fund-source-initials';
import { CURRENCY, signed } from './statement-row';

import type { StatementRow } from './statement-row';

/** First four cells of a statement row: fund source, opening, movement, system balance. */
export default function StatementSystemCells({ row }: { row: StatementRow }) {
  return (
    <>
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <FundSourceInitials name={row.name} />
          <div>
            <p className="font-semibold">{row.name}</p>
            <p className="text-muted-foreground text-sm">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-right">
        {formatAmount(row.statement.openingBalance, CURRENCY)}
      </TableCell>
      <TableCell
        className={cn(
          'text-right',
          row.movement >= 0 ? 'text-primary' : 'text-destructive',
        )}
      >
        {signed(row.movement)}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(row.closingBalance, CURRENCY)}
      </TableCell>
    </>
  );
}
