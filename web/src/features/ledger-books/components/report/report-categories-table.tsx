import { Fragment } from 'react';

import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { cn } from '@/lib/utils';

import { useLedgerPeriodReport } from '../../api/get-ledger-period-report';
import { amountOrDash, differenceTone, signed } from './format';

export default function ReportCategoriesTable({
  reportUuid,
}: {
  reportUuid: string;
}) {
  const report = useLedgerPeriodReport(reportUuid);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Theo danh mục và thẻ</h3>
      <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Danh mục / Thẻ</TableHead>
              <TableHead className="text-right">
                Thu vào
                <span className="text-muted-foreground block text-xs font-normal">
                  Nợ
                </span>
              </TableHead>
              <TableHead className="text-right">
                Chi ra
                <span className="text-muted-foreground block text-xs font-normal">
                  Có
                </span>
              </TableHead>
              <TableHead className="text-right">Chênh lệch</TableHead>
              <TableHead className="w-56">Tỷ trọng giao dịch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.categories.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-6 text-center"
                >
                  Kỳ này không có bút toán nào.
                </TableCell>
              </TableRow>
            )}
            {report.categories.map((c) => (
              <Fragment key={c.categoryUuid}>
                <TableRow className="bg-muted/20">
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {amountOrDash(c.totalInflow)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {amountOrDash(c.totalOutflow)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold tabular-nums',
                      c.difference < 0 && 'text-destructive',
                    )}
                  >
                    {signed(c.difference)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={c.percentage} className="flex-1" />
                      <span className="text-muted-foreground w-10 text-right text-sm tabular-nums">
                        {Math.round(c.percentage)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
                {c.tags.map((t) => (
                  <TableRow key={t.tagUuid}>
                    <TableCell className="pl-8">
                      <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {t.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amountOrDash(t.totalInflow)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amountOrDash(t.totalOutflow)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        differenceTone(t.difference),
                      )}
                    >
                      {signed(t.difference)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Tổng cộng</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {amountOrDash(report.totalInflow)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {amountOrDash(report.totalOutflow)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {signed(report.totalInflow - report.totalOutflow)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}
