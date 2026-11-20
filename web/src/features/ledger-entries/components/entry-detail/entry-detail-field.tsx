import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export default function EntryDetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
