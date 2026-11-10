import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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

import { StatusAlertProvider } from '@/components/shared/status-alert/status-alert-provider';

import { useIsMobile } from '@/hooks/use-mobile';

import {
  createFundSourceSchema,
  getCreateFundSourceDefaultValues,
  useCreateFundSource,
} from '../api/create-fund-source';
import CreateFundSourceForm from './create-fund-source-form';

import type { CreateFundSourceFormValues } from '../api/create-fund-source';
import type { Resolver } from 'react-hook-form';

const FORM_ID = 'create-fund-source-form';

const TITLE = 'Thêm nguồn quỹ';
const DESCRIPTION = 'Chọn loại, nhập chi tiết rồi kiểm tra tên gợi ý.';

type CreateFundSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CreateFundSourceDialog(
  props: CreateFundSourceDialogProps,
) {
  return (
    <StatusAlertProvider>
      <CreateFundSourceDialogContent {...props} />
    </StatusAlertProvider>
  );
}

function CreateFundSourceDialogContent({
  open,
  onOpenChange,
}: CreateFundSourceDialogProps) {
  const isMobile = useIsMobile();
  const { mutateAsync, isPending } = useCreateFundSource();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Owned here, above the Drawer/Dialog switch, so values survive the
  // breakpoint changing (which remounts everything below).
  const form = useForm<CreateFundSourceFormValues>({
    resolver: zodResolver(
      createFundSourceSchema,
    ) as Resolver<CreateFundSourceFormValues>,
    defaultValues: getCreateFundSourceDefaultValues('bank'),
  });
  const { isDirty } = form.formState;

  // Reset on open (not close) so fields don't blank out during the exit
  // animation.
  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next) {
      // Nothing to lose (e.g. right after a successful create): close directly.
      if (isDirty) setConfirmOpen(true);
      else onOpenChange(false);
      return;
    }
    onOpenChange(next);
  };

  const discardAndClose = () => {
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const handleSubmit = async (input: CreateFundSourceFormValues) => {
    await mutateAsync(input);
    // Success: close right away (nothing left to discard).
    onOpenChange(false);
  };

  const formContent = (
    <CreateFundSourceForm id={FORM_ID} form={form} onSubmit={handleSubmit} />
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
    <Button type="submit" form={FORM_ID} disabled={isPending} className="h-10">
      {isPending ? 'Đang thêm...' : 'Thêm nguồn quỹ'}
    </Button>
  );

  const confirmDialog = (
    <DiscardConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      onConfirm={discardAndClose}
    />
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
              {submitButton}
              {cancelButton}
            </div>
          </DrawerContent>
        </Drawer>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next, details) => {
          // On desktop the modal only closes via explicit actions (X, "Hủy",
          // Esc) — not outside presses or focus loss (e.g. when the submit
          // button becomes disabled while it has focus).
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{TITLE}</DialogTitle>
            <DialogDescription>{DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto px-0.5">
            {formContent}
          </div>
          <DialogFooter>
            {cancelButton}
            {submitButton}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}

type DiscardConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

function DiscardConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: DiscardConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hủy thêm nguồn quỹ?</AlertDialogTitle>
          <AlertDialogDescription>
            Thông tin bạn đã nhập sẽ không được lưu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Hủy bỏ
          </AlertDialogAction>
          <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
