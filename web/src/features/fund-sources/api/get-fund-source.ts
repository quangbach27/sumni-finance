import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { FUND_SOURCES_URL } from './get-fund-sources';

import type { FundSource, GetFundSourceResponse } from './types';

export type FundSourceDetail = {
  fundSource: FundSource;
  /** ISO time of the latest entry; undefined without entries. */
  latestEntryAt?: string;
};

export const getFundSource = async (
  uuid: string,
  options?: { signal?: AbortSignal },
): Promise<FundSourceDetail> => {
  const res = await http.get<GetFundSourceResponse>(
    `${FUND_SOURCES_URL}/${uuid}`,
    { signal: options?.signal },
  );
  return {
    fundSource: {
      ...res.fund_source,
      balance: Number(res.fund_source.balance),
    },
    latestEntryAt: res.latest_entry_at,
  };
};

export const getFundSourceQueryOptions = (uuid: string) =>
  queryOptions({
    queryKey: [FUND_SOURCES_URL, uuid],
    queryFn: ({ signal }) => getFundSource(uuid, { signal }),
  });
