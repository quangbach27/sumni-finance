import { useState } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Search, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import StatCard from '@/components/shared/stat-card/stat-card';
import StatCardSkeleton from '@/components/shared/stat-card/stat-card-skeleton';

import { formatCurrency } from '@/lib/currency';

import CreateFundSourceTrigger from './create-fund-source-trigger';
import FundSourceActionsMenu from './fund-source-actions-menu';
import FundSourceAvatar from './fund-source-avatar';
import {
  formatPercent,
  maskAccountNumber,
  summarizeFundSources,
} from './fund-source-summary';
import { getFundSourcesQueryOptions } from '../api/get-fund-sources';

import type { FundSourceFilter } from './fund-source-summary';

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
  const [filter, setFilter] = useState<FundSourceFilter>('all');

  if (fundSources.length === 0) return <FundSourceEmpty />;

  const summary = summarizeFundSources(fundSources);
  const rows =
    filter === 'all'
      ? fundSources
      : fundSources.filter((item) => item.type === filter);
  const rowsTotal = rows.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          variant="primary"
          label="Tổng số dư"
          value={
            <span className="text-2xl font-bold">
              {formatCurrency(summary.total, 'VND')}
            </span>
          }
          description={`${summary.count} nguồn quỹ`}
        />
        <StatCard
          label="Ngân hàng"
          value={
            <span className="text-2xl font-bold">
              {formatCurrency(summary.bank.total, 'VND')}
            </span>
          }
          description={`${summary.bank.count} tài khoản · ${formatPercent(summary.bank.percent)} tổng`}
          footer={<Progress value={summary.bank.percent * 100} />}
        />
        <StatCard
          label="Tiền mặt"
          value={
            <span className="text-2xl font-bold">
              {formatCurrency(summary.cash.total, 'VND')}
            </span>
          }
          description={`${summary.cash.count} người giữ · ${formatPercent(summary.cash.percent)} tổng`}
          footer={<Progress value={summary.cash.percent * 100} />}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search is UI-only for now. */}
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="Tìm theo tên, chủ sở hữu, ngân hàng..." />
        </InputGroup>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as FundSourceFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">Tất cả {summary.count}</TabsTrigger>
            <TabsTrigger value="bank">
              Ngân hàng {summary.bank.count}
            </TabsTrigger>
            <TabsTrigger value="cash">
              Tiền mặt {summary.cash.count}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nguồn quỹ</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Chủ sở hữu</TableHead>
              <TableHead>Tài khoản</TableHead>
              <TableHead className="text-right">Số dư</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.uuid}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FundSourceAvatar item={item} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.type === 'bank' ? 'secondary' : 'outline'}
                  >
                    {item.type === 'bank' ? 'Ngân hàng' : 'Tiền mặt'}
                  </Badge>
                </TableCell>
                <TableCell>{item.details.owner_name}</TableCell>
                <TableCell>
                  {item.type === 'bank'
                    ? `${item.details.bank_code ?? ''} · ${maskAccountNumber(item.details.account_number)}`
                    : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.balance, item.currency)}
                </TableCell>
                <TableCell>
                  <FundSourceActionsMenu item={item} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="font-semibold">
                Tổng · {rows.length} nguồn quỹ
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(rowsTotal, 'VND')}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

export function FundSourceListSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="h-9 w-full sm:max-w-sm" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
