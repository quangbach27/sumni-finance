import { Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import StatusAlertOutlet from '@/components/shared/status-alert/status-alert-outlet';

import { emptyCategoryRow } from '../../api/upsert-categories';
import TagInput from './tag-input';

import type { CreateCategoriesFormValues } from '../../api/upsert-categories';
import type { UseFormReturn } from 'react-hook-form';

type CreateCategoriesFormProps = {
  id: string;
  form: UseFormReturn<CreateCategoriesFormValues>;
  onSubmit: (values: CreateCategoriesFormValues) => void;
  disabled?: boolean;
};

const BORDER = 'border-r';

export default function CreateCategoriesForm({
  id,
  form,
  onSubmit,
  disabled,
}: CreateCategoriesFormProps) {
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });

  const focusRow = (index: number) =>
    requestAnimationFrame(() =>
      document.getElementById(`${id}-name-${index}`)?.focus(),
    );

  const addRow = () => {
    append(emptyCategoryRow());
    focusRow(fields.length);
  };

  return (
    <form
      id={id}
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <StatusAlertOutlet />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className={`${BORDER} w-12 text-center`}>#</TableHead>
              <TableHead className={`${BORDER} w-[28%]`}>
                Tên danh mục
              </TableHead>
              <TableHead className={`${BORDER} w-[28%]`}>
                Mô tả{' '}
                <span className="text-muted-foreground font-normal">
                  không bắt buộc
                </span>
              </TableHead>
              <TableHead className={BORDER}>
                Thẻ (danh mục con){' '}
                <span className="text-muted-foreground font-normal">
                  không bắt buộc
                </span>
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const errors = formState.errors.rows?.[index];
              return (
                <TableRow key={field.id} className="align-top">
                  <TableCell
                    className={`${BORDER} text-muted-foreground text-center`}
                  >
                    {index + 1}
                  </TableCell>
                  <TableCell className={`${BORDER} p-0`}>
                    <Controller
                      control={control}
                      name={`rows.${index}.name`}
                      render={({ field: f }) => (
                        <Input
                          {...f}
                          id={`${id}-name-${index}`}
                          autoComplete="off"
                          disabled={disabled}
                          placeholder="Tên danh mục…"
                          aria-invalid={!!errors?.name}
                          aria-label={`Tên danh mục ${index + 1}`}
                          className="h-12 rounded-none border-0 px-3 shadow-none focus-visible:ring-inset"
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            if (index === fields.length - 1) addRow();
                            else focusRow(index + 1);
                          }}
                        />
                      )}
                    />
                    {errors?.name?.message && (
                      <p className="text-destructive px-3 pb-2 text-xs">
                        {errors.name.message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className={`${BORDER} p-0`}>
                    <Controller
                      control={control}
                      name={`rows.${index}.description`}
                      render={({ field: f }) => (
                        <Input
                          {...f}
                          autoComplete="off"
                          disabled={disabled}
                          placeholder="Mô tả…"
                          aria-label={`Mô tả danh mục ${index + 1}`}
                          className="h-12 rounded-none border-0 px-3 shadow-none focus-visible:ring-inset"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell className={`${BORDER} p-0`}>
                    <Controller
                      control={control}
                      name={`rows.${index}.tags`}
                      render={({ field: f }) => (
                        <TagInput
                          value={f.value}
                          onChange={f.onChange}
                          disabled={disabled}
                          invalid={!!errors?.tags}
                          placeholder="Nhập tên thẻ rồi nhấn Enter"
                          aria-label={`Thẻ của danh mục ${index + 1}`}
                        />
                      )}
                    />
                    {errors?.tags?.message && (
                      <p className="text-destructive px-3 pb-2 text-xs">
                        {errors.tags.message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled || fields.length === 1}
                      aria-label={`Xóa dòng ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={addRow}
        >
          <Plus data-icon="inline-start" />
          Thêm dòng
        </Button>
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <kbd className="bg-muted text-foreground rounded-md px-2 py-0.5 text-xs font-medium">
            Enter
          </kbd>
          dòng kế
        </span>
      </div>
    </form>
  );
}
