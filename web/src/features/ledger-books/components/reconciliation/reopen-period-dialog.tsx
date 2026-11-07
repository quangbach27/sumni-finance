import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useReopenLedgerPeriod } from '../../api/reopen-ledger-period';

type Props = {
  periodUuid: string;
  periodName: string;
  label: string;
  variant?: 'outline' | 'default';
  disabled?: boolean;
  /** Tooltip explaining why the button is disabled. */
  disabledReason?: string;
};

/** Button + dialog that reopens a closed period (reason required). */
export default function ReopenPeriodButton({
  periodUuid,
  periodName,
  label,
  variant = 'outline',
  disabled,
  disabledReason,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useReopenLedgerPeriod();

  const submit = async () => {
    setError(undefined);
    try {
      await mutateAsync({ uuid: periodUuid, reason: reason.trim() });
      setOpen(false);
      await navigate({ to: '/ledger-books' });
    } catch (e) {
      setError(formatApiError(e, 'Không thể mở lại kỳ.').message);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mở lại {periodName}?</DialogTitle>
            <DialogDescription>
              Kỳ sẽ trở lại trạng thái đang mở để ghi bút toán điều chỉnh. Bạn
              cần đóng kỳ và đối soát lại sau đó.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do mở lại kỳ"
            aria-label="Lý do mở lại kỳ"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Huỷ
            </Button>
            <Button onClick={submit} disabled={isPending || !reason.trim()}>
              {isPending ? 'Đang mở lại...' : 'Mở lại kỳ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
