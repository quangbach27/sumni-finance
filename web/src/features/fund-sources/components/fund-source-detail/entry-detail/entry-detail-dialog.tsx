import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

import { useIsMobile } from '@/hooks/use-mobile';

import { getLedgerEntryQueryOptions } from '../../../api/get-ledger-entry';
import EntryDetailNormal, { normalEntrySubtitle } from './entry-detail-normal';
import EntryDetailVoided, { voidedEntrySubtitle } from './entry-detail-voided';

type EntryDetailDialogProps = {
  /** Entry to show; the dialog is closed when undefined. */
  entryUuid: string | undefined;
  onEntryChange: (uuid: string | undefined) => void;
};

export default function EntryDetailDialog({
  entryUuid,
  onEntryChange,
}: EntryDetailDialogProps) {
  const isMobile = useIsMobile();
  const { data: entry } = useQuery({
    ...getLedgerEntryQueryOptions(entryUuid ?? ''),
    enabled: Boolean(entryUuid),
  });

  const voided = entry?.status === 'voided';
  const title = entry?.description ?? 'Chi tiết bút toán';
  const titleNode = (
    <span className="flex flex-wrap items-center gap-3">
      <span className={voided ? 'line-through' : undefined}>{title}</span>
      {voided && (
        <Badge
          variant="outline"
          className="border-destructive text-destructive"
        >
          Đã hủy
        </Badge>
      )}
    </span>
  );
  const description = !entry
    ? 'Chi tiết bút toán'
    : voided
      ? voidedEntrySubtitle(entry)
      : normalEntrySubtitle(entry);

  const body = !entry ? (
    <Skeleton className="h-56 w-full rounded-xl" />
  ) : voided ? (
    <EntryDetailVoided entry={entry} onSelectEntry={onEntryChange} />
  ) : (
    <EntryDetailNormal entry={entry} />
  );
  const note = voided
    ? 'Chỉ để xem. Không tính vào tổng thu chi của kỳ.'
    : undefined;
  const close = () => onEntryChange(undefined);
  const closeButton = <Button onClick={close}>Đóng</Button>;

  if (isMobile) {
    return (
      <Drawer
        open={Boolean(entryUuid)}
        onOpenChange={(open) => !open && close()}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{titleNode}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">{body}</div>
          <DrawerFooter>
            {note && <p className="text-muted-foreground text-sm">{note}</p>}
            {closeButton}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={Boolean(entryUuid)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{titleNode}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">{note}</p>
          {closeButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
