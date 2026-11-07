import { Navigate } from '@tanstack/react-router';

import StepFlow from '@/components/shared/step-flow/step-flow';

import RecordStep from './record-step';
import ReportStep from './report-step';
import ReconcileStep from '../reconciliation/reconcile-step';

import type { LedgerPeriodDetail } from '../../api/types';
import type { FlowStep } from '@/components/shared/step-flow/step-flow';

/** Finalization of a closed period: record, reconcile balances, then generate the report. */
export default function FinalizationPage({
  period,
}: {
  period: LedgerPeriodDetail;
}) {
  if (period.status !== 'closed' && period.status !== 'reconciled') {
    return <Navigate to="/ledger-books" replace />;
  }
  const isReconciled = period.status === 'reconciled';
  const hasReport = Boolean(period.reportUuid);

  const steps: FlowStep[] = [
    {
      id: 'record',
      title: 'Ghi bút toán',
      hint: isReconciled ? 'Hoàn tất' : 'Đã đóng',
      content: <RecordStep period={period} />,
    },
    {
      id: 'reconcile',
      title: 'Đối soát',
      hint: isReconciled ? 'Tất cả đã khớp' : 'Đang kiểm tra số dư',
      content: <ReconcileStep period={period} />,
    },
    {
      id: 'report',
      title: 'Báo cáo',
      hint: hasReport ? 'Đã tạo' : isReconciled ? 'Sẵn sàng tạo' : 'Chưa tạo',
      content: <ReportStep period={period} />,
    },
  ];

  const currentStepId = hasReport
    ? null
    : isReconciled
      ? 'report'
      : 'reconcile';

  return (
    <div className="mt-4">
      <StepFlow steps={steps} currentStepId={currentStepId} />
    </div>
  );
}
