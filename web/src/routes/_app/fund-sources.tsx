import { Suspense, lazy } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import ContentLayout from '@/components/layout/content-layout/content-layout';

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
