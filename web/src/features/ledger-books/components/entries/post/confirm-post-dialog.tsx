import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { DEFAULT_CURRENCY, formatAmount } from '@/lib/currency';

import {
  formatSignedAmount,
  getBalanceAfter,
} from './post-journal-entries-model';

import type { Totals } from './post-journal-entries-model';
import type { FormattedApiError } from '@/features/fund-sources/api/format-api-error';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundSourceName: string;
  currentBalance: number;
  totals: Totals;
  isPending: boolean;
  error?: FormattedApiError;
  onConfirm: () => void;
};

const Line = ({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={`font-semibold tabular-nums ${className ?? ''}`}>{value}</dd>
  </div>
);

/** Confirms the batch, showing the fund source's balance before and after. */
export default function ConfirmPostDialog({
  open,
  onOpenChange,
  fundSourceName,
  currentBalance,
  totals,
  isPending,
  error,
  onConfirm,
}: Props) {
  const after = getBalanceAfter(currentBalance, totals);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => !isPending && onOpenChange(o)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Ghi {totals.count} bút toán vào {fundSourceName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bút toán đã ghi không thể sửa. Sai sót được xử lý bằng bút toán đảo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="divide-y text-sm">
          <Line
            label={`Số dư hiện tại của ${fundSourceName}`}
            value={formatAmount(currentBalance, DEFAULT_CURRENCY)}
          />
          <Line
            label="Thu vào (Nợ)"
            value={formatSignedAmount(totals.inflow, 'inflow')}
            className="text-primary"
          />
          <Line
            label="Chi ra (Có)"
            value={formatSignedAmount(totals.outflow, 'outflow')}
            className="text-destructive"
          />
          <Line
            label="Số dư sau khi ghi"
            value={formatAmount(after, DEFAULT_CURRENCY)}
          />
        </dl>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{error.message}</AlertTitle>
            {error.details.length > 0 && (
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {error.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </AlertDescription>
            )}
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Huỷ</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Đang ghi...' : 'Ghi bút toán'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
