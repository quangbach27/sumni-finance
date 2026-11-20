import { Loader2 } from 'lucide-react';

/** Full-page loading state shown while a route is pending. */
export default function PendingPage() {
  return (
    <div
      role="status"
      className="text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm"
    >
      <Loader2 className="size-4 animate-spin" />
      <span>Đang tải…</span>
    </div>
  );
}
