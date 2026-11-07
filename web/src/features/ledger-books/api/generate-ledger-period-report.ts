import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';

const generateLedgerPeriodReport = (uuid: string) =>
  http.post<void>(`${LEDGER_PERIODS_URL}/${uuid}/report`);

export const useGenerateLedgerPeriodReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateLedgerPeriodReport,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [LEDGER_PERIODS_URL] }),
  });
};
