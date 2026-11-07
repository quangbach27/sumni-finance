import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { LedgerPeriod, ListLedgerPeriodsResponse } from './types';

export const LEDGER_PERIODS_URL = '/api/v1/ledger-periods';

export const DEFAULT_PAGE_SIZE = 10;

export type GetLedgerPeriodsParams = {
  page?: number;
  page_size?: number;
  status?: LedgerPeriod['status'];
};

export const getLedgerPeriods = async (
  params?: GetLedgerPeriodsParams,
  options?: { signal?: AbortSignal },
) => {
  const { items, page_info } = await http.get<ListLedgerPeriodsResponse>(
    LEDGER_PERIODS_URL,
    { params, signal: options?.signal },
  );
  return {
    page_info,
    items: items.map((i): LedgerPeriod => ({
      ...i,
      opening_balance: Number(i.opening_balance),
      closing_balance:
        i.closing_balance === undefined ? undefined : Number(i.closing_balance),
    })),
  };
};

export const getLedgerPeriodsQueryOptions = (params?: GetLedgerPeriodsParams) =>
  queryOptions({
    queryKey: [LEDGER_PERIODS_URL, params],
    queryFn: ({ signal }) => getLedgerPeriods(params, { signal }),
  });

/** Load-more variant of `getLedgerPeriodsQueryOptions`; `page` is the initial page. */
export const getLedgerPeriodsInfiniteQueryOptions = ({
  page = 1,
  page_size = DEFAULT_PAGE_SIZE,
  status,
}: GetLedgerPeriodsParams = {}) =>
  infiniteQueryOptions({
    queryKey: [LEDGER_PERIODS_URL, 'infinite', { status, page_size }],
    initialPageParam: page,
    queryFn: ({ pageParam, signal }) =>
      getLedgerPeriods({ status, page: pageParam, page_size }, { signal }),
    getNextPageParam: ({ page_info }) =>
      page_info.page * page_info.page_size < page_info.total_count
        ? page_info.page + 1
        : undefined,
  });

/** Reconciled periods shown in the "past periods" list (shared so callers hit one cache entry). */
export const PAST_PERIODS_PARAMS = {
  status: 'reconciled',
  page_size: 3,
} as const satisfies GetLedgerPeriodsParams;
