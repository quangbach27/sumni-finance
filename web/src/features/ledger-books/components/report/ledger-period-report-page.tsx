import { Link } from '@tanstack/react-router';
import { ArrowLeft, Check, Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import { formatDate } from '@/lib/date';

import { useLedgerPeriod } from '../../api/get-ledger-period';
import { useLedgerPeriodReport } from '../../api/get-ledger-period-report';
import ReportCategoriesTable from './report-categories-table';
import ReportFundSourcesTable from './report-fund-sources-table';
import ReportSummary from './report-summary';

export default function LedgerPeriodReportPage({
  reportUuid,
}: {
  reportUuid: string;
}) {
  const { periodUuid } = useLedgerPeriodReport(reportUuid);
  const period = useLedgerPeriod(periodUuid);
  const range = `${formatDate(new Date(period.openDate))} – ${formatDate(new Date(period.closeDate))}`;

  return (
    <ContentLayout
      title={`Báo cáo ${period.name}`}
      description={range}
      titleAdornment={
        <Badge variant="secondary">
          <Check data-icon="inline-start" />
          Đã đối soát
        </Badge>
      }
      additionalContent={
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link to="/ledger-books/$uuid" params={{ uuid: periodUuid }}>
              <ArrowLeft data-icon="inline-start" />
              Về kỳ
            </Link>
          }
        />
      }
    >
      <div className="mt-6 flex flex-col gap-6">
        <ReportSummary reportUuid={reportUuid} />
        <ReportFundSourcesTable reportUuid={reportUuid} />
        <ReportCategoriesTable reportUuid={reportUuid} />
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Lock className="size-4 shrink-0" />
          Thu vào = Nợ (+), chi ra = Có (−). Báo cáo được tạo từ các bút toán đã
          khóa của kỳ {period.name}.
        </p>
      </div>
    </ContentLayout>
  );
}
