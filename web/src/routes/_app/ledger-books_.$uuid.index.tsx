import { Suspense } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Check, FileText, FolderTree } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import { getLedgerPeriodQueryOptions } from '@/features/ledger-books/api/get-ledger-period';
import LedgerPeriodDetailsPage from '@/features/ledger-books/components/ledger-period-details/ledger-period-details-page';

import { formatDate } from '@/lib/date';

export const Route = createFileRoute('/_app/ledger-books_/$uuid/')({
  staticData: { crumb: 'Chi tiết kỳ' },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Chi tiết kỳ"
      fallbackMessage="Không thể tải dữ liệu kỳ."
    />
  ),
});

function PeriodDetailsLayout({ periodUuid }: { periodUuid: string }) {
  const { data: period } = useSuspenseQuery(
    getLedgerPeriodQueryOptions(periodUuid),
  );
  const isReconciled = period.status === 'reconciled';
  const reconciledAt = period.reconciledAt
    ? formatDate(new Date(period.reconciledAt))
    : undefined;
  const range = `${formatDate(new Date(period.openDate))} – ${formatDate(new Date(period.closeDate))}`;

  return (
    <ContentLayout
      title={period.name}
      description={
        isReconciled
          ? `${reconciledAt ? `Đã đối soát ${reconciledAt} · ` : ''}Kỳ đã khóa`
          : `${range} · ${period.entryCount} bút toán`
      }
      titleAdornment={
        period.status === 'opened' ? (
          <Badge>Đang mở</Badge>
        ) : isReconciled ? (
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
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link to="/ledger-books/categories">
              <FolderTree />
              Danh mục
            </Link>
          }
        />
      }
    >
      <LedgerPeriodDetailsPage periodUuid={periodUuid} />
    </ContentLayout>
  );
}

function RouteComponent() {
  const { uuid } = Route.useParams();
  return (
    <Suspense
      fallback={
        <ContentLayout title="Chi tiết kỳ">
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </ContentLayout>
      }
    >
      <PeriodDetailsLayout periodUuid={uuid} />
    </Suspense>
  );
}
