import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { LazyDialogProps } from './lazy-trigger';

type Props = LazyDialogProps & { title?: string };

/** Story-only dialog, loaded lazily by the LazyDialogTrigger stories. */
export default function LazyTriggerDemoDialog({
  open,
  onOpenChange,
  title = 'Dialog đã tải',
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Mã của dialog chỉ được tải khi di chuột vào hoặc nhấn nút.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
