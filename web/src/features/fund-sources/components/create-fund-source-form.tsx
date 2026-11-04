import { useEffect, useRef, useState } from 'react';

import {
  Banknote,
  CircleAlert,
  CircleCheck,
  Landmark,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Controller } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { isApiError } from '@/lib/clients';
import { formatAmount, getCurrencySymbol, parseAmount } from '@/lib/currency';

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
          <Alert
            ref={alertRef}
            variant={status.type === 'success' ? 'success' : 'destructive'}
          >
            {status.type === 'success' ? <CircleCheck /> : <CircleAlert />}
            <AlertTitle>
              {status.type === 'success'
                ? 'Thêm nguồn quỹ thành công'
                : 'Không thể thêm nguồn quỹ'}
            </AlertTitle>
            <AlertDescription>
              {status.message}
              {status.details && status.details.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {status.details.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
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
              <Controller
                control={form.control}
                name="owner_name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fund-source-owner">
                      Chủ tài khoản
                    </FieldLabel>
                    <Input
                      {...field}
                      id="fund-source-owner"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      className="h-10"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="account_number"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="fund-source-account">
                      Số tài khoản
                    </FieldLabel>
                    <Input
                      {...field}
                      id="fund-source-account"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      className="h-10"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          </>
        )}

        {type === 'cash' && (
          <Controller
            control={form.control}
            name="owner_name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="fund-source-owner">
                  Người giữ tiền
                </FieldLabel>
                <Input
                  {...field}
                  id="fund-source-owner"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  className="h-10"
                />
                <FieldDescription>
                  Người chịu trách nhiệm giữ khoản tiền mặt này.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}

        <Controller
          control={form.control}
          name="balance"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fund-source-balance">
                Số dư ban đầu
              </FieldLabel>
              <div className="relative">
                <Input
                  id="fund-source-balance"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  className="h-10 pr-9 text-right"
                  value={formatAmount(field.value, 'VND')}
                  onBlur={field.onBlur}
                  onChange={(e) =>
                    field.onChange(parseAmount(e.target.value, 'VND'))
                  }
                />
                <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm underline">
                  {getCurrencySymbol('VND')}
                </span>
              </div>
              <FieldDescription>
                Số dư tại thời điểm bắt đầu dùng sổ.
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="fund-source-name">
                  Tên nguồn quỹ
                </FieldLabel>
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
              </div>
              <Input
                {...field}
                id="fund-source-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                className="h-10"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}
