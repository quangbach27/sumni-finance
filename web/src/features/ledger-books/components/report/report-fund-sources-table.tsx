import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatAmount } from '@/lib/currency';

import { useLedgerPeriodReport } from '../../api/get-ledger-period-report';
import FundSourceInitials from '../shared/fund-source-initials';
import { amountOrDash } from './format';

const ReconcileBadge = ({ reconciled }: { reconciled: boolean }) =>
  reconciled ? (
    <Badge variant="outline" className="border-primary text-primary">
      <Check data-icon="inline-start" />
      Khớp
    </Badge>
  ) : (
    <Badge variant="outline" className="border-destructive text-destructive">
      Chưa khớp
    </Badge>
  );

export default function ReportFundSourcesTable({
  reportUuid,
}: {
  reportUuid: string;
}) {
  const report = useLedgerPeriodReport(reportUuid);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Số dư nguồn quỹ</h3>
      <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Nguồn quỹ</TableHead>
              <TableHead className="text-right">Đầu kỳ</TableHead>
              <TableHead className="text-right">
                Thu vào
                <span className="text-muted-foreground block text-xs font-normal">
                  Nợ
                </span>
              </TableHead>
              <TableHead className="text-right">
                Chi ra
                <span className="text-muted-foreground block text-xs font-normal">
                  Có
                </span>
              </TableHead>
              <TableHead className="text-right">Cuối kỳ</TableHead>
              <TableHead>Đối soát</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.fundSources.map((f) => (
              <TableRow key={f.fundSourceUuid}>
                <TableCell>
                  <div className="flex items-center gap-3 font-medium">
                    <FundSourceInitials name={f.name} />
                    {f.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatAmount(f.startBalance, 'VND')}
                </TableCell>
                <TableCell className="text-primary text-right tabular-nums">
                  {f.totalInflow
                    ? `+${formatAmount(f.totalInflow, 'VND')}`
                    : '—'}
                </TableCell>
                <TableCell className="text-destructive text-right tabular-nums">
                  {f.totalOutflow
                    ? `−${formatAmount(f.totalOutflow, 'VND')}`
                    : '—'}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {amountOrDash(f.closeBalance)}
                </TableCell>
                <TableCell>
                  <ReconcileBadge reconciled={f.isReconciled} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Tổng cộng</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatAmount(report.startBalance, 'VND')}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                +{formatAmount(report.totalInflow, 'VND')}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                −{formatAmount(report.totalOutflow, 'VND')}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatAmount(report.closeBalance, 'VND')}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}
