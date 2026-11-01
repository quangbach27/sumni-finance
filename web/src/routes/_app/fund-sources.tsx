import { Suspense } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import {
  FundSourceList,
  FundSourceListSkeleton,
} from '@/features/fund-sources/components/fund-source-list';

import { useIsMobile } from '@/hooks/use-mobile';

export const Route = createFileRoute('/_app/fund-sources')({
  staticData: { crumb: 'Nguồn quỹ' },
  component: RouteComponent,
});

function RouteComponent() {
  const isMobile = useIsMobile();
  return (
    <ContentLayout
      title="Nguồn quỹ"
      description="Nguồn quỹ chỉ giữ số dư. Bút toán được ghi trong sổ cái."
      additionalContent={
        <Button>
          <Plus data-icon="inline-start" />
          <span>{isMobile ? 'Thêm' : 'Thêm nguồn quỹ'}</span>
        </Button>
      }
    >
      <Suspense fallback={<FundSourceListSkeleton />}>
        <FundSourceList />
      </Suspense>
    </ContentLayout>
  );
}
