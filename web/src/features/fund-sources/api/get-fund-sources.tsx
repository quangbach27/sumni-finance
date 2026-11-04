import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { FundSource, ListFundSourcesResponse } from './types';

export const FUND_SOURCES_URL = '/api/v1/fund-sources';

export const getFundSources = async (options?: {
  signal?: AbortSignal;
}): Promise<FundSource[]> => {
  const { fund_sources } = await http.get<ListFundSourcesResponse>(
    FUND_SOURCES_URL,
    { signal: options?.signal },
  );
  // Decimal may be serialized as a string; normalize so sums don't concatenate.
  return fund_sources.map((item) => ({
    ...item,
    balance: Number(item.balance),
  }));
};

export const getFundSourcesQueryOptions = () =>
  queryOptions({
    queryKey: [FUND_SOURCES_URL],
    queryFn: ({ signal }) => getFundSources({ signal }),
  });
