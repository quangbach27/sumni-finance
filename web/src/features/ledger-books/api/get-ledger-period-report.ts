import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { toLedgerPeriodReport } from './mappers';

import type { LedgerPeriodReportResponse } from './response';

export const LEDGER_PERIOD_REPORTS_URL = '/api/v1/ledger-period-reports';

export const getLedgerPeriodReport = async (
  uuid: string,
  options?: { signal?: AbortSignal },
) => {
  const report = await http.get<LedgerPeriodReportResponse>(
    `${LEDGER_PERIOD_REPORTS_URL}/${uuid}`,
    { signal: options?.signal },
  );
  return toLedgerPeriodReport(report);
};

/** A report is frozen once generated, so it never needs invalidating. */
export const getLedgerPeriodReportQueryOptions = (uuid: string) =>
  queryOptions({
    queryKey: [LEDGER_PERIOD_REPORTS_URL, uuid],
    queryFn: ({ signal }) => getLedgerPeriodReport(uuid, { signal }),
    staleTime: Infinity,
  });

export const useLedgerPeriodReport = (uuid: string) =>
  useSuspenseQuery(getLedgerPeriodReportQueryOptions(uuid)).data;
