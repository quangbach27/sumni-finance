import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

export default function SuggestCategoriesButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      className={cn(
        'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary',
        className,
      )}
    >
      <Sparkles data-icon="inline-start" />
      Gợi ý danh mục
    </Button>
  );
}
