import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { UNLOCKED_LEDGER_PERIOD_URL } from './get-unlocked-ledger-period';

const closeLedgerPeriod = (uuid: string) =>
  http.post<void>(`${LEDGER_PERIODS_URL}/${uuid}/close`);

export const useCloseLedgerPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeLedgerPeriod,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [LEDGER_PERIODS_URL] }),
        queryClient.invalidateQueries({
          queryKey: [UNLOCKED_LEDGER_PERIOD_URL],
        }),
      ]),
  });
};
