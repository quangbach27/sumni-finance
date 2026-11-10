import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';

import StepActionBar from '@/components/shared/step-flow/step-action-bar';
import {
  useStepFlowActions,
  useStepFlowState,
} from '@/components/shared/step-flow/step-flow-context';

import { useLedgerPeriod } from '../../../api/get-ledger-period';
import { useReconcileLedgerPeriod } from '../../../api/reconcile-ledger-period';
import { useStatementReconciliation } from '../../../hooks/use-statement-reconciliation';
import ReconciledStatementTable from './reconciled-statement-table';
import ReconciliationIntro from './reconciliation-intro';
import ReopenPeriodButton from './reopen-period-dialog';
import StatementCards from './statement-cards';
import UnreconciledStatementTable from './unreconciled-statement-table';

/** Reconcile step: compare system and real balances, then mark the period reconciled. */
export default function ReconciliationStep({
  periodUuid,
}: {
  periodUuid: string;
}) {
  const period = useLedgerPeriod(periodUuid);
  const { isCurrent } = useStepFlowState();
  const { openConfirm } = useStepFlowActions();
  const reconciliation = useStatementReconciliation(periodUuid);
  const reconcilePeriod = useReconcileLedgerPeriod();

  const isReconciled = period.status === 'reconciled';
  const { rows, counts } = reconciliation;
  const allDone =
    counts.totalCount > 0 && counts.reconciledCount === counts.totalCount;
  const needAllMessage = `Cần xác nhận cả ${counts.totalCount} nguồn quỹ`;
  const listProps = {
    rows,
    disabled: isReconciled,
    confirmingStatementUuid: reconciliation.confirmingStatementUuid,
    onActualBalanceChange: reconciliation.changeActualBalance,
    onConfirm: reconciliation.confirm,
  };

  return (
    <>
      {!isReconciled && <ReconciliationIntro {...counts} />}
      <div className="md:hidden">
        <StatementCards {...listProps} />
      </div>
      <div className="hidden md:block">
        {isReconciled ? (
          <ReconciledStatementTable rows={rows} />
        ) : (
          <UnreconciledStatementTable {...listProps} />
        )}
      </div>

      {isCurrent && (
        <StepActionBar
          helper={
            allDone ? 'Tất cả nguồn quỹ đã được xác nhận' : needAllMessage
          }
        >
          <ReopenPeriodButton
            periodUuid={periodUuid}
            periodName={period.name}
            label="Mở lại kỳ để sửa"
            // Reopening is blocked once any statement is confirmed.
            disabled={counts.reconciledCount > 0}
            disabledReason="Không thể mở lại kỳ khi đã có nguồn quỹ được xác nhận"
          />
          <Button
            disabled={!allDone}
            title={allDone ? undefined : needAllMessage}
            onClick={() =>
              openConfirm({
                title: 'Hoàn tất đối soát?',
                description: `Tất cả ${counts.totalCount} nguồn quỹ của ${period.name} đã khớp. Sau khi xác nhận, bạn có thể tạo báo cáo.`,
                confirmLabel: 'Hoàn tất đối soát',
                action: () => reconcilePeriod.mutateAsync(periodUuid),
              })
            }
          >
            <Check data-icon="inline-start" />
            Đánh dấu đã đối soát
          </Button>
        </StepActionBar>
      )}
    </>
  );
}
