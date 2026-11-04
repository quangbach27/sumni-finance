import { Suspense, lazy } from 'react';

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';
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
  errorComponent: RouteError,
});

function RouteError({ error, reset }: { error: unknown; reset: () => void }) {
  const { reset: resetQueries } = useQueryErrorResetBoundary();
  const { message } = formatApiError(
    error,
    'Không thể tải danh sách nguồn quỹ.',
  );

  return (
    <ContentLayout title="Nguồn quỹ">
      <div className="mt-4 flex flex-col items-center gap-2 p-6 text-sm">
        <p className="text-muted-foreground">{message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetQueries();
            reset();
          }}
        >
          Thử lại
        </Button>
      </div>
    </ContentLayout>
  );
}

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
