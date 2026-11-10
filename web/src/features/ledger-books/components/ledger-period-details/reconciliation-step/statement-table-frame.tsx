import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import { CURRENCY, signed } from './statement-row';

import type { StatementRow } from './statement-row';
import type { ReactNode } from 'react';

function TotalsRow({ rows }: { rows: StatementRow[] }) {
  const total = (pick: (r: StatementRow) => number | undefined) =>
    rows.reduce((sum, r) => sum + (pick(r) ?? 0), 0);
  const difference = total((r) => r.difference);
  return (
    <TableRow className="bg-muted/50 hover:bg-muted/50 font-semibold tabular-nums">
      <TableCell className="pl-6">Tổng cộng</TableCell>
      <TableCell className="text-right">
        {formatAmount(
          total((r) => r.statement.openingBalance),
          CURRENCY,
        )}
      </TableCell>
      <TableCell className="text-right">
        {signed(total((r) => r.movement))}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(
          total((r) => r.closingBalance),
          CURRENCY,
        )}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(
          total((r) => r.actualBalance),
          CURRENCY,
        )}
      </TableCell>
      <TableCell className={cn('text-right', difference && 'text-destructive')}>
        {signed(difference)}
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

/** Column header and totals row shared by the statement tables. */
export default function StatementTableFrame({
  rows,
  children,
}: {
  rows: StatementRow[];
  children: ReactNode;
}) {
  return (
    <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="pl-6">Nguồn quỹ</TableHead>
            <TableHead className="text-right">Đầu kỳ</TableHead>
            <TableHead className="text-right">Biến động</TableHead>
            <TableHead className="text-right">Số dư hệ thống</TableHead>
            <TableHead className="text-right">Số dư thực tế</TableHead>
            <TableHead className="text-right">Chênh lệch</TableHead>
            <TableHead className="pr-6">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {children}
          <TotalsRow rows={rows} />
        </TableBody>
      </Table>
    </div>
  );
}

export const STATEMENT_TABLE_COLUMNS = 7;
