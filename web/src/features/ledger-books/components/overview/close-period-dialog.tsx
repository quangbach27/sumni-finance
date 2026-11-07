import { useState } from 'react';

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

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useCloseLedgerPeriod } from '../../api/close-ledger-period';

type ClosePeriodButtonProps = {
  periodUuid: string;
  periodName: string;
  className?: string;
};

/** "Đóng kỳ" button with a confirmation dialog. */
export default function ClosePeriodButton({
  periodUuid,
  periodName,
  className,
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
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <span className="hidden md:inline">Đóng kỳ để đối soát</span>
        <span className="md:hidden">Đóng kỳ</span>
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đóng {periodName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi đóng, bạn không thể ghi thêm bút toán. Số dư từng nguồn
              quỹ sẽ được chốt để đối soát với thực tế.
            </AlertDialogDescription>
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
