import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { toast } from '@/components/ui/toast';

import {
  StatusAlertProvider,
  useStatusAlertActions,
} from '@/components/shared/status-alert/status-alert-provider';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useIsMobile } from '@/hooks/use-mobile';
import { isApiError } from '@/lib/clients';

import {
  countCategories,
  createCategoriesSchema,
  emptyCategoryRow,
  isBlankRow,
  useUpsertCategories,
} from '../../api/upsert-categories';
import CreateCategoriesForm from './create-categories-form';

import type { CreateCategoriesFormValues } from '../../api/upsert-categories';
import type { Resolver } from 'react-hook-form';

const FORM_ID = 'create-categories-form';
const TITLE = 'Thêm danh mục';
const DESCRIPTION = 'Nhập nhiều danh mục một lần. Dòng trống sẽ được bỏ qua.';
const ERROR_TITLE = 'Không thể thêm danh mục';
const ERROR_FALLBACK = 'Không thể thêm danh mục. Vui lòng thử lại.';

const defaultValues = (): CreateCategoriesFormValues => ({
  rows: [emptyCategoryRow(), emptyCategoryRow(), emptyCategoryRow()],
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CreateCategoriesDialog(props: Props) {
  return (
    <StatusAlertProvider>
      <CreateCategoriesDialogContent {...props} />
    </StatusAlertProvider>
  );
}

function CreateCategoriesDialogContent({ open, onOpenChange }: Props) {
  const isMobile = useIsMobile();
  const { showAlert, dismissAlert } = useStatusAlertActions();
  const { mutate, isPending } = useUpsertCategories();
  const [pending, setPending] = useState<CreateCategoriesFormValues>();
  const [discardOpen, setDiscardOpen] = useState(false);

  // Owned above the Drawer/Dialog switch so values survive a breakpoint change.
  const form = useForm<CreateCategoriesFormValues>({
    resolver: zodResolver(
      createCategoriesSchema,
    ) as Resolver<CreateCategoriesFormValues>,
    defaultValues: defaultValues(),
  });
  const { isDirty } = form.formState;
  const rows = useWatch({ control: form.control, name: 'rows' });
  const counts = countCategories(rows);

  // `dismissAlert` changes with every status; keep it out of the effect deps.
  const dismissRef = useRef(dismissAlert);
  dismissRef.current = dismissAlert;

  useEffect(() => {
    if (open) {
      form.reset(defaultValues());
      dismissRef.current();
    }
  }, [open, form]);

  // Editing dismisses a stale alert.
  useEffect(() => {
    const sub = form.watch(() => dismissAlert());
    return () => sub.unsubscribe();
  }, [form, dismissAlert]);

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next && isDirty) setDiscardOpen(true);
    else onOpenChange(next);
  };

  const handleError = (error: unknown, values: CreateCategoriesFormValues) => {
    const { message, details } = formatApiError(error, ERROR_FALLBACK);
    if (isApiError(error)) {
      // Backend paths ("1", "1.0") index the rows that were sent (non-blank).
      const sent = values.rows
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => !isBlankRow(row));
      for (const detail of error.details) {
        const [cat, sub] = detail.entity_id?.split('.') ?? [];
        const target = sent.at(Number(cat));
        if (!cat || !target) continue;
        const name = sub ? 'tags' : 'name';
        form.setError(`rows.${target.i}.${name}`, { message: detail.message });
      }
    }
    showAlert({
      variant: 'destructive',
      title: ERROR_TITLE,
      message,
      details,
    });
  };

  const confirm = () => {
    const values = pending;
    if (!values) return;
    const { categories } = countCategories(values.rows);
    mutate(values.rows, {
      onSuccess: () => {
        setPending(undefined);
        toast.add({
          type: 'success',
          title: `Đã thêm ${categories} danh mục.`,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        setPending(undefined);
        handleError(error, values);
      },
    });
  };

  const handleSubmit = (values: CreateCategoriesFormValues) => {
    if (countCategories(values.rows).categories === 0) {
      showAlert({
        variant: 'destructive',
        title: ERROR_TITLE,
        message: 'Vui lòng nhập ít nhất một danh mục.',
      });
      return;
    }
    setPending(values);
  };

  const formContent = (
    <CreateCategoriesForm
      id={FORM_ID}
      form={form}
      onSubmit={handleSubmit}
      disabled={isPending}
    />
  );

  const summary = (
    <span className="text-muted-foreground text-sm">
      {counts.categories} danh mục · {counts.tags} thẻ sẽ được tạo
    </span>
  );
  const cancelButton = (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => handleOpenChange(false)}
      className="h-10"
    >
      Hủy
    </Button>
  );
  const submitButton = (
    <Button
      type="submit"
      form={FORM_ID}
      disabled={isPending || counts.categories === 0}
      className="h-10"
    >
      {counts.categories > 0
        ? `Thêm ${counts.categories} danh mục`
        : 'Thêm danh mục'}
    </Button>
  );

  const dialogs = (
    <>
      <AlertDialog
        open={!!pending}
        onOpenChange={(next) => {
          if (!next && !isPending) setPending(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Thêm {counts.categories} danh mục
              {counts.tags > 0 ? ` và ${counts.tags} thẻ` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Danh mục và thẻ dùng chung cho mọi kỳ sổ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Quay lại</AlertDialogCancel>
            <Button type="button" disabled={isPending} onClick={confirm}>
              {isPending ? 'Đang thêm...' : 'Xác nhận'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy thêm danh mục?</AlertDialogTitle>
            <AlertDialogDescription>
              Thông tin bạn đã nhập sẽ không được lưu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Hủy bỏ
            </AlertDialogAction>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{TITLE}</DrawerTitle>
              <DrawerDescription>{DESCRIPTION}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">{formContent}</div>
            <div className="flex flex-col gap-2 p-4">
              {summary}
              {submitButton}
              {cancelButton}
            </div>
          </DrawerContent>
        </Drawer>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next, details) => {
          if (
            !next &&
            details.reason !== 'close-press' &&
            details.reason !== 'escape-key'
          ) {
            return;
          }
          handleOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{TITLE}</DialogTitle>
            <DialogDescription>{DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-0.5">
            {formContent}
          </div>
          <DialogFooter className="sm:items-center sm:justify-between">
            {summary}
            <div className="flex gap-2">
              {cancelButton}
              {submitButton}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialogs}
    </>
  );
}
