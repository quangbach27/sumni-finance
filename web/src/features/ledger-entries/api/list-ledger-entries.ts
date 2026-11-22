import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_ENTRIES_URL, normalizeLedgerEntry } from './get-ledger-entry';

import type { ListLedgerEntriesResponse } from './types';

export const ENTRIES_PAGE_SIZE = 10;
export const ENTRIES_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

export type LedgerEntriesStatus = 'posted' | 'voided' | 'all';

export type ListLedgerEntriesParams = {
  fundSourceUuid?: string;
  ledgerPeriodUuid?: string;
  categoryUuid?: string;
  kind?: 'normal' | 'reversal';
  status?: LedgerEntriesStatus;
  /** ISO date-time, inclusive. */
  fromDate?: string;
  /** ISO date-time, inclusive. */
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export const listLedgerEntries = async (
  params: ListLedgerEntriesParams,
  options?: { signal?: AbortSignal },
) => {
  const res = await http.get<ListLedgerEntriesResponse>(LEDGER_ENTRIES_URL, {
    params: {
      fund_source_uuid: params.fundSourceUuid,
      ledger_period_uuid: params.ledgerPeriodUuid,
      category_uuid: params.categoryUuid,
      kind: params.kind,
      status: params.status,
      from_date: params.fromDate,
      to_date: params.toDate,
      page: params.page,
      page_size: params.pageSize ?? ENTRIES_PAGE_SIZE,
    },
    signal: options?.signal,
  });
  return { ...res, items: res.items.map(normalizeLedgerEntry) };
};

export const listLedgerEntriesQueryOptions = (
  params: ListLedgerEntriesParams,
) =>
  queryOptions({
    queryKey: [LEDGER_ENTRIES_URL, params],
    queryFn: ({ signal }) => listLedgerEntries(params, { signal }),
    placeholderData: keepPreviousData,
  });
