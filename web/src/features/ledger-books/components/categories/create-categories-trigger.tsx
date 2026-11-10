import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { LazyDialogTrigger } from '@/components/shared/lazy-trigger/lazy-trigger';

import type { ComponentProps } from 'react';

const load = () => import('./create-categories-dialog');

type Props = {
  variant?: ComponentProps<typeof Button>['variant'];
  className?: string;
};

export default function CreateCategoriesTrigger({ variant, className }: Props) {
  return (
    <LazyDialogTrigger load={load}>
      {(triggerProps) => (
        <Button {...triggerProps} variant={variant} className={className}>
          <Plus data-icon="inline-start" />
          Thêm danh mục
        </Button>
      )}
    </LazyDialogTrigger>
  );
}
