import { useCallback, useRef, useState } from 'react';

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

import { useIsMobile } from '@/hooks/use-mobile';

import CreateFundSourceForm from './create-fund-source-form';
import { useCreateFundSource } from '../api/create-fund-source';

import type { CreateFundSourceInput } from '../api/types';

const FORM_ID = 'create-fund-source-form';

const TITLE = 'Thêm nguồn quỹ';
const DESCRIPTION = 'Chọn loại, nhập chi tiết rồi kiểm tra tên gợi ý.';

type CreateFundSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CreateFundSourceDialog({
  open,
  onOpenChange,
}: CreateFundSourceDialogProps) {
  const isMobile = useIsMobile();
  const { mutateAsync, isPending } = useCreateFundSource();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // A ref (not state): only read when closing, must not re-render the shell.
  const dirtyRef = useRef(false);

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next) {
      // Nothing to lose (e.g. right after a successful create): close directly.
      if (dirtyRef.current) setConfirmOpen(true);
      else onOpenChange(false);
      return;
    }
    onOpenChange(next);
  };

  const discardAndClose = () => {
    setConfirmOpen(false);
    onOpenChange(false);
  };

  // The form unmounts with the popup, so closing also resets it.
  // Stable references so the memoized form skips re-renders caused by
  // confirm / pending state changes in this shell.
  const handleSubmit = useCallback(
    async (input: CreateFundSourceInput) => {
      await mutateAsync(input);
    },
    [mutateAsync],
  );
  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const form = (
    <CreateFundSourceForm
      id={FORM_ID}
      onSubmit={handleSubmit}
      onDirtyChange={handleDirtyChange}
    />
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
            <div className="overflow-y-auto px-4">{form}</div>
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
          <div className="max-h-[80vh] overflow-y-auto px-0.5">{form}</div>
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
