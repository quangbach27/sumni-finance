import { useId } from 'react';

import { Controller } from 'react-hook-form';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';

import type { ComponentProps, ElementType, ReactNode } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';

/** Props `FormField` supplies to `Component`; callers can't override them. */
type ControlledProps = {
  id: string;
  'aria-describedby': string | undefined;
  name: string;
  value: unknown;
  onChange: unknown;
  onBlur: unknown;
  ref: unknown;
  invalid: boolean;
};

type FormFieldProps<T extends FieldValues, TComponent extends ElementType> = {
  control: Control<T>;
  name: Path<T>;
  label: ReactNode;
  description?: ReactNode;
  /** Rendered on the right of the label row (e.g. a "suggest" button). */
  labelAction?: ReactNode;
  /**
   * The control. Must accept `id`, `name`, `value`, `onChange`, `onBlur`, `ref`,
   * `invalid` and `aria-describedby` (plus `disabled` when set on the form),
   * along with any extra props given to `FormField`.
   */
  Component: TComponent;
} & Omit<ComponentProps<TComponent>, keyof ControlledProps>;

/** react-hook-form field: label, control, description and error in one place. */
export default function FormField<
  T extends FieldValues,
  TComponent extends ElementType,
>({
  control,
  name,
  label,
  description,
  labelAction,
  Component,
  ...rest
}: FormFieldProps<T, TComponent>) {
  const id = useId();
  // TS can't resolve props of a generic `ElementType`; callers are still typed
  // through `FormFieldProps`.
  const Control: ElementType = Component;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {labelAction}
          </div>
          <Control
            {...rest}
            {...field}
            id={id}
            invalid={fieldState.invalid}
            aria-describedby={
              [
                description ? descriptionId : null,
                fieldState.error ? errorId : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
          {description && (
            <FieldDescription id={descriptionId}>
              {description}
            </FieldDescription>
          )}
          <FieldError id={errorId} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
