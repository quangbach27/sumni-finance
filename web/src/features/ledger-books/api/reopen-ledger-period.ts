import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { UNLOCKED_LEDGER_PERIOD_URL } from './get-unlocked-ledger-period';

import type { ReopenLedgerPeriodRequest } from './response';

type Variables = { uuid: string } & ReopenLedgerPeriodRequest;

const reopenLedgerPeriod = ({ uuid, ...body }: Variables) =>
  http.post<void>(`${LEDGER_PERIODS_URL}/${uuid}/reopen`, body);

export const useReopenLedgerPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reopenLedgerPeriod,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [LEDGER_PERIODS_URL] }),
        queryClient.invalidateQueries({
          queryKey: [UNLOCKED_LEDGER_PERIOD_URL],
        }),
      ]),
  });
};
