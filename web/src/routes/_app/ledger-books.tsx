import { Suspense } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import LedgerBooksPage, {
  OpenPeriodHeaderTrigger,
} from '@/features/ledger-books/components/overview/ledger-books-page';

export const Route = createFileRoute('/_app/ledger-books')({
  staticData: { crumb: 'Sổ cái' },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Sổ cái"
      fallbackMessage="Không thể tải sổ cái."
    />
  ),
});

function RouteComponent() {
  return (
    <ContentLayout
      title="Sổ cái"
      description="Mỗi kỳ ghi bút toán và cập nhật số dư nguồn quỹ. Chỉ một kỳ được mở tại một thời điểm"
      additionalContent={
        <Suspense fallback={null}>
          <OpenPeriodHeaderTrigger />
        </Suspense>
      }
    >
      <LedgerBooksPage />
    </ContentLayout>
  );
}
