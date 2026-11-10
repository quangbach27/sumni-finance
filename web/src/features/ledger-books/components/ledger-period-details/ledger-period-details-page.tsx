import { Suspense, lazy } from 'react';

import StepFlow from '@/components/shared/step-flow/step-flow';

import { useLedgerPeriod } from '../../api/get-ledger-period';

import type { LedgerPeriodDetail } from '../../api/types';
import type { FlowStep } from '@/components/shared/step-flow/step-flow';

const PostEntryStep = lazy(
  () => import('./post-entry-step/post-entry-step.tsx'),
);

const ReconciliationStep = lazy(
  () => import('./reconciliation-step/reconciliation-step.tsx'),
);

const ReportStep = lazy(() => import('./report-step/report-step.tsx'));

const getCurrentStepId = (period: LedgerPeriodDetail) => {
  if (period.reportUuid) return null;
  if (period.status === 'opened') return 'post-entry';
  if (period.status === 'closed') return 'reconciliation';
  return 'report';
};

/** Detail of a ledger period: record entries, close and reconcile, then generate the report. */
export default function LedgerPeriodDetailsPage({
  periodUuid,
}: {
  periodUuid: string;
}) {
  const period = useLedgerPeriod(periodUuid);
  const isOpen = period.status === 'opened';
  const isReconciled = period.status === 'reconciled';
  const hasReport = Boolean(period.reportUuid);

  const steps: FlowStep[] = [
    {
      id: 'post-entry',
      title: 'Ghi bút toán',
      hint: isOpen
        ? `Đang làm · ${period.entryCount} bút toán`
        : `${period.entryCount} bút toán`,
      content: (
        <Suspense fallback={null}>
          <PostEntryStep periodUuid={periodUuid} />
        </Suspense>
      ),
    },
    {
      id: 'reconciliation',
      title: 'Đóng kỳ và đối soát',
      hint: isReconciled
        ? 'Tất cả đã khớp'
        : isOpen
          ? 'Chưa đóng kỳ'
          : 'Đang kiểm tra số dư',
      content: (
        <Suspense fallback={null}>
          <ReconciliationStep periodUuid={periodUuid} />
        </Suspense>
      ),
    },
    {
      id: 'report',
      title: 'Báo cáo',
      hint: hasReport
        ? 'Đã tạo'
        : isReconciled
          ? 'Sẵn sàng tạo'
          : 'Sau khi đối soát xong',
      content: (
        <Suspense>
          <ReportStep periodUuid={periodUuid} />
        </Suspense>
      ),
    },
  ];

  return (
    <div className="mt-4">
      {/* The flow owns its current step; remount when the server-side step changes. */}
      <StepFlow
        key={`${period.status}:${period.reportUuid ?? ''}`}
        steps={steps}
        initialStepId={getCurrentStepId(period)}
      />
    </div>
  );
}
