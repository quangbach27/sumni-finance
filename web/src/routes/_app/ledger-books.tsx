import { createFileRoute } from '@tanstack/react-router';

import ContentLayout from '@/components/layout/content-layout/content-layout';

export const Route = createFileRoute('/_app/ledger-books')({
  staticData: { crumb: 'Sổ cái' },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ContentLayout title="Sổ cái" description="Mooix ">
      Sổ cái
    </ContentLayout>
  );
}
