import { queryOptions, useQuery } from '@tanstack/react-query';

import type { FundSource } from './types';

// TODO: replace with the real endpoint once the backend exposes it
const URL = '/fund-sources';

const MOCK_FUND_SOURCES: FundSource[] = [
  {
    id: '1',
    name: 'Vietcombank',
    code: 'VCB',
    type: 'bank',
    balance: 32_640_000,
    currency: 'VND',
  },
  {
    id: '2',
    name: 'Ví tiền mặt',
    code: 'CASH',
    type: 'cash',
    balance: 4_310_000,
    currency: 'VND',
  },
  {
    id: '3',
    name: 'MoMo',
    code: 'MOMO',
    type: 'e-wallet',
    balance: 11_300_000,
    currency: 'VND',
  },
];

export const getFundSources = async (_options?: {
  signal?: AbortSignal;
}): Promise<FundSource[]> => {
  // TODO: replace with http.get<FundSource[]>(URL, { signal: _options?.signal })
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_FUND_SOURCES;
};

export const getFundSourcesQueryOptions = () =>
  queryOptions({
    queryKey: [URL],
    queryFn: ({ signal }) => getFundSources({ signal }),
  });

export const useFundSources = () => useQuery(getFundSourcesQueryOptions());
