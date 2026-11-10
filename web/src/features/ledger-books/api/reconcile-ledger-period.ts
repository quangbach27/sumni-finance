import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { invalidateLedgerPeriods } from './invalidate-ledger-periods';

const reconcileLedgerPeriod = (uuid: string) =>
  http.post<void>(`${LEDGER_PERIODS_URL}/${uuid}/reconcile`);

export const useReconcileLedgerPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reconcileLedgerPeriod,
    onSuccess: () => invalidateLedgerPeriods(queryClient),
  });
};
