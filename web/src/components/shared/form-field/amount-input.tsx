import { Input } from '@/components/ui/input';

import { formatAmount, getCurrencySymbol, parseAmount } from '@/lib/currency';

import type { ComponentProps } from 'react';

type AmountInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange'
> & {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
};

/** Right-aligned VND amount input that keeps a numeric form value. */
export default function AmountInput({
  value,
  onChange,
  invalid,
  ...props
}: AmountInputProps) {
  return (
    <div className="relative">
      <Input
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid}
        className="h-10 pr-9 text-right"
        {...props}
        value={formatAmount(value, 'VND')}
        onChange={(e) => onChange(parseAmount(e.target.value, 'VND'))}
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm underline">
        {getCurrencySymbol('VND')}
      </span>
    </div>
  );
}
