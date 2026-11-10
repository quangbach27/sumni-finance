import { memo } from 'react';

import { DEFAULT_CURRENCY, formatAmount } from '@/lib/currency';

import { WIDTH } from './columns';

import type { Totals } from '../post-journal-entries-model';

const cell = 'px-5 text-right font-semibold tabular-nums';

/** Sum of Nợ / Có under the grid, aligned with the amount columns. */
const TotalsRow = memo(function TotalsRowView({ totals }: { totals: Totals }) {
  return (
    <div className="bg-muted/50 flex h-12.5 items-center border-t text-base">
      <div className="flex-1 px-5 text-right font-semibold">Tổng</div>
      <div className={cell} style={{ width: WIDTH.amount }}>
        {formatAmount(totals.inflow, DEFAULT_CURRENCY)}
      </div>
      <div className={cell} style={{ width: WIDTH.amount }}>
        {formatAmount(totals.outflow, DEFAULT_CURRENCY)}
      </div>
    </div>
  );
});

export default TotalsRow;
