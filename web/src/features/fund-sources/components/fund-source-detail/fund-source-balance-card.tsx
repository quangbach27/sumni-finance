import { useSuspenseQuery } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';

import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import { getFundSourceQueryOptions } from '../../api/get-fund-source';

export default function FundSourceBalanceCard({
  fundSourceUuid,
}: {
  fundSourceUuid: string;
}) {
  const { data } = useSuspenseQuery(getFundSourceQueryOptions(fundSourceUuid));
  const { fundSource, latestEntryAt } = data;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Số dư hiện tại</p>
          <p className="text-4xl font-bold tabular-nums">
            {formatCurrency(fundSource.balance, fundSource.currency)}
          </p>
        </div>
        {latestEntryAt && (
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Sau bút toán gần nhất</p>
            <p className="font-medium">{formatDate(new Date(latestEntryAt))}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
