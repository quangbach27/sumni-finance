import { Suspense } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import FundSourceDetailPage from '@/features/fund-sources/components/fund-source-detail/fund-source-detail-page';

const searchSchema = z.object({
  /** Months back from today. */
  range: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(6)])
    .catch(1),
  category: z.string().optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
  orderBy: z
    .enum(['occurred_at', 'fund_source_uuid', 'category_uuid'])
    .catch('occurred_at'),
  order: z.enum(['asc', 'desc']).catch('desc'),
  /** Entry whose details dialog is open. */
  entry: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/fund-sources_/$uuid/')({
  staticData: { crumb: 'Chi tiết nguồn quỹ' },
  validateSearch: searchSchema,
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Chi tiết nguồn quỹ"
      fallbackMessage="Không thể tải dữ liệu nguồn quỹ."
    />
  ),
});

function RouteComponent() {
  const { uuid } = Route.useParams();
  return (
    <Suspense
      fallback={
        <ContentLayout title="Nguồn quỹ">
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </ContentLayout>
      }
    >
      <FundSourceDetailPage fundSourceUuid={uuid} />
    </Suspense>
  );
}
