import { AlertTriangle, Check, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { formatAmount, parseAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import { CURRENCY, signed } from './statement-row';

import type { StatementRow } from './statement-row';

type ActualBalanceInputProps = {
  row: StatementRow;
  disabled?: boolean;
  className?: string;
  onChange: (text: string) => void;
};

/** Digits-only input for the real balance of a statement. */
export function ActualBalanceInput({
  row,
  disabled,
  className,
  onChange,
}: ActualBalanceInputProps) {
  const mismatch = row.status === 'mismatch';
  const value =
    row.status === 'reconciled'
      ? formatAmount(row.actualBalance ?? 0, CURRENCY)
      : row.typedBalance
        ? formatAmount(parseAmount(row.typedBalance, CURRENCY), CURRENCY)
        : '';
  return (
    <Input
      inputMode="numeric"
      aria-label={`Số dư thực tế ${row.name}`}
      className={cn(
        'text-right tabular-nums',
        mismatch && 'border-destructive ring-destructive/20 ring-3',
        className,
      )}
      disabled={disabled || row.status === 'reconciled'}
      aria-invalid={mismatch}
      value={value}
      placeholder="Nhập số dư"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
    />
  );
}

export function DifferenceValue({
  difference,
  className,
}: {
  difference?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        difference ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {difference === undefined ? '—' : difference ? signed(difference) : '0'}
    </span>
  );
}

export function ReconciledBadge() {
  return (
    <Badge className="bg-primary/10 text-primary">
      <Check data-icon="inline-start" />
      Đã đối soát
    </Badge>
  );
}

export function MismatchBadge() {
  return (
    <Badge variant="destructive">
      <AlertTriangle data-icon="inline-start" />
      Lệch
    </Badge>
  );
}

type ConfirmButtonProps = {
  confirming: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'lg';
  onClick: () => void;
};

export function ConfirmButton({
  confirming,
  disabled,
  className,
  size,
  onClick,
}: ConfirmButtonProps) {
  return (
    <Button
      size={size}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      <Check data-icon="inline-start" />
      {confirming ? 'Đang xác nhận...' : 'Xác nhận khớp'}
    </Button>
  );
}

/** Placeholder actions for mismatches until adjusting entries are supported. */
export function MismatchActions({
  className,
  buttonClassName,
}: {
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Sắp có"
        className={buttonClassName}
      >
        Xem bút toán
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Sắp có"
        className={buttonClassName}
      >
        <Plus data-icon="inline-start" />
        Điều chỉnh
      </Button>
    </div>
  );
}
