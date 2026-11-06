import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
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

import { getFundSourcesQueryOptions } from '@/features/fund-sources/api/get-fund-sources';

import { useIsMobile } from '@/hooks/use-mobile';

import OpenLedgerPeriodEmpty from './open-ledger-period-empty';
import OpenLedgerPeriodForm from './open-ledger-period-form';
import { getLedgerPeriodsQueryOptions } from '../api/get-ledger-periods';
import {
  getOpenLedgerPeriodDefaultValues,
  openLedgerPeriodSchema,
  useOpenLedgerPeriod,
} from '../api/open-ledger-period';

import type { OpenLedgerPeriodFormValues } from '../api/open-ledger-period';
import type { Resolver } from 'react-hook-form';

const FORM_ID = 'open-ledger-period-form';

const TITLE = 'Mở kỳ mới';
const DESCRIPTION = 'Bắt đầu kỳ sổ để ghi thu chi.';
const EMPTY_HINT = 'Thêm xong, quay lại Sổ cái để mở kỳ.';

type OpenLedgerPeriodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OpenLedgerPeriodDialog({
  open,
  onOpenChange,
}: OpenLedgerPeriodDialogProps) {
  const isMobile = useIsMobile();
  const { mutateAsync, isPending } = useOpenLedgerPeriod();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: fundSourcesData, isSuccess: fundSourcesLoaded } = useQuery({
    ...getFundSourcesQueryOptions(),
    enabled: open,
  });
  const fundSources = fundSourcesData ?? [];
  const isEmptyFundSources = fundSourcesLoaded && fundSources.length === 0;
  const navigate = useNavigate();
  const { data: periods } = useQuery({
    ...getLedgerPeriodsQueryOptions({ page_size: 1 }),
    enabled: open,
  });
  const previousPeriod = periods?.items[0];

  // Owned here, above the Drawer/Dialog switch, so values survive the
  // breakpoint changing (which remounts everything below).
  const form = useForm<OpenLedgerPeriodFormValues>({
    resolver: zodResolver(
      openLedgerPeriodSchema,
    ) as Resolver<OpenLedgerPeriodFormValues>,
    defaultValues: getOpenLedgerPeriodDefaultValues(),
  });
  const { isDirty } = form.formState;

  // Reset on open (not close) so fields don't blank out during the exit
  // animation. Re-runs when the previous period loads, until the user edits.
  useEffect(() => {
    if (open && !form.formState.isDirty) {
      form.reset(getOpenLedgerPeriodDefaultValues(previousPeriod));
    }
  }, [open, previousPeriod, form]);

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    if (!next) {
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

  const handleSubmit = async (values: OpenLedgerPeriodFormValues) => {
    await mutateAsync({
      values,
      fundSourceUuids: fundSources.map((f) => f.uuid),
    });
  };

  const goToFundSources = () => {
    onOpenChange(false);
    navigate({ to: '/fund-sources' }).catch(() => {});
  };

  const formContent = isEmptyFundSources ? (
    <OpenLedgerPeriodEmpty />
  ) : (
    <OpenLedgerPeriodForm
      id={FORM_ID}
      form={form}
      fundSources={fundSources}
      previousPeriod={previousPeriod}
      onSubmit={handleSubmit}
    />
  );

  const name = form.watch('name').trim();

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
      {isPending ? 'Đang mở kỳ...' : name ? `Mở kỳ ${name}` : 'Mở kỳ mới'}
    </Button>
  );

  const laterButton = (
    <Button
      type="button"
      variant="outline"
      onClick={() => onOpenChange(false)}
      className="h-10"
    >
      Để sau
    </Button>
  );
  const addFundSourceButton = (
    <Button type="button" onClick={goToFundSources} className="h-10">
      <Wallet data-icon="inline-start" />
      Thêm nguồn quỹ
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
              {isEmptyFundSources ? (
                <>
                  <p className="text-muted-foreground text-center text-sm">
                    {EMPTY_HINT}
                  </p>
                  {addFundSourceButton}
                  {laterButton}
                </>
              ) : (
                <>
                  {submitButton}
                  {cancelButton}
                </>
              )}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{TITLE}</DialogTitle>
            <DialogDescription>{DESCRIPTION}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto px-0.5">
            {formContent}
          </div>
          <DialogFooter>
            {isEmptyFundSources ? (
              <>
                <p className="text-muted-foreground text-sm sm:mr-auto sm:self-center">
                  {EMPTY_HINT}
                </p>
                {laterButton}
                {addFundSourceButton}
              </>
            ) : (
              <>
                {cancelButton}
                {submitButton}
              </>
            )}
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
          <AlertDialogTitle>Hủy mở kỳ mới?</AlertDialogTitle>
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
