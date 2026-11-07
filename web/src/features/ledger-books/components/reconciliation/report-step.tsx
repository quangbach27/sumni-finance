import { useState } from 'react';

import { Check, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import ReopenPeriodButton from './reopen-period-dialog';
import { useGenerateLedgerPeriodReport } from '../../api/generate-ledger-period-report';

import type { LedgerPeriodDetail } from '../../api/types';

/** Step 3 banner: generate the report, or open it once it exists. */
export default function ReportStep({ period }: { period: LedgerPeriodDetail }) {
  const generateReport = useGenerateLedgerPeriodReport();
  const [error, setError] = useState<string>();

  const generate = async () => {
    setError(undefined);
    try {
      await generateReport.mutateAsync(period.uuid);
    } catch (e) {
      setError(formatApiError(e, 'Không thể tạo báo cáo.').message);
    }
  };

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
          thẻ. Cần sửa? (chỉ khi chưa mở kỳ mới)
        </p>
        {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <ReopenPeriodButton
          periodUuid={period.uuid}
          periodName={period.name}
          label="Mở lại kỳ"
        />
        <Button onClick={generate} disabled={generateReport.isPending}>
          <FileText data-icon="inline-start" />
          {generateReport.isPending ? 'Đang tạo...' : 'Tạo báo cáo'}
        </Button>
      </div>
    </div>
  );
}
