import { endOfDay, startOfDay } from '@/lib/date';

import { useEntriesFilters } from './use-entries-filters';

import type { ListLedgerEntriesParams } from '@/features/ledger-entries/api/list-ledger-entries';

/** API params of the entries of one fund source for the current filters. */
export function useEntriesParams(
  fundSourceUuid: string,
): ListLedgerEntriesParams {
  const { filters } = useEntriesFilters();

  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - filters.range);

  return {
    fundSourceUuid,
    categoryUuid: filters.category,
    // Reversal entries are reached from their voided entry's details.
    kind: 'normal',
    status: filters.status,
    // Day precision keeps the query key stable within a day.
    fromDate: startOfDay(from).toISOString(),
    toDate: endOfDay(today).toISOString(),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
