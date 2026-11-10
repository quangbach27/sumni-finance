import { Suspense, lazy } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import {
  FundSourceList,
  FundSourceListSkeleton,
} from '@/features/fund-sources/components/fund-source-list';

const CreateFundSourceTrigger = lazy(
  () => import('@/features/fund-sources/components/create-fund-source-trigger'),
);

export const Route = createFileRoute('/_app/fund-sources')({
  staticData: { crumb: 'Nguồn quỹ' },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Nguồn quỹ"
      fallbackMessage="Không thể tải danh sách nguồn quỹ."
    />
  ),
});

function RouteComponent() {
  return (
    <ContentLayout
      title="Nguồn quỹ"
      description="Nguồn quỹ chỉ giữ số dư. Bút toán được ghi trong sổ cái."
      additionalContent={
        <Suspense fallback={null}>
          <CreateFundSourceTrigger />
        </Suspense>
      }
    >
      <Suspense fallback={<FundSourceListSkeleton />}>
        <FundSourceList />
      </Suspense>
    </ContentLayout>
  );
}
