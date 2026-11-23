import { Suspense } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import LedgerPeriodReportPage from '@/features/ledger-books/components/report/ledger-period-report-page';

export const Route = createFileRoute('/_app/ledger-books_/reports/$id')({
  staticData: {
    crumb: 'Báo cáo kỳ',
    parentCrumbs: [{ label: 'Sổ cái', to: '/ledger-books' }],
  },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Báo cáo kỳ"
      fallbackMessage="Không thể tải báo cáo."
    />
  ),
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense
      fallback={
        <ContentLayout title="Báo cáo kỳ">
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </ContentLayout>
      }
    >
      <LedgerPeriodReportPage reportUuid={id} />
    </Suspense>
  );
}
