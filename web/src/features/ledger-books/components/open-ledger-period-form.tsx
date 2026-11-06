import { useEffect, useRef, useState } from 'react';

import { Info } from 'lucide-react';
import { Controller } from 'react-hook-form';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import DatePicker from '@/components/shared/date-picker/date-picker';
import StatusAlert from '@/components/shared/status-alert/status-alert';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { isApiError } from '@/lib/clients';
import { formatAmount } from '@/lib/currency';

import type { OpenLedgerPeriodFormValues } from '../api/open-ledger-period';
import type { LedgerPeriod } from '../api/types';
import type { FundSource } from '@/features/fund-sources/api/types';
import type { UseFormReturn } from 'react-hook-form';

// Backend entity ids -> form field names.
const ENTITY_TO_FIELD: Record<string, keyof OpenLedgerPeriodFormValues> = {
  name: 'name',
  open_date: 'open_date',
  close_date: 'close_date',
};

type OpenLedgerPeriodFormProps = {
  id: string;
  /** Owned by the parent so values survive Dialog <-> Drawer remounts. */
  form: UseFormReturn<OpenLedgerPeriodFormValues>;
  fundSources: FundSource[];
  previousPeriod?: LedgerPeriod;
  /** Resolves on success, rejects (ideally with an ApiError) on failure. */
  onSubmit: (values: OpenLedgerPeriodFormValues) => Promise<void>;
};

type Status = {
  type: 'success' | 'error';
  message: string;
  details?: string[];
};

const ERROR_FALLBACK = 'Không thể mở kỳ mới. Vui lòng thử lại.';

export default function OpenLedgerPeriodForm({
  id,
  form,
  fundSources,
  previousPeriod,
  onSubmit,
}: OpenLedgerPeriodFormProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const total = fundSources.reduce((sum, f) => sum + f.balance, 0);

  // Editing any field dismisses a stale success / error alert.
  useEffect(() => {
    const subscription = form.watch(() => setStatus(null));
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (status) alertRef.current?.scrollIntoView({ block: 'nearest' });
  }, [status]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setStatus(null);
    try {
      await onSubmit(values);
      // Reset first: it notifies watchers, which would clear the alert.
      form.reset(values);
      setStatus({
        type: 'success',
        message: `Đã mở kỳ "${values.name}".`,
      });
    } catch (error) {
      const { message, details } = formatApiError(error, ERROR_FALLBACK);
      if (isApiError(error)) {
        for (const detail of error.details) {
          const field = detail.entity_id && ENTITY_TO_FIELD[detail.entity_id];
          if (field) form.setError(field, { message: detail.message });
        }
      }
      setStatus({ type: 'error', message, details });
    }
  });

  return (
    <form id={id} onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {status && (
          <StatusAlert
            ref={alertRef}
            variant={status.type === 'success' ? 'success' : 'destructive'}
            title={
              status.type === 'success'
                ? 'Mở kỳ thành công'
                : 'Không thể mở kỳ mới'
            }
            onDismiss={() => setStatus(null)}
          >
            {status.message}
            {status.details && status.details.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {status.details.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </StatusAlert>
        )}

        <div className="bg-muted/50 flex gap-3 rounded-lg border p-3 text-sm">
          <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            <strong className="text-foreground font-semibold">
              Chỉ một kỳ được mở tại một thời điểm.
            </strong>{' '}
            {previousPeriod
              ? `Kỳ ${previousPeriod.name} đã đối soát nên bạn có thể mở kỳ mới.`
              : 'Đây sẽ là kỳ đầu tiên của sổ cái.'}
          </p>
        </div>

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="ledger-period-name">Tên kỳ</FieldLabel>
              <Input
                {...field}
                id="ledger-period-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                className="h-10"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="open_date"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="ledger-period-open-date">
                  Từ ngày
                </FieldLabel>
                <DatePicker
                  id="ledger-period-open-date"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="close_date"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="ledger-period-close-date">
                  Đến ngày
                </FieldLabel>
                <DatePicker
                  id="ledger-period-close-date"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={fieldState.invalid}
                  minDate={form.watch('open_date')}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <Field>
          <FieldLabel>Số dư đầu kỳ</FieldLabel>
          <div className="overflow-hidden rounded-lg border">
            <ul className="divide-y">
              {fundSources.map((fundSource) => (
                <li
                  key={fundSource.uuid}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {fundSource.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate font-medium">
                      {fundSource.name}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {formatAmount(fundSource.balance, fundSource.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="bg-muted/50 flex items-center justify-between border-t px-4 py-3 font-semibold">
              <span>Tổng số dư đầu kỳ</span>
              <span className="tabular-nums">{formatAmount(total, 'VND')}</span>
            </div>
          </div>
          <FieldDescription>
            {previousPeriod
              ? `Lấy từ số dư thực tế đã đối soát của kỳ ${previousPeriod.name}, không chỉnh sửa tại đây.`
              : 'Lấy từ số dư hiện tại của các nguồn quỹ, không chỉnh sửa tại đây.'}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
