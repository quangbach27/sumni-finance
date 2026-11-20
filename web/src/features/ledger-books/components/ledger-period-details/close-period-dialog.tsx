import { useState } from 'react';

import { Lock } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import {
  useOptionalStepFlowActions,
  useStepFlowActions,
} from '@/components/shared/step-flow/step-flow-context';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useCloseLedgerPeriod } from '../../api/close-ledger-period';

type ClosePeriodButtonProps = {
  periodUuid: string;
  periodName: string;
  className?: string;
  variant?: 'destructive' | 'outline';
};

const closeDescription =
  'Sau khi đóng, bạn không thể ghi thêm bút toán. Số dư từng nguồn quỹ sẽ được chốt để đối soát với thực tế.';

const getCloseLabel = (periodName: string) =>
  `Đóng kỳ ${periodName} để đối soát`;

/**
 * "Đóng kỳ" button. Inside a `<StepFlow>` it confirms through the flow's dialog and moves
 * the flow forward; elsewhere (period list) it uses its own confirmation dialog.
 */
export default function ClosePeriodButton(props: ClosePeriodButtonProps) {
  const flow = useOptionalStepFlowActions();
  return flow ? (
    <FlowClosePeriodButton {...props} />
  ) : (
    <StandaloneClosePeriodButton {...props} />
  );
}

function FlowClosePeriodButton({
  periodUuid,
  periodName,
  className,
  variant = 'destructive',
}: ClosePeriodButtonProps) {
  const { openConfirm } = useStepFlowActions();
  const { mutateAsync } = useCloseLedgerPeriod();

  return (
    <Button
      variant={variant}
      className={className}
      onClick={() =>
        openConfirm({
          title: `Đóng ${periodName}?`,
          description: closeDescription,
          confirmLabel: getCloseLabel(periodName),
          action: () => mutateAsync(periodUuid),
        })
      }
    >
      <Lock data-icon="inline-start" />
      {getCloseLabel(periodName)}
    </Button>
  );
}

function StandaloneClosePeriodButton({
  periodUuid,
  periodName,
  className,
  variant = 'destructive',
}: ClosePeriodButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const { mutateAsync, isPending } = useCloseLedgerPeriod();

  const confirm = async () => {
    setError(undefined);
    try {
      await mutateAsync(periodUuid);
      setOpen(false);
    } catch (e) {
      setError(formatApiError(e, 'Không thể đóng kỳ.').message);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Lock data-icon="inline-start" />
        {getCloseLabel(periodName)}
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng {periodName}?</AlertDialogTitle>
            <AlertDialogDescription>{closeDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Huỷ</AlertDialogCancel>
            <Button onClick={confirm} disabled={isPending}>
              {isPending ? 'Đang đóng...' : 'Đóng kỳ'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
