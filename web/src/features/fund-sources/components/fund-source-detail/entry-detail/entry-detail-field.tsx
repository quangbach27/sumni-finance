import type { ReactNode } from 'react';

export default function EntryDetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
