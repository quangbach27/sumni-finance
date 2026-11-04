import type { FundSource } from '../api/types';

export type FundSourceFilter = 'all' | 'bank' | 'cash';

export type TypeSummary = { total: number; count: number; percent: number };

export type FundSourceSummary = {
  total: number;
  count: number;
  bank: TypeSummary;
  cash: TypeSummary;
};

const summarize = (
  items: FundSource[],
  type: 'bank' | 'cash',
  total: number,
): TypeSummary => {
  const filtered = items.filter((item) => item.type === type);
  const sum = filtered.reduce((acc, item) => acc + item.balance, 0);
  return {
    total: sum,
    count: filtered.length,
    percent: total > 0 ? sum / total : 0,
  };
};

export const summarizeFundSources = (
  items: FundSource[],
): FundSourceSummary => {
  const total = items.reduce((acc, item) => acc + item.balance, 0);
  return {
    total,
    count: items.length,
    bank: summarize(items, 'bank', total),
    cash: summarize(items, 'cash', total),
  };
};

const percentFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const formatPercent = (ratio: number) => percentFormatter.format(ratio);

export const maskAccountNumber = (accountNumber?: string) =>
  accountNumber ? `•••• ${accountNumber.slice(-4)}` : '';
