import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';

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

import { StatusAlertProvider } from '@/components/shared/status-alert/status-alert-provider';

import { getFundSourcesQueryOptions } from '@/features/fund-sources/api/get-fund-sources';

import { useIsMobile } from '@/hooks/use-mobile';

import { getLedgerPeriodsQueryOptions } from '../../api/get-ledger-periods';
import {
  getOpenLedgerPeriodDefaultValues,
  openLedgerPeriodSchema,
  useOpenLedgerPeriod,
} from '../../api/open-ledger-period';
import OpenLedgerPeriodEmpty from './open-ledger-period-empty';
import OpenLedgerPeriodForm from './open-ledger-period-form';

import type { OpenLedgerPeriodFormValues } from '../../api/open-ledger-period';
import type { Resolver } from 'react-hook-form';

const FORM_ID = 'open-ledger-period-form';

const TITLE = 'Mở kỳ mới';
const DESCRIPTION = 'Bắt đầu kỳ sổ để ghi thu chi.';
const EMPTY_HINT = 'Thêm xong, quay lại Sổ cái để mở kỳ mới.';

type OpenLedgerPeriodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OpenLedgerPeriodDialog(
  props: OpenLedgerPeriodDialogProps,
) {
  return (
    <StatusAlertProvider>
      <OpenLedgerPeriodDialogContent {...props} />
    </StatusAlertProvider>
  );
}

function OpenLedgerPeriodDialogContent({
  open,
  onOpenChange,
}: OpenLedgerPeriodDialogProps) {
  const { mutate, isPending } = useOpenLedgerPeriod();

  const { data: fundSources = [], isSuccess: fundSourcesLoaded } = useQuery({
    ...getFundSourcesQueryOptions(),
    enabled: open,
  });
  const isEmptyFundSources = fundSourcesLoaded && fundSources.length === 0;

  const { data: periods } = useQuery({
    ...getLedgerPeriodsQueryOptions({ pageSize: 1, status: 'reconciled' }),
    enabled: open,
  });
  const previousPeriod = periods?.items.at(0);

  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Owned here, above the Drawer/Dialog switch, so values survive the
  // breakpoint changing (which remounts everything below).
  const form = useForm<OpenLedgerPeriodFormValues>({
    resolver: zodResolver(
      openLedgerPeriodSchema,
    ) as Resolver<OpenLedgerPeriodFormValues>,
    defaultValues: getOpenLedgerPeriodDefaultValues(previousPeriod?.closeDate),
  });

  // The previous period loads after the form is created; sync defaults
  // without overwriting anything the user already typed.
  const previousCloseDate = previousPeriod?.closeDate;
  useEffect(() => {
    form.reset(getOpenLedgerPeriodDefaultValues(previousCloseDate), {
      keepDirtyValues: true,
    });
  }, [previousCloseDate, form]);

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
  };

  const handleSubmit = (
    values: OpenLedgerPeriodFormValues,
    { onError }: { onError: (error: unknown) => void },
  ) => {
    mutate(
      { values, fundSourceUuids: fundSources.map((f) => f.uuid) },
      {
        onSuccess: () => {
          toast.add({
            type: 'success',
            title: `Đã mở kỳ "${values.name}".`,
          });
          onOpenChange(false);
        },
        onError,
      },
    );
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
  if (isMobile) {
    return (
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
    );
  }

  return (
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
        <div className="max-h-[80vh] overflow-y-auto px-0.5">{formContent}</div>
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
  );
}
