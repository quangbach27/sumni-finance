import { Suspense } from 'react';

import { createFileRoute } from '@tanstack/react-router';

import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';
import ErrorComponent from '@/components/layout/error-component/error-component';

import PostJournalEntriesPage from '@/features/ledger-books/components/entries/post/post-journal-entries-page';

export const Route = createFileRoute('/_app/ledger-books_/$uuid/entries/post')({
  staticData: { crumb: 'Ghi bút toán' },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => (
    <ErrorComponent
      error={error}
      reset={reset}
      title="Ghi bút toán"
      fallbackMessage="Không thể tải dữ liệu kỳ."
    />
  ),
});

function PostJournalEntriesLayout({ periodUuid }: { periodUuid: string }) {
  return (
    <ContentLayout
      title="Ghi bút toán"
      description="Nợ = thu vào nguồn quỹ (+), Có = chi ra khỏi nguồn quỹ (−)."
    >
      <PostJournalEntriesPage periodUuid={periodUuid} />
    </ContentLayout>
  );
}

function RouteComponent() {
  const { uuid } = Route.useParams();
  return (
    <Suspense
      fallback={
        <ContentLayout title="Ghi bút toán">
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </ContentLayout>
      }
    >
      <PostJournalEntriesLayout periodUuid={uuid} />
    </Suspense>
  );
}
