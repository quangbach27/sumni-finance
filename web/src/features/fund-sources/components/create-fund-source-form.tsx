import { useEffect, useRef, useState } from 'react';

import { Banknote, Landmark, Lock, Sparkles } from 'lucide-react';
import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import AmountInput from '@/components/shared/form-field/amount-input';
import FormField from '@/components/shared/form-field/form-field';
import TextInput from '@/components/shared/form-field/text-input';
import StatusAlert from '@/components/shared/status-alert/status-alert';

import { isApiError } from '@/lib/clients';

import BankCombobox from './bank-combobox';
import { formatApiError } from '../api/format-api-error';

import type { CreateFundSourceFormValues } from '../api/create-fund-source';
import type { FundSourceType } from '../api/types';
import type { UseFormReturn } from 'react-hook-form';

const TYPE_OPTIONS: {
  value: FundSourceType;
  label: string;
  icon: typeof Landmark;
}[] = [
  { value: 'bank', label: 'Ngân hàng', icon: Landmark },
  { value: 'cash', label: 'Tiền mặt', icon: Banknote },
];

const TYPE_LABEL: Record<FundSourceType, string> = {
  bank: 'Ngân hàng',
  cash: 'Tiền mặt',
};

const suggestName = (ownerName: string, type: FundSourceType) => {
  const owner = ownerName.trim();
  return owner ? `${owner} · ${TYPE_LABEL[type]}` : '';
};

// Backend entity ids -> form field names.
const ENTITY_TO_FIELD: Record<string, keyof CreateFundSourceFormValues> = {
  name: 'name',
  start_balance: 'balance',
  owner_name: 'owner_name',
  account_number: 'account_number',
  bank_code: 'code',
  bank_bin: 'bin',
  bank_short_name: 'short_name',
};

type CreateFundSourceFormProps = {
  id: string;
  /** Owned by the parent so values survive Dialog <-> Drawer remounts. */
  form: UseFormReturn<CreateFundSourceFormValues>;
  /** Resolves on success, rejects (ideally with an ApiError) on failure. */
  onSubmit: (values: CreateFundSourceFormValues) => Promise<void>;
};

type Status = {
  type: 'success' | 'error';
  message: string;
  details?: string[];
};

const ERROR_FALLBACK = 'Không thể thêm nguồn quỹ. Vui lòng thử lại.';

export default function CreateFundSourceForm({
  id,
  form,
  onSubmit,
}: CreateFundSourceFormProps) {
  const type = form.watch('type');
  const ownerName = form.watch('owner_name');
  const code = form.watch('code');
  const bin = form.watch('bin');
  const shortName = form.watch('short_name');

  const suggestedName = suggestName(ownerName, type);

  const [status, setStatus] = useState<Status | null>(null);

  const alertRef = useRef<HTMLDivElement>(null);

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
      form.reset();
      setStatus({
        type: 'success',
        message: `Đã thêm nguồn quỹ "${values.name}".`,
      });
    } catch (error) {
      const { message, details } = formatApiError(error, ERROR_FALLBACK);
      // Set field errors first: they must not be wiped by the watch() reset
      // of the alert, and setError does not notify watchers.
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
                ? 'Thêm nguồn quỹ thành công'
                : 'Không thể thêm nguồn quỹ'
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

        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Field>
              <FieldLabel>Loại</FieldLabel>
              <ToggleGroup
                value={[field.value]}
                onValueChange={(values) => {
                  const next = values[0] as FundSourceType | undefined;
                  if (!next) return;
                  form.reset();
                  field.onChange(next);
                }}
                spacing={2}
                className="grid w-full grid-cols-2"
              >
                {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    variant="outline"
                    className="data-pressed:border-primary data-pressed:bg-primary/10 data-pressed:text-primary h-14 gap-2 data-pressed:border-2"
                  >
                    <Icon />
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          )}
        />

        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {type === 'bank' ? 'Chi tiết ngân hàng' : 'Chi tiết tiền mặt'}
        </p>

        {type === 'bank' && (
          <>
            <Field data-invalid={!!form.formState.errors.code}>
              <FieldLabel htmlFor="fund-source-bank">Ngân hàng</FieldLabel>
              <BankCombobox
                id="fund-source-bank"
                value={code}
                invalid={!!form.formState.errors.code}
                onBankSelect={(bank) => {
                  form.setValue('code', bank.code, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  form.setValue('bin', bank.bin, { shouldDirty: true });
                  form.setValue('short_name', bank.short_name, {
                    shouldDirty: true,
                  });
                }}
              />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>

            <div className="bg-primary/10 border-primary/20 rounded-lg border p-3">
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-primary/70 text-xs">Tên ngân hàng</dt>
                  <dd className="text-primary font-semibold">
                    {shortName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-primary/70 text-xs">Mã ngân hàng</dt>
                  <dd className="text-primary font-semibold">{code || '—'}</dd>
                </div>
                <div>
                  <dt className="text-primary/70 text-xs">Mã BIN</dt>
                  <dd className="text-primary font-semibold">{bin || '—'}</dd>
                </div>
              </dl>
            </div>
            <p className="text-muted-foreground -mt-3 flex items-center gap-1.5 text-xs">
              <Lock className="size-3.5" />
              Tự điền khi chọn ngân hàng, không cần nhập.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="owner_name"
                label="Chủ tài khoản"
                Component={TextInput}
                autoComplete="off"
              />
              <FormField
                control={form.control}
                name="account_number"
                label="Số tài khoản"
                Component={TextInput}
                autoComplete="off"
                inputMode="numeric"
              />
            </div>
          </>
        )}

        {type === 'cash' && (
          <FormField
            control={form.control}
            name="owner_name"
            label="Người giữ tiền"
            description="Người chịu trách nhiệm giữ khoản tiền mặt này."
            Component={TextInput}
            autoComplete="off"
          />
        )}

        <FormField
          control={form.control}
          name="balance"
          label="Số dư ban đầu"
          description="Số dư tại thời điểm bắt đầu dùng sổ."
          Component={AmountInput}
        />

        <FormField
          control={form.control}
          name="name"
          label="Tên nguồn quỹ"
          Component={TextInput}
          autoComplete="off"
          labelAction={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-primary rounded-full"
              disabled={!suggestedName}
              onClick={() => {
                form.setValue('name', suggestedName, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            >
              <Sparkles data-icon="inline-start" />
              Tự gợi ý
            </Button>
          }
        />
      </FieldGroup>
    </form>
  );
}
