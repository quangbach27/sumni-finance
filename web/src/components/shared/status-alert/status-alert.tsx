import { cva } from 'class-variance-authority';
import { cn } from 'cn';
import { Check, TriangleAlert, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { VariantProps } from 'class-variance-authority';
import type React from 'react';

const statusAlertVariants = cva(
  'flex w-full items-start gap-4 rounded-2xl px-5 py-4 shadow-sm',
  {
    variants: {
      variant: {
        success: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'success' },
  },
);

export type StatusAlertProps = VariantProps<typeof statusAlertVariants> & {
  title: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
};

export default function StatusAlert({
  variant = 'success',
  title,
  children,
  onDismiss,
  className,
  ref,
}: StatusAlertProps) {
  const Icon = variant === 'success' ? Check : TriangleAlert;

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(statusAlertVariants({ variant }), className)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">{title}</p>
        {children && <div className="text-sm opacity-90">{children}</div>}
      </div>
      {onDismiss && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Đóng"
          onClick={onDismiss}
          className="shrink-0 rounded-lg bg-white/15 text-current hover:bg-white/25 hover:text-current"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
