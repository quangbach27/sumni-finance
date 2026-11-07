import { queryOptions } from '@tanstack/react-query';

import { http, isApiError } from '@/lib/clients';

import { toLedgerPeriodDetail } from './mappers';

import type { GetLedgerPeriodResponse } from './response';
import type { LedgerPeriodDetail } from './types';

export const UNLOCKED_LEDGER_PERIOD_URL = '/api/v1/ledger-periods/unlocked';

/** Resolves to `null` when no period is unlocked (404). */
export const getUnlockedLedgerPeriod = async (options?: {
  signal?: AbortSignal;
}): Promise<LedgerPeriodDetail | null> => {
  try {
    const { ledger_period } = await http.get<GetLedgerPeriodResponse>(
      UNLOCKED_LEDGER_PERIOD_URL,
      { signal: options?.signal },
    );
    return toLedgerPeriodDetail(ledger_period);
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    throw error;
  }
};

export const getUnlockedLedgerPeriodQueryOptions = () =>
  queryOptions({
    queryKey: [UNLOCKED_LEDGER_PERIOD_URL],
    queryFn: ({ signal }) => getUnlockedLedgerPeriod({ signal }),
  });

/** Live system balance: closing balances once closed, else current balances. */
export const getSystemBalance = (period: LedgerPeriodDetail) =>
  period.statements.reduce(
    (sum, s) => sum + (s.closingBalance ?? s.fundSource.balance),
    0,
  );
