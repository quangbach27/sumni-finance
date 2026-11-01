import { useSuspenseQuery } from '@tanstack/react-query';

import StatCard from '@/components/shared/stat-card/stat-card';
import StatCardSkeleton from '@/components/shared/stat-card/stat-card-skeleton';

import { getFundSourcesQueryOptions } from '../api/get-fund-sources';

const GRID_CLASS = 'mt-4 grid grid-cols-1 gap-3 md:grid-cols-4';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value);

export function FundSourceList() {
  const { data: fundSources } = useSuspenseQuery(getFundSourcesQueryOptions());
  const total = fundSources.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className={GRID_CLASS}>
      <StatCard
        variant="primary"
        label="Tổng số dư"
        value={`${formatNumber(total)} VND`}
      />
      {fundSources.map((item) => (
        <StatCard
          key={item.id}
          label={`${item.name} · ${item.code}`}
          value={`${formatNumber(item.balance)} ${item.currency}`}
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
