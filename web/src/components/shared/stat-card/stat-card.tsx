import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type React from 'react';

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'primary';
  className?: string;
};

export default function StatCard({
  label,
  value,
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
      <CardContent>{value}</CardContent>
    </Card>
  );
}
