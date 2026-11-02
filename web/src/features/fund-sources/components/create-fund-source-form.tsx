import { memo, useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Banknote,
  CircleAlert,
  CircleCheck,
  Landmark,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

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

import { formatAmount, getCurrencySymbol, parseAmount } from '@/lib/currency';

import { BankCombobox } from './bank-combobox';

import type { CreateFundSourceInput, FundSource } from '../api/types';
import type { Resolver } from 'react-hook-form';

const baseFields = {
  name: z.string().trim().min(1, 'Vui lòng nhập tên nguồn quỹ'),
  owner_name: z.string().trim().min(1, 'Vui lòng nhập tên'),
  balance: z.number().min(0, 'Số dư không được âm'),
};

const bankSchema = z.object({
  ...baseFields,
  type: z.literal('bank'),
  code: z.string().min(1, 'Vui lòng chọn ngân hàng'),
  bin: z.number(),
  short_name: z.string(),
  account_number: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số tài khoản')
    .regex(/^\d+$/, 'Số tài khoản chỉ gồm chữ số'),
});

const cashSchema = z.object({
  ...baseFields,
  type: z.literal('cash'),
});

const schema = z.discriminatedUnion('type', [bankSchema, cashSchema]);

// Flat shape for react-hook-form: every field exists while the user switches
// type; the schema decides which ones are validated.
type FormValues = Omit<z.infer<typeof bankSchema>, 'type'> & {
  type: FundSource['type'];
};

const DEFAULT_VALUES: FormValues = {
  type: 'bank',
  name: '',
  owner_name: '',
  account_number: '',
  code: '',
  bin: 0,
  short_name: '',
  balance: 0,
};

const TYPE_OPTIONS: {
  value: FundSource['type'];
  label: string;
  icon: typeof Landmark;
}[] = [
  { value: 'bank', label: 'Ngân hàng', icon: Landmark },
  { value: 'cash', label: 'Tiền mặt', icon: Banknote },
];

const TYPE_LABEL: Record<FundSource['type'], string> = {
  bank: 'Ngân hàng',
  cash: 'Tiền mặt',
};

const suggestName = (ownerName: string, type: FundSource['type']) => {
  const owner = ownerName.trim();
  return owner ? `${owner} · ${TYPE_LABEL[type]}` : '';
};

const toInput = (values: FormValues): CreateFundSourceInput => {
  const base = {
    name: values.name,
    balance: values.balance,
    currency: 'VND',
  };
  if (values.type === 'cash') {
    return {
      ...base,
      type: 'cash',
      details: { owner_name: values.owner_name },
    };
  }
  return {
    ...base,
    type: 'bank',
    details: {
      owner_name: values.owner_name,
      account_number: values.account_number,
      code: values.code,
      bin: values.bin,
      short_name: values.short_name,
    },
  };
};

type CreateFundSourceFormProps = {
  id: string;
  /** Resolves on success, rejects with an Error on failure. */
  onSubmit: (input: CreateFundSourceInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

type Status = { type: 'success' | 'error'; message: string };

const ERROR_FALLBACK = 'Không thể thêm nguồn quỹ. Vui lòng thử lại.';

const CreateFundSourceForm = ({
  id,
  onSubmit,
  onDirtyChange,
}: CreateFundSourceFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: DEFAULT_VALUES,
  });

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

  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setStatus(null);
    try {
      await onSubmit(toInput(values));
      // Reset first: it notifies watchers, which would clear the alert.
      form.reset(DEFAULT_VALUES);
      setStatus({
        type: 'success',
        message: `Đã thêm nguồn quỹ "${values.name}".`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error && error.message
            ? error.message
            : ERROR_FALLBACK,
      });
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
            <AlertDescription>{status.message}</AlertDescription>
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
                  const next = values[0] as FormValues['type'] | undefined;
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
                  form.setValue('code', bank.code, { shouldValidate: true });
                  form.setValue('bin', bank.bin);
                  form.setValue('short_name', bank.short_name);
                }}
              />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>

            <div className="bg-primary/10 border-primary/20 rounded-lg border p-3">
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-primary/70 text-xs">Mã ngân hàng</dt>
                  <dd className="text-primary font-semibold">{code || '—'}</dd>
                </div>
                <div>
                  <dt className="text-primary/70 text-xs">BIN</dt>
                  <dd className="text-primary font-semibold">{bin || '—'}</dd>
                </div>
                <div>
                  <dt className="text-primary/70 text-xs">Tên viết tắt</dt>
                  <dd className="text-primary font-semibold">
                    {shortName || '—'}
                  </dd>
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
};

export default memo(CreateFundSourceForm);
