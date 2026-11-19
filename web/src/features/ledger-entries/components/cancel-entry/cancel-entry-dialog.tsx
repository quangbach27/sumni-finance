import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';
import { getFundSourceQueryOptions } from '@/features/fund-sources/api/get-fund-source';

import { useIsMobile } from '@/hooks/use-mobile';
import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

import { getLedgerEntryQueryOptions } from '../../api/get-ledger-entry';
import { useVoidLedgerEntry } from '../../api/void-ledger-entry';
import { isInflow } from '../entry-detail/entry-detail-format';

import type { LedgerEntry } from '../../api/types';

const MAX_REASON = 200;
const REASONS = [
  'Nhập nhầm số tiền',
  'Nhập trùng',
  'Sai nguồn quỹ',
  'Sai danh mục',
  'Khác',
] as const;

type Props = {
  /** Entry to cancel; the dialog is closed when undefined. */
  entryUuid: string | undefined;
  onClose: () => void;
};

const signed = (entry: LedgerEntry, reversed = false) => {
  const plus = isInflow(entry) !== reversed;
  return `${plus ? '+' : '−'}${formatAmount(entry.amount, 'VND')}`;
};

function EntrySummary({ entry }: { entry: LedgerEntry }) {
  const inflow = isInflow(entry);
  return (
    <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-xl border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-semibold">{entry.description}</p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
          {formatDate(new Date(entry.occurred_at))} · {entry.category?.name}
          {entry.tag && (
            <Badge variant="outline" className="border-dashed">
              {entry.tag.name}
            </Badge>
          )}
          · {entry.fund_source.bank_code ?? entry.fund_source.name}
        </p>
      </div>
      <p
        className={cn(
          'text-xl font-bold tabular-nums',
          inflow ? 'text-primary' : 'text-destructive',
        )}
      >
        {signed(entry)}
      </p>
    </div>
  );
}

function AfterCancelPreview({ entry }: { entry: LedgerEntry }) {
  const { data } = useQuery(getFundSourceQueryOptions(entry.fund_source.uuid));
  const balance = data?.fundSource.balance;
  // The reversal has the opposite direction of the entry.
  const after =
    balance === undefined
      ? undefined
      : isInflow(entry)
        ? balance - entry.amount
        : balance + entry.amount;
  const reversalPositive = !isInflow(entry);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Sau khi hủy
      </h3>
      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="text-muted-foreground text-sm">
            {formatDate(new Date(entry.occurred_at))}
          </span>
          <span className="font-medium">Bút toán gốc</span>
          <Badge
            variant="outline"
            className="border-destructive text-destructive"
          >
            Đã hủy
          </Badge>
          <span className="text-muted-foreground ml-auto tabular-nums line-through">
            {signed(entry)}
          </span>
        </div>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="text-muted-foreground text-sm">Nay</span>
          <span className="font-medium">Bút toán đảo</span>
          <Badge variant="secondary">Tự tạo</Badge>
          <span
            className={cn(
              'ml-auto font-semibold tabular-nums',
              reversalPositive ? 'text-primary' : 'text-destructive',
            )}
          >
            {signed(entry, true)}
          </span>
        </div>
        <div className="bg-primary/10 text-primary flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
          <span>Số dư {entry.fund_source.name}</span>
          {balance === undefined || after === undefined ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-muted-foreground font-normal">
                {formatAmount(balance, 'VND')}
              </span>
              <ArrowRight className="size-4" />
              <span className="font-bold">{formatAmount(after, 'VND')}</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

type FormProps = {
  entry: LedgerEntry;
  mobile: boolean;
  onClose: () => void;
};

function CancelEntryForm({ entry, mobile, onClose }: FormProps) {
  const [reason, setReason] = useState('');
  const [chip, setChip] = useState<string>();
  const [error, setError] = useState<string>();
  const { mutateAsync, isPending } = useVoidLedgerEntry();

  const pickChip = (value: string) => {
    setChip(value);
    // "Khác" leaves the text for the user to write.
    setReason(value === 'Khác' ? '' : value);
  };

  const submit = async () => {
    setError(undefined);
    try {
      await mutateAsync({ uuid: entry.uuid, reason: reason.trim() });
      onClose();
    } catch (e) {
      setError(formatApiError(e, 'Không thể hủy bút toán.').message);
    }
  };

  const canSubmit = reason.trim().length > 0 && !isPending;

  return (
    <>
      <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-4 sm:px-6 sm:pt-2">
        <EntrySummary entry={entry} />
        <AfterCancelPreview entry={entry} />

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            Lý do hủy <span className="text-destructive">*</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={chip === r ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => pickChip(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <Textarea
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Lý do hủy"
            className="min-h-20"
          />
          <p className="text-muted-foreground flex justify-between gap-4 text-xs">
            <span>
              Bắt buộc. Lý do, người hủy và thời gian được lưu cùng bút toán.
            </span>
            <span className="shrink-0 tabular-nums">
              {reason.length}/{MAX_REASON}
            </span>
          </p>
        </section>

        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          Chỉ hủy được khi kỳ còn mở. Sau khi đóng kỳ, dùng bút toán điều chỉnh.
        </p>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <div
        className={cn(
          'flex gap-3 border-t p-4',
          mobile ? '[&>*]:flex-1' : 'justify-end px-6',
        )}
      >
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          Giữ bút toán
        </Button>
        <Button variant="destructive" disabled={!canSubmit} onClick={submit}>
          {isPending ? 'Đang hủy...' : 'Hủy bút toán'}
        </Button>
      </div>
    </>
  );
}

export default function CancelEntryDialog({ entryUuid, onClose }: Props) {
  const isMobile = useIsMobile();
  const { data: entry } = useQuery({
    ...getLedgerEntryQueryOptions(entryUuid ?? ''),
    enabled: Boolean(entryUuid),
  });
  const open = Boolean(entryUuid);

  // Remount the form per entry so the reason never leaks between entries.
  const body = entry ? (
    <CancelEntryForm
      key={entry.uuid}
      entry={entry}
      mobile={isMobile}
      onClose={onClose}
    />
  ) : (
    <div className="px-4 pb-4 sm:px-6">
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              Hủy bút toán
            </DrawerTitle>
            <DrawerDescription>
              Không xóa. Hệ thống ghi thêm bút toán đảo.
            </DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-6">
          <DialogTitle className="text-2xl font-bold">Hủy bút toán</DialogTitle>
          <DialogDescription>
            Bút toán không bị xóa. Hệ thống ghi thêm bút toán đảo để giữ lịch sử
            và số dư.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4" />
        {body}
      </DialogContent>
    </Dialog>
  );
}
