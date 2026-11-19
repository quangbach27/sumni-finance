import { useMutation, useQueryClient } from '@tanstack/react-query';

import { FUND_SOURCES_URL } from '@/features/fund-sources/api/get-fund-sources';
import { LEDGER_PERIODS_URL } from '@/features/ledger-books/api/get-ledger-periods';
import { UNLOCKED_LEDGER_PERIOD_URL } from '@/features/ledger-books/api/get-unlocked-ledger-period';

import { http } from '@/lib/clients';

import { LEDGER_ENTRIES_URL } from './get-ledger-entry';

import type { components } from '@/features/generated/ledgers.gen';

type VoidLedgerEntryRequest = components['schemas']['VoidLedgerEntryRequest'];

type Variables = { uuid: string } & VoidLedgerEntryRequest;

const voidLedgerEntry = ({ uuid, ...body }: Variables) =>
  http.post<void>(`${LEDGER_ENTRIES_URL}/${uuid}/void`, body);

/** Voiding changes entries, the fund source balance and the period totals. */
export const useVoidLedgerEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidLedgerEntry,
    onSuccess: () =>
      Promise.all(
        [
          LEDGER_ENTRIES_URL,
          FUND_SOURCES_URL,
          LEDGER_PERIODS_URL,
          UNLOCKED_LEDGER_PERIOD_URL,
        ].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] }),
        ),
      ),
  });
};
