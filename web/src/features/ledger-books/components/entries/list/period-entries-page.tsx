import { Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import { formatDate } from '@/lib/date';

import { useLedgerPeriod } from '../../../api/get-ledger-period';
import PeriodEntriesFilterBar from './period-entries-filter-bar';
import PeriodEntriesTable from './period-entries-table';

export default function PeriodEntriesPage({
  periodUuid,
}: {
  periodUuid: string;
}) {
  const period = useLedgerPeriod(periodUuid);
  const isOpen = period.status === 'opened';

  return (
    <ContentLayout
      title={`Bút toán ${period.name}`}
      titleAdornment={
        isOpen && (
          <Badge className="bg-primary text-primary-foreground">Đang mở</Badge>
        )
      }
      description={`${formatDate(new Date(period.openDate))} – ${formatDate(new Date(period.closeDate))}`}
    >
      <div className="mt-6 flex flex-col gap-4">
        <Suspense fallback={<Skeleton className="h-9 w-full" />}>
          <PeriodEntriesFilterBar />
        </Suspense>
        <PeriodEntriesTable periodUuid={periodUuid} />
      </div>
    </ContentLayout>
  );
}
