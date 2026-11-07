import { formatAmount } from '@/lib/currency';

type Tile = { label: string; value: string; tone?: 'in' | 'out' };

type PeriodStatTilesProps = {
  openingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  balance: number;
  balanceLabel: string;
};

const toneClass = { in: 'text-primary', out: 'text-destructive' } as const;

export default function PeriodStatTiles({
  openingBalance,
  totalInflow,
  totalOutflow,
  balance,
  balanceLabel,
}: PeriodStatTilesProps) {
  const tiles: Tile[] = [
    {
      label: 'Số dư đầu kỳ',
      value: formatAmount(openingBalance, 'VND'),
    },
    {
      label: 'Tổng thu vào (Nợ)',
      value: `+${formatAmount(totalInflow, 'VND')}`,
      tone: 'in',
    },
    {
      label: 'Tổng chi ra (Có)',
      value: `−${formatAmount(totalOutflow, 'VND')}`,
      tone: 'out',
    },
    {
      label: balanceLabel,
      value: formatAmount(balance, 'VND'),
    },
  ];

  return (
    <dl className="bg-muted/40 grid grid-cols-2 gap-px overflow-hidden rounded-xl border md:grid-cols-4 md:gap-0 md:divide-x">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="bg-card flex flex-col gap-1 p-4 md:bg-transparent md:px-6"
        >
          <dt className="text-muted-foreground text-sm">{t.label}</dt>
          <dd
            className={`text-2xl font-bold tabular-nums md:text-3xl ${t.tone ? toneClass[t.tone] : ''}`}
          >
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
