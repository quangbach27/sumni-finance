import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import FundSourceBalanceCard from './fund-source-balance-card';
import FundSourceDetailHeader from './fund-source-detail-header';
import FundSourceEntriesTable from './fund-source-entries-table';

export default function FundSourceDetailPage({
  fundSourceUuid,
}: {
  fundSourceUuid: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
      <FundSourceDetailHeader fundSourceUuid={fundSourceUuid} />
      <FundSourceBalanceCard fundSourceUuid={fundSourceUuid} />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <FundSourceEntriesTable fundSourceUuid={fundSourceUuid} />
      </Suspense>
    </section>
  );
}
