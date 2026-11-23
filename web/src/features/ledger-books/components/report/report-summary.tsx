import StatCard from '@/components/shared/stat-card/stat-card';

import { formatAmount } from '@/lib/currency';

import { useLedgerPeriodReport } from '../../api/get-ledger-period-report';

export default function ReportSummary({ reportUuid }: { reportUuid: string }) {
  const report = useLedgerPeriodReport(reportUuid);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Số dư đầu kỳ"
        value={
          <span className="text-2xl font-bold tabular-nums">
            {formatAmount(report.startBalance, 'VND')}
          </span>
        }
      />
      <StatCard
        label="Tổng thu vào (Nợ)"
        value={
          <span className="text-primary text-2xl font-bold tabular-nums">
            +{formatAmount(report.totalInflow, 'VND')}
          </span>
        }
      />
      <StatCard
        label="Tổng chi ra (Có)"
        value={
          <span className="text-destructive text-2xl font-bold tabular-nums">
            −{formatAmount(report.totalOutflow, 'VND')}
          </span>
        }
      />
      <StatCard
        variant="primary"
        label="Số dư cuối kỳ"
        value={
          <span className="text-2xl font-bold tabular-nums">
            {formatAmount(report.closeBalance, 'VND')}
          </span>
        }
      />
    </div>
  );
}
