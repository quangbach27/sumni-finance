import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';

import { getFundSourcesQueryOptions } from '@/features/fund-sources/api/get-fund-sources';

import { formatAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import { getBankName, initials } from '../shared/fund-source-label';

import type { LedgerStatement } from '../../api/types';

/** Per-fund-source reconcile progress for a closed period. */
export default function FundSourceStatementList({
  statements,
}: {
  statements: LedgerStatement[];
}) {
  const { data: fundSources } = useQuery(getFundSourcesQueryOptions());
  const done = statements.filter((s) => s.actualBalance !== undefined).length;

  return (
    <section className="flex flex-col gap-3 border-t pt-4 md:border-t-0 md:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h3 className="font-semibold">
          Đối soát nguồn quỹ{' '}
          <span className="text-muted-foreground font-normal">
            <span className="hidden md:inline">· </span>
            {done}/{statements.length}
          </span>
        </h3>
        <span className="text-muted-foreground hidden text-sm md:inline">
          Số dư hệ thống · cần so với thực tế
        </span>
      </div>
      <ul className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0 md:rounded-xl md:border">
        {statements.map((s) => {
          const fs = fundSources?.find((f) => f.uuid === s.fundSourceUuid);
          const name = (fs && getBankName(fs)) ?? 'Nguồn quỹ';
          const reconciled = s.actualBalance !== undefined;
          return (
            <li key={s.uuid} className="flex items-center gap-3 py-3 md:p-4">
              <span className="bg-muted text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {initials(name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{name}</p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  {formatAmount(s.closingBalance ?? s.currentBalance, 'VND')}
                </p>
              </div>
              <Badge
                variant={reconciled ? 'secondary' : 'outline'}
                className={cn(
                  'shrink-0 whitespace-nowrap',
                  !reconciled && 'border-dashed',
                )}
              >
                {reconciled ? 'Đã đối soát' : 'Chưa đối soát'}
              </Badge>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
