import { useSuspenseQuery } from '@tanstack/react-query';

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

import { formatAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import { getCategoriesQueryOptions } from '../../../api/get-categories';
import { useLedgerPeriod } from '../../../api/get-ledger-period';

import type { CategorySummary } from '../../../api/types';

type Row = CategorySummary & {
  name: string;
  difference: number;
  share: number;
};

const UNCATEGORIZED = 'Chưa phân loại';

const signed = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatAmount(Math.abs(value), 'VND')}`;

const differenceTone = (value: number) =>
  value < 0 ? 'text-destructive' : value > 0 ? 'text-primary' : '';

/** Entries per top-level category; sub-category entries are already counted in their parent. */
export default function CategorySummaryTable({
  periodUuid,
}: {
  periodUuid: string;
}) {
  const { categorySummaries: summaries } = useLedgerPeriod(periodUuid);
  const { data } = useSuspenseQuery(getCategoriesQueryOptions());
  const names = new Map(data.items.map((c) => [c.uuid, c.name]));

  const totalCount = summaries.reduce((sum, s) => sum + s.entryCount, 0);
  const totalInflow = summaries.reduce((sum, s) => sum + s.totalInflow, 0);
  const totalOutflow = summaries.reduce((sum, s) => sum + s.totalOutflow, 0);

  const rows: Row[] = summaries.map((s) => ({
    ...s,
    name: s.categoryUuid
      ? (names.get(s.categoryUuid) ?? UNCATEGORIZED)
      : UNCATEGORIZED,
    difference: s.totalInflow - s.totalOutflow,
    share: totalCount ? Math.round((s.entryCount / totalCount) * 100) : 0,
  }));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          Danh mục{' '}
          <span className="text-muted-foreground font-normal">
            · {rows.length}
          </span>
        </h3>
        <p className="text-muted-foreground text-sm">
          Thu vào = Nợ (+) · Chi ra = Có (−)
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-2xl border p-6 text-center text-sm">
          Chưa có bút toán nào trong kỳ này.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <li
                key={r.categoryUuid ?? 'uncategorized'}
                className="bg-card flex flex-col gap-2 rounded-2xl border p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.entryCount} bút toán
                  </p>
                </div>
                <div className="flex justify-between text-sm tabular-nums">
                  <span className="text-primary">
                    +{formatAmount(r.totalInflow, 'VND')}
                  </span>
                  <span className="text-destructive">
                    −{formatAmount(r.totalOutflow, 'VND')}
                  </span>
                  <span
                    className={cn('font-medium', differenceTone(r.difference))}
                  >
                    {signed(r.difference)}
                  </span>
                </div>
                <Progress value={r.share} />
              </li>
            ))}
          </ul>

          <div className="bg-card hidden overflow-hidden rounded-2xl border shadow-sm md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Bút toán</TableHead>
                  <TableHead className="text-right">Thu vào</TableHead>
                  <TableHead className="text-right">Chi ra</TableHead>
                  <TableHead className="text-right">Chênh lệch</TableHead>
                  <TableHead className="w-64">Tỷ trọng giao dịch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.categoryUuid ?? 'uncategorized'}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.entryCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(r.totalInflow, 'VND')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(r.totalOutflow, 'VND')}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        differenceTone(r.difference),
                      )}
                    >
                      {signed(r.difference)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={r.share} className="flex-1" />
                        <span className="text-muted-foreground w-10 text-right text-sm tabular-nums">
                          {r.share}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Tổng</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totalCount}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatAmount(totalInflow, 'VND')}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatAmount(totalOutflow, 'VND')}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {signed(totalInflow - totalOutflow)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
