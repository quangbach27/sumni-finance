import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { LedgerPeriod, ListLedgerPeriodsResponse } from './types';

export const LEDGER_PERIODS_URL = '/api/v1/ledger-periods';

type GetLedgerPeriodsParams = {
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
