import { queryOptions, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type { Bank } from './types';

const BANKS_URL = 'https://api.banklookup.net/bank/list';

type BanksResponse = { code: number; success: boolean; data: Bank[] };

const getBanks = async (options?: {
  signal?: AbortSignal;
}): Promise<Bank[]> => {
  const { data } = await axios.get<BanksResponse>(BANKS_URL, {
    signal: options?.signal,
  });
  return data.data;
};

const getBanksQueryOptions = () =>
  queryOptions({
    queryKey: [BANKS_URL],
    queryFn: ({ signal }) => getBanks({ signal }),
    staleTime: Infinity,
  });

export const useBanks = () => useQuery(getBanksQueryOptions());
