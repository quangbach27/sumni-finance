import { useWatch } from 'react-hook-form';

import {
  computeTotals,
  getBalanceAfter,
} from '../components/entries/post/post-journal-entries-model';
import { getFundSourceTitle } from '../components/shared/fund-source-label';

import type { LedgerStatementFundSource } from '../api/types';
import type { LedgerEntriesFormValues } from '../components/entries/post/post-journal-entries-schema';
import type { Control } from 'react-hook-form';

/** The chosen fund source, the batch totals and the balance the batch leaves behind. */
export function useFundSourceBalance(
  control: Control<LedgerEntriesFormValues>,
  fundSources: LedgerStatementFundSource[],
) {
  const fundSourceUuid = useWatch({ control, name: 'fundSourceUuid' });
  const rows = useWatch({ control, name: 'rows' });

  const fundSource = fundSources.find((fs) => fs.uuid === fundSourceUuid);
  const totals = computeTotals(rows);
  const currentBalance = fundSource?.balance ?? 0;

  return {
    fundSource,
    fundSourceName: fundSource ? getFundSourceTitle(fundSource) : '',
    currentBalance,
    balanceAfter: getBalanceAfter(currentBalance, totals),
    totals,
  };
}
