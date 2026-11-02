import { queryOptions } from '@tanstack/react-query';

import type { FundSource } from './types';

// TODO: replace with the real endpoint once the backend exposes it
export const FUND_SOURCES_URL = '/fund-sources';

const MOCK_FUND_SOURCES: FundSource[] = [
  {
    id: '1',
    name: 'Nguyễn Văn An · Ngân hàng',
    type: 'bank',
    details: {
      owner_name: 'Nguyễn Văn An',
      account_number: '19034567890123',
      code: 'VCB',
      bin: 970436,
      short_name: 'Vietcombank',
    },
    balance: 32_640_000,
    currency: 'VND',
  },
  {
    id: '2',
    name: 'Nguyễn Văn An · Tiền mặt',
    type: 'cash',
    details: { owner_name: 'Nguyễn Văn An' },
    balance: 4_310_000,
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
    queryKey: [FUND_SOURCES_URL],
    queryFn: ({ signal }) => getFundSources({ signal }),
  });
