import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Lock,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useIsMobile } from '@/hooks/use-mobile';
import { formatAmount } from '@/lib/currency';
import { daysUntil, formatDate } from '@/lib/date';

import ClosePeriodButton from './close-period-dialog';
import FundSourceStatementList from './fund-source-statement-list';
import PeriodStatTiles from './period-stat-tiles';
import { getSystemBalance } from '../../api/get-unlocked-ledger-period';
import { getMockPeriodExtras } from '../../api/mock-period-extras';

import type { LedgerPeriodDetail } from '../../api/types';

type Props = { period: LedgerPeriodDetail };

type PeriodView = {
  isClosed: boolean;
  entryCount: number;
  closeDate: Date;
  daysLeft: number;
  balance: number;
  range: string;
  balanceLabel: string;
};

type LayoutProps = { period: LedgerPeriodDetail; view: PeriodView };

const formatShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const getPeriodView = (period: LedgerPeriodDetail): PeriodView => {
  const isClosed = period.status === 'closed';
  const closeDate = new Date(period.closeDate);
  return {
    isClosed,
    entryCount: getMockPeriodExtras(period).entryCount,
    closeDate,
    daysLeft: daysUntil(closeDate),
    balance: getSystemBalance(period),
    range: `${formatShort(period.openDate)} – ${formatDate(closeDate)}`,
    balanceLabel: isClosed ? 'Số dư cuối kỳ (hệ thống)' : 'Số dư hiện tại',
  };
};

const PeriodAlert = ({ view }: { view: PeriodView }) => {
  const { isClosed, daysLeft, closeDate } = view;

  if (isClosed) {
    return (
      <Alert className="bg-muted/50">
        <Lock />
        <AlertTitle>Kỳ đã đóng, chưa đối soát</AlertTitle>
        <AlertDescription>
          Không thể ghi thêm bút toán. Đối soát số dư hệ thống với thực tế của
          từng nguồn quỹ để hoàn tất kỳ.
        </AlertDescription>
      </Alert>
    );
  }

  if (daysLeft < 0 || daysLeft > 7) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
      <AlertTriangle />
      <AlertTitle>
        {daysLeft === 0
          ? 'Hôm nay là hạn đóng kỳ'
          : `Còn ${daysLeft} ngày đến hạn đóng kỳ`}
      </AlertTitle>
      <AlertDescription>
        Hạn đóng kỳ {formatDate(closeDate)}. Đóng kỳ để đối soát số dư từng
        nguồn quỹ và tạo báo cáo.
      </AlertDescription>
    </Alert>
  );
};

const ReconciliationButton = ({
  periodUuid,
  className,
  size,
}: {
  periodUuid: string;
  className?: string;
  size?: 'lg';
}) => (
  <Button
    size={size}
    className={className}
    render={
      <Link
        to="/ledger-books/$uuid/finalization"
        params={{ uuid: periodUuid }}
      />
    }
  >
    <Check data-icon="inline-start" />
    Đối soát
  </Button>
);

const DesktopLayout = ({ period, view }: LayoutProps) => {
  const { isClosed, range, balance, balanceLabel } = view;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">{period.name}</h2>
            {isClosed ? (
              <Badge variant="outline" className="shrink-0 border-dashed">
                <Lock data-icon="inline-start" />
                Đã đóng · chờ đối soát
              </Badge>
            ) : (
              <Badge className="shrink-0">Đang mở</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-base">{range}</p>
        </div>
        {/* TODO: wire entries / post-entry / reconciliation once those flows exist. */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled>
            <BookOpen data-icon="inline-start" />
            Tất cả bút toán
          </Button>
          {isClosed ? (
            <ReconciliationButton periodUuid={period.uuid} />
          ) : (
            <>
              <ClosePeriodButton
                periodUuid={period.uuid}
                periodName={period.name}
              />
              <Button disabled>Vào sổ</Button>
            </>
          )}
        </div>
      </div>

      <PeriodAlert view={view} />

      <PeriodStatTiles
        openingBalance={period.openingBalance}
        totalInflow={period.totalInflow}
        totalOutflow={period.totalOutflow}
        balance={balance}
        balanceLabel={balanceLabel}
      />

      {isClosed && <FundSourceStatementList statements={period.statements} />}
    </div>
  );
};

const MobileLayout = ({ period, view }: LayoutProps) => {
  const { isClosed, range, balance, balanceLabel, entryCount } = view;

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{period.name}</h2>
          {isClosed ? (
            <Badge variant="outline" className="shrink-0 border-dashed">
              <Lock data-icon="inline-start" />
              Chờ đối soát
            </Badge>
          ) : (
            <Badge className="shrink-0">Đang mở</Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{range}</p>
      </div>

      {/* TODO: wire post-entry once that flow exists. */}
      {!isClosed && (
        <div className="flex flex-wrap gap-3">
          <Button disabled className="flex-1">
            Vào sổ
          </Button>
          <ClosePeriodButton
            periodUuid={period.uuid}
            periodName={period.name}
            className="flex-1"
          />
        </div>
      )}

      <PeriodAlert view={view} />

      <div>
        <p className="text-muted-foreground text-sm">{balanceLabel}</p>
        <p className="text-4xl font-bold tabular-nums">
          {formatAmount(balance, 'VND')} ₫
        </p>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-primary">
          Thu vào +{formatAmount(period.totalInflow, 'VND')}
        </span>
        <span className="text-destructive">
          Chi ra −{formatAmount(period.totalOutflow, 'VND')}
        </span>
      </div>

      {isClosed && (
        <>
          <FundSourceStatementList statements={period.statements} />
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                {entryCount} bút toán
              </span>
              {/* TODO: wire to the entries page once it exists. */}
              <button
                type="button"
                disabled
                className="text-primary flex items-center gap-1 font-medium disabled:opacity-100"
              >
                Xem tất cả bút toán
                <ChevronRight className="size-4" />
              </button>
            </div>
            <ReconciliationButton
              periodUuid={period.uuid}
              size="lg"
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

/** Open or closed-awaiting-reconciliation period; separate layouts for mobile and desktop. */
export default function UnlockedPeriodCard({ period }: Props) {
  const isMobile = useIsMobile();
  const view = getPeriodView(period);
  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <div className="bg-card mt-6 rounded-2xl border shadow-sm">
      <Layout period={period} view={view} />
    </div>
  );
}
