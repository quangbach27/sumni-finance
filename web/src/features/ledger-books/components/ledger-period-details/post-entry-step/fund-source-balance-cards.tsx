import { TrendingDown, TrendingUp } from 'lucide-react';

import { formatAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import { useLedgerPeriod } from '../../../api/get-ledger-period';
import FundSourceInitials from '../../shared/fund-source-initials';
import {
  getFundSourceSubtitle,
  getFundSourceTitle,
} from '../../shared/fund-source-label';

const Change = ({ value, inverted }: { value: number; inverted?: boolean }) => {
  const Icon = value < 0 ? TrendingDown : TrendingUp;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium tabular-nums',
        inverted
          ? 'bg-primary-foreground/15 text-primary-foreground'
          : value < 0
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary',
      )}
    >
      <Icon className="size-4" />
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {formatAmount(Math.abs(value), 'VND')}
    </span>
  );
};

/** Total balance plus the current balance and in-period change of each fund source. */
export default function FundSourceBalanceCards({
  periodUuid,
}: {
  periodUuid: string;
}) {
  const period = useLedgerPeriod(periodUuid);
  const cards = period.statements.map((s) => {
    const balance = s.closingBalance ?? s.fundSource.balance;
    return {
      uuid: s.uuid,
      name: getFundSourceTitle(s.fundSource),
      subtitle: getFundSourceSubtitle(s.fundSource),
      balance,
      change: balance - s.openingBalance,
    };
  });
  const total = cards.reduce((sum, c) => sum + c.balance, 0);
  const totalChange = cards.reduce((sum, c) => sum + c.change, 0);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">
        Nguồn quỹ{' '}
        <span className="text-muted-foreground font-normal">
          · {cards.length}
        </span>
      </h3>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li className="bg-primary text-primary-foreground flex flex-col justify-between gap-6 rounded-2xl p-5 shadow-sm">
          <p className="text-sm opacity-90">Tổng số dư hiện tại</p>
          <div className="flex flex-col items-start gap-3">
            <p className="text-3xl font-bold tabular-nums">
              {formatAmount(total, 'VND')}
            </p>
            <Change value={totalChange} inverted />
          </div>
        </li>
        {cards.map((c) => (
          <li
            key={c.uuid}
            className="bg-card flex min-w-0 flex-col gap-5 rounded-2xl border p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <FundSourceInitials name={c.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold" title={c.name}>
                  {c.name}
                </p>
                {c.subtitle && (
                  <p
                    className="text-muted-foreground truncate text-xs"
                    title={c.subtitle}
                  >
                    {c.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <p className="text-2xl font-bold tabular-nums">
                {formatAmount(c.balance, 'VND')}
              </p>
              <span className="flex items-center gap-2">
                <Change value={c.change} />
                <span className="text-muted-foreground text-sm">trong kỳ</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
