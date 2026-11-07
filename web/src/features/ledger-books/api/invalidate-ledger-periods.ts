import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { UNLOCKED_LEDGER_PERIOD_URL } from './get-unlocked-ledger-period';

import type { QueryClient } from '@tanstack/react-query';

/** Refetch every ledger period query after a period or statement changes. */
export const invalidateLedgerPeriods = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: [LEDGER_PERIODS_URL] }),
    queryClient.invalidateQueries({ queryKey: [UNLOCKED_LEDGER_PERIOD_URL] }),
  ]);
