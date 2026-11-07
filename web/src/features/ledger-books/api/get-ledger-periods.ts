import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { toLedgerPeriodsPage } from './mappers';

import type { ListLedgerPeriodsResponse } from './response';
import type { LedgerPeriod } from './types';

export const LEDGER_PERIODS_URL = '/api/v1/ledger-periods';

export const DEFAULT_PAGE_SIZE = 10;

export type GetLedgerPeriodsParams = {
  page?: number;
  pageSize?: number;
  status?: LedgerPeriod['status'];
};

export const getLedgerPeriods = async (
  { page, pageSize, status }: GetLedgerPeriodsParams = {},
  options?: { signal?: AbortSignal },
) =>
  toLedgerPeriodsPage(
    await http.get<ListLedgerPeriodsResponse>(LEDGER_PERIODS_URL, {
      params: { page, page_size: pageSize, status },
      signal: options?.signal,
    }),
  );

export const getLedgerPeriodsQueryOptions = (params?: GetLedgerPeriodsParams) =>
  queryOptions({
    queryKey: [LEDGER_PERIODS_URL, params],
    queryFn: ({ signal }) => getLedgerPeriods(params, { signal }),
  });

/** Load-more variant of `getLedgerPeriodsQueryOptions`; `page` is the initial page. */
export const getLedgerPeriodsInfiniteQueryOptions = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status,
}: GetLedgerPeriodsParams = {}) =>
  infiniteQueryOptions({
    queryKey: [LEDGER_PERIODS_URL, 'infinite', { status, pageSize }],
    initialPageParam: page,
    queryFn: ({ pageParam, signal }) =>
      getLedgerPeriods({ status, page: pageParam, pageSize }, { signal }),
    getNextPageParam: ({ pageInfo }) =>
      pageInfo.page * pageInfo.pageSize < pageInfo.totalCount
        ? pageInfo.page + 1
        : undefined,
  });

/** Reconciled periods shown in the "past periods" list (shared so callers hit one cache entry). */
export const PAST_PERIODS_PARAMS = {
  status: 'reconciled',
  pageSize: 3,
} as const satisfies GetLedgerPeriodsParams;
