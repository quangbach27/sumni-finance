import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { invalidateLedgerPeriods } from './invalidate-ledger-periods';

import type { ReconcileStatementsRequest } from './response';

type ReconcileStatementsInput = {
  periodUuid: string;
  statements: { statementUuid: string; actualBalance: number }[];
};

const reconcileStatements = ({
  periodUuid,
  statements,
}: ReconcileStatementsInput) =>
  http.post<void, ReconcileStatementsRequest>(
    `${LEDGER_PERIODS_URL}/${periodUuid}/statements/reconcile`,
    {
      statements: statements.map((s) => ({
        statement_uuid: s.statementUuid,
        actual_balance: s.actualBalance,
      })),
    },
  );

export const useReconcileStatements = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reconcileStatements,
    onSuccess: () => invalidateLedgerPeriods(queryClient),
  });
};
