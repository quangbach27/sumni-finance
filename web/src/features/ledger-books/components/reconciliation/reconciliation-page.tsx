import { Navigate } from '@tanstack/react-router';

import Stepper from '@/components/shared/stepper/stepper';

import ReconciledStatementTable from './reconciled-statement-table';
import ReconciliationFooter from './reconciliation-footer';
import ReconciliationIntro from './reconciliation-intro';
import ReportStep from './report-step';
import StatementCards from './statement-cards';
import UnreconciledStatementTable from './unreconciled-statement-table';
import { useStatementReconciliation } from '../../hooks/use-statement-reconciliation';

import type { LedgerPeriodDetail } from '../../api/types';
import type { Step } from '@/components/shared/stepper/stepper';

const buildSteps = (isReconciled: boolean, hasReport: boolean): Step[] => [
  {
    title: 'Ghi bút toán',
    hint: isReconciled ? 'Hoàn tất' : 'Đã đóng',
    state: 'done',
  },
  isReconciled
    ? { title: 'Đối soát', hint: 'Tất cả đã khớp', state: 'done' }
    : { title: 'Đối soát', hint: 'Đang kiểm tra số dư', state: 'current' },
  {
    title: 'Báo cáo',
    hint: hasReport ? 'Đã tạo' : isReconciled ? 'Sẵn sàng tạo' : 'Chưa tạo',
    state: hasReport ? 'done' : isReconciled ? 'current' : 'todo',
  },
];

/** Reconciliation of a closed period: compare system balances with real balances. */
export default function ReconciliationPage({
  period,
}: {
  period: LedgerPeriodDetail;
}) {
  const reconciliation = useStatementReconciliation(
    period.uuid,
    period.statements,
  );

  if (period.status !== 'closed' && period.status !== 'reconciled') {
    return <Navigate to="/ledger-books" replace />;
  }
  const isReconciled = period.status === 'reconciled';
  const { rows, counts } = reconciliation;
  const listProps = {
    rows,
    disabled: isReconciled,
    confirmingStatementUuid: reconciliation.confirmingStatementUuid,
    onActualBalanceChange: reconciliation.changeActualBalance,
    onConfirm: reconciliation.confirm,
  };

  return (
    <div className="mt-4 flex flex-col gap-5">
      <Stepper steps={buildSteps(isReconciled, Boolean(period.reportUuid))} />

      {isReconciled ? (
        <ReportStep period={period} />
      ) : (
        <ReconciliationIntro {...counts} />
      )}

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

      {!isReconciled && (
        <ReconciliationFooter
          periodUuid={period.uuid}
          periodName={period.name}
          totalCount={counts.totalCount}
          reconciledCount={counts.reconciledCount}
        />
      )}
    </div>
  );
}
