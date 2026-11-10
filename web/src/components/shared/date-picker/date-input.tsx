import { useState } from 'react';

import { vi } from 'react-day-picker/locale';

import { CalendarIcon } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import {
  formatDateShort,
  parseDateString,
  parseTypedDate,
  toDateString,
} from '@/lib/date';
import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

type DateInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> & {
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
};

/**
 * Date field you can type into (`31/10`, `31/10/2026`, `3110`) or pick from a
 * calendar. Meant for table cells; pair with `FormField`.
 */
export default function DateInput({
  value,
  onChange,
  onBlur,
  invalid,
  className,
  ...props
}: DateInputProps) {
  const [draft, setDraft] = useState<string>();
  const [open, setOpen] = useState(false);
  const selected = parseDateString(value);

  const commit = () => {
    if (draft === undefined) return;
    const year = selected?.getFullYear();
    const parsed = parseTypedDate(draft, year);
    if (parsed) onChange(parsed);
    setDraft(undefined); // invalid text falls back to the previous value
  };

  return (
    <div className="relative">
      <Input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm"
        aria-invalid={invalid}
        className={cn('pr-10', className)}
        value={draft ?? formatDateShort(value)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          commit();
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          props.onKeyDown?.(e);
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          tabIndex={-1}
          aria-label="Chọn ngày từ lịch"
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-3 flex items-center"
        >
          <CalendarIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={vi}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return;
              setDraft(undefined);
              onChange(toDateString(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
