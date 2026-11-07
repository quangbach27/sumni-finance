import { cn } from 'cn';

import type React from 'react';

type ContentLayoutProps = {
  title: string;
  titleAdornment?: React.ReactNode;
  description?: string;
  className?: string;
  children: React.ReactNode;
  additionalContent?: React.ReactNode;
};

export default function ContentLayout({
  title,
  titleAdornment,
  description,
  className,
  children,
  additionalContent,
}: ContentLayoutProps) {
  return (
    <section className={cn('mx-auto w-full max-w-7xl p-4 md:p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">{title}</h1>
            {titleAdornment}
          </div>
          {description && (
            <span className="text-muted-foreground hidden md:block">
              {description}
            </span>
          )}
        </div>

        {additionalContent && additionalContent}
      </div>
      {children}
    </section>
  );
}
