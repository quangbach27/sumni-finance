import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

type TextInputProps = ComponentProps<typeof Input> & { invalid?: boolean };

/** `Input` with the form-field defaults; pair with `FormField`. */
export default function TextInput({
  invalid,
  className,
  ...props
}: TextInputProps) {
  return (
    <Input
      aria-invalid={invalid}
      className={cn('h-10', className)}
      {...props}
    />
  );
}
