import { Loader2Icon } from 'lucide-react';

export default function OrgSwitchOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background/80 fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-sm"
    >
      <Loader2Icon className="text-muted-foreground size-8 animate-spin" />
      <span className="text-muted-foreground text-sm">
        Đang chuyển tổ chức...
      </span>
    </div>
  );
}
