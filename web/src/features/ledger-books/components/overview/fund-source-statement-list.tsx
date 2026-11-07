import { formatAmount } from '@/lib/currency';

import { isStatementReconciled } from '../../api/is-statement-reconciled';
import { ReconciledBadge } from '../reconciliation/statement-cells';
import FundSourceInitials from '../shared/fund-source-initials';
import {
  getFundSourceSubtitle,
  getFundSourceTitle,
} from '../shared/fund-source-label';

import type { LedgerStatement } from '../../api/types';

const COLUMNS = 3;

/** Per-fund-source reconciliation progress for a closed period. */
export default function FundSourceStatementList({
  statements,
}: {
  statements: LedgerStatement[];
}) {
  const done = statements.filter(isStatementReconciled).length;
  const fillerCount = (COLUMNS - (statements.length % COLUMNS)) % COLUMNS;

  return (
    <section className="flex flex-col gap-3 border-t pt-4 md:border-t-0 md:pt-0">
      <h3 className="font-semibold">
        Nguồn quỹ{' '}
        <span className="text-muted-foreground font-normal">
          <span className="hidden md:inline">· </span>
          {done}/{statements.length} đã đối soát
        </span>
      </h3>
      <ul className="bg-border grid grid-cols-1 divide-y md:grid-cols-3 md:gap-px md:divide-y-0 md:overflow-hidden md:rounded-xl md:border">
        {statements.map((s) => {
          const name = getFundSourceTitle(s.fundSource);
          const subtitle = getFundSourceSubtitle(s.fundSource);
          const reconciled = isStatementReconciled(s);
          return (
            <li
              key={s.uuid}
              className="bg-background flex min-w-0 items-center gap-3 py-3 md:p-4"
            >
              <FundSourceInitials name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" title={name}>
                  {name}
                </p>
                {subtitle && (
                  <p
                    className="text-muted-foreground truncate text-xs"
                    title={subtitle}
                  >
                    {subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
                  <span className="text-muted-foreground tabular-nums">
                    {formatAmount(s.closingBalance ?? 0, 'VND')}
                  </span>
                  {reconciled ? (
                    <ReconciledBadge />
                  ) : (
                    <span className="text-muted-foreground whitespace-nowrap">
                      Chưa đối soát
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {Array.from({ length: fillerCount }, (_, i) => (
          <li
            key={`filler-${i}`}
            aria-hidden
            className="bg-muted hidden md:block"
          />
        ))}
      </ul>
    </section>
  );
}
