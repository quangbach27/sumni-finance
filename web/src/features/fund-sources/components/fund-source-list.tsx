import { useSuspenseQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

import StatCard from '@/components/shared/stat-card/stat-card';
import StatCardSkeleton from '@/components/shared/stat-card/stat-card-skeleton';

import { formatCurrency } from '@/lib/currency';

import CreateFundSourceTrigger from './create-fund-source-trigger';
import { getFundSourcesQueryOptions } from '../api/get-fund-sources';

const GRID_CLASS = 'mt-4 grid grid-cols-1 gap-3 md:grid-cols-4 sm:grid-cols-2';

function FundSourceEmpty() {
  return (
    <Empty className="mt-4 border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wallet />
        </EmptyMedia>
        <EmptyTitle>Chưa có nguồn quỹ nào</EmptyTitle>
        <EmptyDescription>
          Thêm tài khoản ngân hàng hoặc tiền mặt để theo dõi số dư. Sau đó bạn
          có thể ghi bút toán vào sổ cái.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateFundSourceTrigger />
      </EmptyContent>
    </Empty>
  );
}

export function FundSourceList() {
  const { data: fundSources } = useSuspenseQuery(getFundSourcesQueryOptions());
  if (fundSources.length === 0) return <FundSourceEmpty />;

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
