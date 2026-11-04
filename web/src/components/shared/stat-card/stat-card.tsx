import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type React from 'react';

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  /** Secondary line under the value. */
  description?: React.ReactNode;
  /** Extra content under the description, e.g. a progress bar. */
  footer?: React.ReactNode;
  variant?: 'default' | 'primary';
  className?: string;
};

export default function StatCard({
  label,
  value,
  description,
  footer,
  variant = 'default',
  className,
}: StatCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <Card
      className={cn(
        isPrimary && 'bg-primary text-primary-foreground border-transparent',
        className,
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn(!isPrimary && 'text-muted-foreground', 'font-normal')}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div>{value}</div>
        {description && (
          <p
            className={cn(
              'text-sm',
              !isPrimary && 'text-muted-foreground',
              isPrimary && 'text-primary-foreground/80',
            )}
          >
            {description}
          </p>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
