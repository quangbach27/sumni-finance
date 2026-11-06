import { useState } from 'react';

import { vi } from 'react-day-picker/locale';

import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { formatDate, parseDateString, toDateString } from '@/lib/date';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD`, or empty. Displayed as `dd/mm/yyyy`. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
  /** `YYYY-MM-DD`: earlier days are disabled. */
  minDate?: string;
  className?: string;
};

export default function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder = 'dd/mm/yyyy',
  minDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateString(value);
  const min = minDate ? parseDateString(minDate) : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              'h-10 w-full justify-between font-normal',
              !selected && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <span>{selected ? formatDate(selected) : placeholder}</span>
        <CalendarIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={vi}
          selected={selected}
          defaultMonth={selected}
          disabled={min ? { before: min } : undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(toDateString(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
