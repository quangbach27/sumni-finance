import { Suspense } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import PeriodEntriesPage from '@/features/ledger-books/components/entries/list/period-entries-page';

const searchSchema = z.object({
  category: z.string().optional().catch(undefined),
  fundSource: z.string().optional().catch(undefined),
  status: z.enum(['posted', 'voided', 'all']).optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
  pageSize: z
    .union([
      z.literal(10),
      z.literal(20),
      z.literal(30),
      z.literal(40),
      z.literal(50),
    ])
    .catch(10)
    .default(10),
  /** Entry whose details dialog is open. */
  entry: z.string().optional().catch(undefined),
  /** Entry whose cancel dialog is open. */
  cancel: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/ledger-books_/$uuid/entries/')({
  staticData: { crumb: 'Bút toán' },
  validateSearch: searchSchema,
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Bút toán"
      fallbackMessage="Không thể tải danh sách bút toán."
    />
  ),
});

function RouteComponent() {
  const { uuid } = Route.useParams();
  return (
    <Suspense
      fallback={
        <ContentLayout title="Bút toán">
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </ContentLayout>
      }
    >
      <PeriodEntriesPage periodUuid={uuid} />
    </Suspense>
  );
}
