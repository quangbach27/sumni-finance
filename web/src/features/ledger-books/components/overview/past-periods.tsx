import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import { useGenerateLedgerPeriodReport } from '../../api/generate-ledger-period-report';
import {
  PAST_PERIODS_PARAMS,
  getLedgerPeriodsInfiniteQueryOptions,
} from '../../api/get-ledger-periods';

import type { LedgerPeriod } from '../../api/types';

const range = (p: LedgerPeriod) => {
  const f = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  return `${f(p.openDate)} – ${f(p.closeDate)}`;
};

const reconciledOn = (p: LedgerPeriod) =>
  p.reconciledAt ? formatDate(new Date(p.reconciledAt)) : '—';

const hasReport = (p: LedgerPeriod) => !!p.reportUuid;

function StatusBadge({ p }: { p: LedgerPeriod }) {
  const Icon = hasReport(p) ? FileText : Check;
  return (
    <Badge variant="secondary">
      <Icon data-icon="inline-start" />
      {hasReport(p) ? 'Đã có báo cáo' : 'Đã đối soát'}
    </Badge>
  );
}

function ReportButton({ p }: { p: LedgerPeriod }) {
  const { mutate, isPending } = useGenerateLedgerPeriodReport();

  // TODO: enable once the report page exists.
  if (hasReport(p)) {
    return (
      <Button variant="outline" disabled>
        <FileText data-icon="inline-start" />
        Mở báo cáo
      </Button>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        mutate(p.uuid, {
          onSuccess: () =>
            toast.add({
              type: 'success',
              title: `Đã tạo báo cáo kỳ "${p.name}".`,
            }),
          onError: (e) =>
            toast.add({
              type: 'error',
              title: formatApiError(e, 'Không thể tạo báo cáo.').message,
            }),
        })
      }
    >
      <Plus data-icon="inline-start" />
      {isPending ? 'Đang tạo...' : 'Tạo báo cáo'}
    </Button>
  );
}

export default function PastPeriods() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      getLedgerPeriodsInfiniteQueryOptions(PAST_PERIODS_PARAMS),
    );
  const items = data.pages.flatMap((p) => p.items);
  const total = data.pages[0]?.pageInfo.totalCount ?? 0;
  const remaining = total - items.length;

  if (total === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Các kỳ trước</h2>
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <Table className="hidden md:table">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="h-14 pl-6">Kỳ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Đầu kỳ</TableHead>
              <TableHead className="text-right">Cuối kỳ</TableHead>
              <TableHead>Đối soát</TableHead>
              <TableHead>Báo cáo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.uuid}>
                <TableCell className="py-4 pl-6">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-muted-foreground text-sm">{range(p)}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge p={p} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(p.openingBalance, 'VND')}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(p.closingBalance ?? 0, 'VND')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {reconciledOn(p)}
                </TableCell>
                <TableCell>
                  <ReportButton p={p} />
                </TableCell>
                <TableCell className="text-primary pr-6 font-medium">
                  Bút toán
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <ul className="divide-y md:hidden">
          {items.map((p) => (
            <li
              key={p.uuid}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <StatusBadge p={p} />
                </div>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {formatAmount(p.openingBalance, 'VND')} →{' '}
                  {formatAmount(p.closingBalance ?? 0, 'VND')}
                </p>
                <p className="text-muted-foreground text-xs">
                  Đối soát {reconciledOn(p)}
                </p>
                <span className="text-primary mt-1 inline-flex items-center text-sm font-medium">
                  Xem bút toán <ChevronRight className="size-4" />
                </span>
              </div>
              <ReportButton p={p} />
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center justify-center gap-3 border-t p-4 md:flex-row">
          <span className="text-muted-foreground text-sm">
            Hiển thị {items.length} / {total} kỳ
          </span>
          {hasNextPage && (
            <Button
              variant="outline"
              className="w-full md:w-auto"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              <ChevronDown data-icon="inline-start" />
              Xem thêm {Math.min(remaining, 3)} kỳ
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
