import { endOfDay, startOfDay } from '@/lib/date';

import { useEntriesSearch } from './use-entries-search';

import type { ListLedgerEntriesParams } from '@/features/ledger-entries/api/list-ledger-entries';

/** API params of the entries of one fund source for the current filters. */
export function useEntriesParams(
  fundSourceUuid: string,
): ListLedgerEntriesParams {
  const { search } = useEntriesSearch();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - search.range);

  return {
    fundSourceUuid,
    categoryUuid: search.category,
    // Reversal entries are reached from their voided entry's details.
    kind: 'normal',
    status: search.status,
    // Day precision keeps the query key stable within a day.
    fromDate: startOfDay(from).toISOString(),
    toDate: endOfDay(today).toISOString(),
    page: search.page,
  };
}
