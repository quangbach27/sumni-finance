import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { formatAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

import {
  ActualBalanceInput,
  ConfirmButton,
  DifferenceValue,
  MismatchActions,
  MismatchBadge,
  ReconciledBadge,
} from './statement-cells';
import { CURRENCY } from './statement-row';
import FundSourceInitials from '../shared/fund-source-initials';

import type { StatementListProps, StatementRow } from './statement-row';

function StatusBadge({ status }: { status: StatementRow['status'] }) {
  switch (status) {
    case 'reconciled':
      return <ReconciledBadge />;
    case 'mismatch':
      return <MismatchBadge />;
    case 'match':
      return (
        <Badge variant="outline" className="border-primary text-primary">
          <Check data-icon="inline-start" />
          Khớp
        </Badge>
      );
    case 'empty':
      return null;
  }
}

type CardProps = Omit<StatementListProps, 'rows'> & { row: StatementRow };

function StatementCard({
  row,
  disabled,
  confirmingStatementUuid,
  onActualBalanceChange,
  onConfirm,
}: CardProps) {
  const mismatch = row.status === 'mismatch';
  return (
    <div
      className={cn(
        'bg-card flex flex-col gap-3 rounded-2xl border p-4 tabular-nums shadow-sm',
        row.status === 'reconciled' && 'border-primary',
        (mismatch || row.error) && 'border-destructive',
      )}
    >
      <div className="flex items-center gap-3">
        <FundSourceInitials name={row.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight font-semibold">
            {row.name}
          </p>
          <p className="text-muted-foreground text-sm">{row.kind}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <dl className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Số dư hệ thống</dt>
          <dd>{formatAmount(row.closingBalance, CURRENCY)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Số dư thực tế</dt>
          <dd className="w-1/2">
            <ActualBalanceInput
              row={row}
              disabled={disabled}
              className="h-11 text-base"
              onChange={(text) =>
                onActualBalanceChange(row.statement.uuid, text)
              }
            />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Chênh lệch</dt>
          <dd>
            <DifferenceValue
              difference={row.difference}
              className={cn(row.difference && 'font-semibold')}
            />
          </dd>
        </div>
      </dl>

      {row.status === 'match' && (
        <ConfirmButton
          size="lg"
          className="h-11 w-full"
          confirming={confirmingStatementUuid === row.statement.uuid}
          disabled={disabled || confirmingStatementUuid !== undefined}
          onClick={() => onConfirm(row.statement.uuid)}
        />
      )}

      {(row.error || mismatch) && (
        <div className="flex flex-col gap-3 border-t pt-3">
          <p className="text-muted-foreground text-sm">
            {row.error ?? 'Kiểm tra lại bút toán hoặc ghi bút toán điều chỉnh.'}
          </p>
          {mismatch && (
            <MismatchActions
              className="grid grid-cols-2 gap-2"
              buttonClassName="h-10"
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Mobile layout of the statement list: one card per fund source. */
export default function StatementCards({ rows, ...rest }: StatementListProps) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <StatementCard key={r.statement.uuid} row={r} {...rest} />
      ))}
    </div>
  );
}
