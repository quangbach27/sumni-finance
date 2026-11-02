import { useSuspenseQuery } from '@tanstack/react-query';

import StatCard from '@/components/shared/stat-card/stat-card';
import StatCardSkeleton from '@/components/shared/stat-card/stat-card-skeleton';

import { formatCurrency } from '@/lib/currency';

import { getFundSourcesQueryOptions } from '../api/get-fund-sources';

const GRID_CLASS = 'mt-4 grid grid-cols-1 gap-3 md:grid-cols-4 sm:grid-cols-2';

export function FundSourceList() {
  const { data: fundSources } = useSuspenseQuery(getFundSourcesQueryOptions());
  const total = fundSources.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className={GRID_CLASS}>
      <StatCard
        variant="primary"
        label="Tổng số dư"
        value={formatCurrency(total, 'VND')}
      />
      {fundSources.map((item) => (
        <StatCard
          key={item.id}
          label={
            item.type === 'bank'
              ? `${item.name} · ${item.details.code}`
              : item.name
          }
          value={formatCurrency(item.balance, item.currency)}
        />
      ))}
    </div>
  );
}

export function FundSourceListSkeleton() {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: 4 }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}
