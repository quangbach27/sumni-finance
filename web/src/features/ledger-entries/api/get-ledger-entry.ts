import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { GetLedgerEntryResponse, LedgerEntry } from './types';

export const LEDGER_ENTRIES_URL = '/api/v1/ledger-entries';

/** Decimals may be serialized as strings; normalize so math doesn't concatenate. */
export const normalizeLedgerEntry = (entry: LedgerEntry): LedgerEntry => ({
  ...entry,
  amount: Number(entry.amount),
  balance_before: Number(entry.balance_before),
  balance_after: Number(entry.balance_after),
});

export const getLedgerEntry = async (
  uuid: string,
  options?: { signal?: AbortSignal },
): Promise<LedgerEntry> => {
  const res = await http.get<GetLedgerEntryResponse>(
    `${LEDGER_ENTRIES_URL}/${uuid}`,
    { signal: options?.signal },
  );
  return normalizeLedgerEntry(res.entry);
};

export const getLedgerEntryQueryOptions = (uuid: string) =>
  queryOptions({
    queryKey: [LEDGER_ENTRIES_URL, uuid],
    queryFn: ({ signal }) => getLedgerEntry(uuid, { signal }),
  });
