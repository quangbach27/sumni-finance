import { Suspense } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Check, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import { getLedgerPeriodQueryOptions } from '@/features/ledger-books/api/get-ledger-period';
import ReconciliationPage from '@/features/ledger-books/components/reconciliation/reconciliation-page';
import ReopenPeriodButton from '@/features/ledger-books/components/reconciliation/reopen-period-dialog';

import { formatDate } from '@/lib/date';

export const Route = createFileRoute(
  '/_app/ledger-books_/$uuid/reconciliation',
)({
  staticData: { crumb: 'Đối soát' },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Đối soát"
      fallbackMessage="Không thể tải dữ liệu đối soát."
    />
  ),
});

function ReconciliationLayout({ periodUuid }: { periodUuid: string }) {
  const { data: period } = useSuspenseQuery(
    getLedgerPeriodQueryOptions(periodUuid),
  );
  const isReconciled = period.status === 'reconciled';
  const reconciledAt = period.reconciledAt
    ? formatDate(new Date(period.reconciledAt))
    : undefined;

  return (
    <ContentLayout
      title={isReconciled ? period.name : `Đối soát ${period.name}`}
      description={
        isReconciled
          ? `${reconciledAt ? `Đã đối soát ${reconciledAt} · ` : ''}Kỳ đã khóa`
          : 'Đã đóng kỳ. Không ghi thêm bút toán thường, chỉ ghi bút toán điều chỉnh.'
      }
      titleAdornment={
        isReconciled ? (
          <Badge variant="secondary">
            {period.reportUuid ? (
              <FileText data-icon="inline-start" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {period.reportUuid ? 'Đã có báo cáo' : 'Đã đối soát'}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-primary text-primary">
            Đang đối soát
          </Badge>
        )
      }
      additionalContent={
        period.status === 'closed' && (
          <div className="hidden md:block">
            <ReopenPeriodButton
              periodUuid={periodUuid}
              periodName={period.name}
              label="Mở lại kỳ"
            />
          </div>
        )
      }
    >
      <ReconciliationPage period={period} />
    </ContentLayout>
  );
}

function RouteComponent() {
  const { uuid } = Route.useParams();
  return (
    <Suspense
      fallback={
        <ContentLayout title="Đối soát">
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </ContentLayout>
      }
    >
      <ReconciliationLayout periodUuid={uuid} />
    </Suspense>
  );
}
