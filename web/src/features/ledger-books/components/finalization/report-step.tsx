import { Check, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

import StepActionBar from '@/components/shared/step-flow/step-action-bar';
import { useStepFlow } from '@/components/shared/step-flow/step-flow-context';

import { useGenerateLedgerPeriodReport } from '../../api/generate-ledger-period-report';

import type { LedgerPeriodDetail } from '../../api/types';

/** Step 3: "ready to generate" banner with the generate action, or the report card once it exists. */
export default function ReportStep({ period }: { period: LedgerPeriodDetail }) {
  const { isCurrent, openConfirm } = useStepFlow();
  const generateReport = useGenerateLedgerPeriodReport();

  if (period.reportUuid) {
    return (
      <div className="bg-card flex flex-wrap items-center gap-4 rounded-2xl border p-4 shadow-sm md:px-8">
        <span className="bg-card flex size-14 shrink-0 items-center justify-center rounded-xl border">
          <FileText className="text-primary size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">Báo cáo {period.name}</p>
          <p className="text-muted-foreground text-sm">
            {period.statements.length} nguồn quỹ · {period.entryCount} bút toán
          </p>
        </div>
        {/* TODO: enable once the report page exists. */}
        <Button disabled>
          <FileText data-icon="inline-start" />
          Mở báo cáo
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card flex flex-wrap items-center gap-4 rounded-2xl border p-4 shadow-sm md:px-8">
        <span className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-full">
          <Check className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">
            Tất cả nguồn quỹ đã khớp. Sẵn sàng tạo báo cáo.
          </p>
          <p className="text-muted-foreground text-sm">
            Báo cáo ghi lại số dư từng nguồn quỹ, tổng nợ và có theo danh mục và
            thẻ.
          </p>
        </div>
      </div>

      {isCurrent && (
        <StepActionBar>
          <Button
            onClick={() =>
              openConfirm({
                title: 'Tạo báo cáo?',
                description:
                  'Báo cáo ghi lại số dư từng nguồn quỹ, tổng nợ và có theo danh mục và thẻ.',
                confirmLabel: 'Tạo báo cáo',
                onConfirm: () => generateReport.mutateAsync(period.uuid),
              })
            }
          >
            <Check data-icon="inline-start" />
            Tạo báo cáo
          </Button>
        </StepActionBar>
      )}
    </>
  );
}
