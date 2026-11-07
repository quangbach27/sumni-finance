import { useEffect, useRef, useState } from 'react';

import { Info } from 'lucide-react';

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

import DatePicker from '@/components/shared/date-picker/date-picker';
import FormField from '@/components/shared/form-field/form-field';
import TextInput from '@/components/shared/form-field/text-input';
import StatusAlert from '@/components/shared/status-alert/status-alert';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { isApiError } from '@/lib/clients';
import { formatAmount } from '@/lib/currency';

import type { OpenLedgerPeriodFormValues } from '../../api/open-ledger-period';
import type { LedgerPeriod } from '../../api/types';
import type { FundSource } from '@/features/fund-sources/api/types';
import type { UseFormReturn } from 'react-hook-form';

// Backend entity ids -> form field names.
const ENTITY_TO_FIELD: Record<string, keyof OpenLedgerPeriodFormValues> = {
  name: 'name',
  open_date: 'openDate',
  close_date: 'closeDate',
};

type OpenLedgerPeriodFormProps = {
  id: string;
  /** Owned by the parent so values survive Dialog <-> Drawer remounts. */
  form: UseFormReturn<OpenLedgerPeriodFormValues>;
  fundSources: FundSource[];
  previousPeriod?: LedgerPeriod;
  /** Success handling is the caller's; the form only handles errors. */
  onSubmit: (
    values: OpenLedgerPeriodFormValues,
    callbacks: { onError: (error: unknown) => void },
  ) => void;
};

type Status = {
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

  const handleError = (error: unknown) => {
    const { message, details } = formatApiError(error, ERROR_FALLBACK);
    if (isApiError(error)) {
      for (const detail of error.details) {
        const field = detail.entity_id && ENTITY_TO_FIELD[detail.entity_id];
        if (field) form.setError(field, { message: detail.message });
      }
    }
    setStatus({ message, details });
  };

  const handleSubmit = form.handleSubmit((values) => {
    setStatus(null);
    onSubmit(values, { onError: handleError });
  });

  return (
    <form id={id} onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {status && (
          <StatusAlert
            ref={alertRef}
            variant="destructive"
            title="Không thể mở kỳ mới"
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

        <FormField
          control={form.control}
          name="name"
          label="Tên kỳ"
          Component={TextInput}
          autoComplete="off"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="openDate"
            label="Từ ngày"
            Component={DatePicker}
          />
          <FormField
            control={form.control}
            name="closeDate"
            label="Đến ngày"
            Component={DatePicker}
            minDate={form.watch('openDate')}
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
