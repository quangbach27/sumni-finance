import { Suspense } from 'react';

import { Link } from '@tanstack/react-router';
import { AlertTriangle, BookOpen, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { formatAmount } from '@/lib/currency';
import { daysUntil } from '@/lib/date';

import { useLedgerPeriod } from '../../../api/get-ledger-period';
import ClosePeriodButton from '../close-period-dialog';
import CategorySummaryTable from './category-summary-table';
import FundSourceBalanceCards from './fund-source-balance-cards';

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'in' | 'out';
}) => (
  <div className="flex flex-col gap-1">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd
      className={`text-2xl font-bold tabular-nums ${tone === 'in' ? 'text-primary' : tone === 'out' ? 'text-destructive' : ''}`}
    >
      {value}
    </dd>
  </div>
);

const DeadlineBar = ({ periodUuid }: { periodUuid: string }) => {
  const period = useLedgerPeriod(periodUuid);
  const daysLeft = daysUntil(new Date(period.closeDate));
  let message: string | null = null;

  if (daysLeft < 0) message = 'Đã quá hạn đóng kỳ.';
  else if (daysLeft === 0) message = 'Hôm nay là hạn đóng kỳ.';
  else if (daysLeft < 7) message = `Còn ${daysLeft} ngày đến hạn đóng kỳ.`;

  return (
    <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 md:px-8">
      {message && (
        <p className="flex items-center gap-2 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            <strong>{message}</strong>
          </span>
        </p>
      )}
      <ClosePeriodButton
        className="ml-auto"
        variant="outline"
        periodUuid={period.uuid}
        periodName={period.name}
      />
    </div>
  );
};

/** Step 1: summary of the entries recorded in the period, with actions to record more while it is open. */
export default function PostEntryStep({ periodUuid }: { periodUuid: string }) {
  const period = useLedgerPeriod(periodUuid);
  const isOpen = period.status === 'opened';

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="flex flex-col gap-6 p-4 md:px-8 md:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Bước 1 · Ghi bút toán</h2>
              <p className="text-muted-foreground text-sm">
                Ghi thu chi của kỳ. Mỗi bút toán cập nhật số dư nguồn quỹ sau
                khi lưu.
              </p>
            </div>
            {isOpen && (
              <div className="flex flex-wrap gap-3">
                {/* TODO: enable once the entries list page exists. */}
                <Button variant="outline" disabled>
                  <BookOpen data-icon="inline-start" />
                  Tất cả bút toán
                </Button>
                <Button
                  render={
                    <Link
                      to="/ledger-books/$uuid/entries"
                      params={{ uuid: period.uuid }}
                    />
                  }
                >
                  <Plus data-icon="inline-start" />
                  Ghi bút toán
                </Button>
              </div>
            )}
          </div>

          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <Stat label="Tổng bút toán" value={String(period.entryCount)} />
            <Stat
              label="Thu vào (Nợ)"
              value={`+${formatAmount(period.totalInflow, 'VND')}`}
              tone="in"
            />
            <Stat
              label="Chi ra (Có)"
              value={`−${formatAmount(period.totalOutflow, 'VND')}`}
              tone="out"
            />
          </dl>
        </div>
        {isOpen && <DeadlineBar periodUuid={periodUuid} />}
      </div>

      <FundSourceBalanceCards periodUuid={periodUuid} />

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
        <CategorySummaryTable periodUuid={periodUuid} />
      </Suspense>
    </div>
  );
}
