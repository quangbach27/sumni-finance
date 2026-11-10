import { useEffect, useMemo, useState } from 'react';

import { debounce } from 'lodash-es';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { parseAmount } from '@/lib/currency';

import { useLedgerPeriod } from '../api/get-ledger-period';
import { isStatementReconciled } from '../api/is-statement-reconciled';
import { useReconcileStatements } from '../api/reconcile-statements';
import {
  CURRENCY,
  rowLabels,
} from '../components/ledger-period-details/reconciliation-step/statement-row';

import type {
  RowStatus,
  StatementRow,
} from '../components/ledger-period-details/reconciliation-step/statement-row';

const SETTLE_DELAY_MS = 500;

/** Typed balances, derived statement rows and per-row confirm of a reconciliation. */
export function useStatementReconciliation(periodUuid: string) {
  const { statements } = useLedgerPeriod(periodUuid);
  const reconcileStatements = useReconcileStatements();

  // Digits typed per statement UUID.
  const [typedBalances, setTypedBalances] = useState<Record<string, string>>(
    {},
  );
  // Copy of `typedBalances` once the user pauses typing; match/mismatch uses this.
  const [settledBalances, setSettledBalances] = useState<
    Record<string, string>
  >({});
  const settleBalance = useMemo(
    () =>
      debounce(
        (statementUuid: string, text: string) =>
          setSettledBalances((b) => ({ ...b, [statementUuid]: text })),
        SETTLE_DELAY_MS,
      ),
    [],
  );
  useEffect(() => () => settleBalance.cancel(), [settleBalance]);

  const [confirmErrors, setConfirmErrors] = useState<Record<string, string>>(
    {},
  );

  const rows: StatementRow[] = statements.map((s) => {
    // Closed periods always have a closing balance; it is what the real balance must match.
    const closingBalance = s.closingBalance ?? 0;
    const typedBalance = typedBalances[s.uuid];
    const settledBalance = settledBalances[s.uuid];
    const reconciled = isStatementReconciled(s);
    const isTyping = !reconciled && typedBalance !== settledBalance;
    const actualBalance = reconciled
      ? s.actualBalance
      : isTyping || !settledBalance
        ? undefined
        : parseAmount(settledBalance, CURRENCY);
    const difference =
      actualBalance === undefined ? undefined : actualBalance - closingBalance;
    const status: RowStatus = reconciled
      ? 'reconciled'
      : actualBalance === undefined
        ? 'empty'
        : difference === 0
          ? 'match'
          : 'mismatch';
    return {
      statement: s,
      ...rowLabels(s.fundSource),
      closingBalance,
      movement: closingBalance - s.openingBalance,
      typedBalance,
      actualBalance,
      difference,
      status,
      isTyping,
      error: confirmErrors[s.uuid],
    };
  });

  const counts = {
    totalCount: rows.length,
    reconciledCount: rows.filter((r) => r.status === 'reconciled').length,
    matchedCount: rows.filter((r) => r.status === 'match').length,
    mismatchedCount: rows.filter((r) => r.status === 'mismatch').length,
  };

  // The statement being confirmed right now, if any.
  const confirmingStatementUuid = reconcileStatements.isPending
    ? reconcileStatements.variables.statements[0].statementUuid
    : undefined;

  const changeActualBalance = (statementUuid: string, text: string) => {
    setTypedBalances((b) => ({ ...b, [statementUuid]: text }));
    settleBalance(statementUuid, text);
    setConfirmErrors(({ [statementUuid]: _, ...rest }) => rest);
  };

  const confirm = async (statementUuid: string) => {
    const row = rows.find((r) => r.statement.uuid === statementUuid);
    if (!row || row.actualBalance === undefined) return;
    try {
      await reconcileStatements.mutateAsync({
        periodUuid,
        statements: [{ statementUuid, actualBalance: row.actualBalance }],
      });
    } catch (e) {
      setConfirmErrors((errors) => ({
        ...errors,
        [statementUuid]: formatApiError(e, 'Không thể xác nhận đối soát.')
          .message,
      }));
    }
  };

  return {
    rows,
    counts,
    confirmingStatementUuid,
    changeActualBalance,
    confirm,
  };
}
