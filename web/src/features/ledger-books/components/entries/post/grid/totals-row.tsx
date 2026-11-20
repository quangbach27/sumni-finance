import { memo } from 'react';

import { DEFAULT_CURRENCY, formatAmount } from '@/lib/currency';

import { formatSignedAmount } from '../post-journal-entries-model';
import { WIDTH } from './columns';

import type { Totals } from '../post-journal-entries-model';
import type { ReactNode } from 'react';

const cell = 'px-3 text-right font-semibold tabular-nums';

/** Sum of Nợ / Có under the grid, aligned with the amount columns. */
const TotalsRow = memo(function TotalsRowView({
  totals,
  summary,
}: {
  totals: Totals;
  summary?: ReactNode;
}) {
  return (
    <div className="bg-muted/50 flex min-h-9 items-center border-t text-sm">
      <div className="flex-1 px-3 py-1">{summary}</div>
      <div className={cell} style={{ width: WIDTH.amount }}>
        <span className="text-muted-foreground mr-2 text-xs font-normal">
          Tổng
        </span>
        {totals.inflow > 0 ? (
          <span className="text-primary">
            {formatSignedAmount(totals.inflow, 'inflow')}
          </span>
        ) : (
          formatAmount(0, DEFAULT_CURRENCY)
        )}
      </div>
      <div className={cell} style={{ width: WIDTH.amount }}>
        {totals.outflow > 0 ? (
          <span className="text-destructive">
            {formatSignedAmount(totals.outflow, 'outflow')}
          </span>
        ) : (
          formatAmount(0, DEFAULT_CURRENCY)
        )}
      </div>
    </div>
  );
});

export default TotalsRow;
