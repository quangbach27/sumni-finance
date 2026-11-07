import { useState } from 'react';

import { Check, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import ReopenPeriodButton from './reopen-period-dialog';
import { useReconcileLedgerPeriod } from '../../api/reconcile-ledger-period';

type Props = {
  periodUuid: string;
  periodName: string;
  totalCount: number;
  reconciledCount: number;
};

/** Sticky action bar: complete the reconciliation or reopen the period. */
export default function ReconciliationFooter({
  periodUuid,
  periodName,
  totalCount,
  reconciledCount,
}: Props) {
  const { mutateAsync, isPending: completing } = useReconcileLedgerPeriod();
  const [error, setError] = useState<string>();
  const allDone = totalCount > 0 && reconciledCount === totalCount;
  // Reopening is blocked once any statement is confirmed.
  const canReopen = reconciledCount === 0;

  const complete = async () => {
    setError(undefined);
    try {
      await mutateAsync(periodUuid);
    } catch (e) {
      setError(formatApiError(e, 'Không thể hoàn tất đối soát.').message);
    }
  };

  return (
    <div className="bg-card sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col gap-3 border-t p-4 md:static md:m-0 md:flex-row md:flex-wrap md:items-center md:justify-between md:rounded-2xl md:border md:px-8 md:shadow-sm">
      <p className="text-muted-foreground order-1 flex items-center justify-center gap-2 text-sm md:order-0 md:justify-start">
        <Lock className="hidden size-4 md:block" />
        {allDone
          ? 'Tất cả nguồn quỹ đã được xác nhận'
          : `Cần xác nhận cả ${totalCount} nguồn quỹ`}
      </p>
      <div className="contents md:flex md:flex-wrap md:items-center md:gap-3">
        {error && (
          <p className="text-destructive order-2 text-center text-sm md:order-0">
            {error}
          </p>
        )}
        <Button
          className="order-3 h-11 md:order-2 md:h-10 md:px-5"
          onClick={complete}
          disabled={!allDone || completing}
        >
          <Check data-icon="inline-start" />
          {completing ? 'Đang hoàn tất...' : 'Đánh dấu đã đối soát'}
        </Button>
        <div className="order-4 flex flex-col md:order-1 md:contents [&_button]:h-11 md:[&_button]:h-10 md:[&_button]:px-5">
          <ReopenPeriodButton
            periodUuid={periodUuid}
            periodName={periodName}
            label="Mở lại kỳ để sửa"
            disabled={!canReopen}
            disabledReason="Không thể mở lại kỳ khi đã có nguồn quỹ được xác nhận"
          />
        </div>
      </div>
    </div>
  );
}
