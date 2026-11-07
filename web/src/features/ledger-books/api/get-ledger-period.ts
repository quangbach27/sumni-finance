import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { toLedgerPeriodDetail } from './mappers';

import type { GetLedgerPeriodResponse } from './response';

/** A period of any status. Keyed under `LEDGER_PERIODS_URL` so its invalidation refreshes this too. */
export const getLedgerPeriod = async (
  uuid: string,
  options?: { signal?: AbortSignal },
) => {
  const { ledger_period } = await http.get<GetLedgerPeriodResponse>(
    `${LEDGER_PERIODS_URL}/${uuid}`,
    { signal: options?.signal },
  );
  return toLedgerPeriodDetail(ledger_period);
};

export const getLedgerPeriodQueryOptions = (uuid: string) =>
  queryOptions({
    queryKey: [LEDGER_PERIODS_URL, uuid],
    queryFn: ({ signal }) => getLedgerPeriod(uuid, { signal }),
  });
