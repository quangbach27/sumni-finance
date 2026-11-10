import { Suspense } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

import { getUnlockedLedgerPeriodQueryOptions } from '../../api/get-unlocked-ledger-period';
import NoOpenPeriod from '../open-period/no-open-period';
import OpenLedgerPeriodTrigger from '../open-period/open-ledger-period-trigger';
import PastPeriods from './past-periods';
import UnlockedPeriodCard from './unlocked-period-card';

/** Header button: disabled while a period is unlocked (open or closed). */
export function OpenPeriodHeaderTrigger() {
  const { data: unlocked } = useSuspenseQuery(
    getUnlockedLedgerPeriodQueryOptions(),
  );
  return (
    <OpenLedgerPeriodTrigger disabled={!!unlocked}>
      <Plus data-icon="inline-start" />
      <span>Mở kỳ mới</span>
    </OpenLedgerPeriodTrigger>
  );
}

function Current() {
  const { data: unlocked } = useSuspenseQuery(
    getUnlockedLedgerPeriodQueryOptions(),
  );
  return unlocked ? <UnlockedPeriodCard period={unlocked} /> : <NoOpenPeriod />;
}

export function LedgerBooksSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function LedgerBooksPage() {
  return (
    <Suspense fallback={<LedgerBooksSkeleton />}>
      <Current />
      <PastPeriods />
    </Suspense>
  );
}
