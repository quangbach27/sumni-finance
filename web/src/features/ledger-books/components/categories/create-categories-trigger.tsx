import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { LazyDialogTrigger } from '@/components/shared/lazy-trigger/lazy-trigger';

import SuggestCategoriesButton from './suggest-categories-button';

import type { ComponentProps } from 'react';

const load = () => import('./create-categories-dialog');

type Props = {
  variant?: ComponentProps<typeof Button>['variant'];
  className?: string;
  /** Renders the "Gợi ý danh mục" button, which opens the dialog prefilled. */
  suggest?: boolean;
};

export default function CreateCategoriesTrigger({
  variant,
  className,
  suggest,
}: Props) {
  return (
    <LazyDialogTrigger
      load={load}
      dialogProps={suggest ? { prefillSuggestions: true } : undefined}
    >
      {(triggerProps) =>
        suggest ? (
          <SuggestCategoriesButton {...triggerProps} className={className} />
        ) : (
          <Button {...triggerProps} variant={variant} className={className}>
            <Plus data-icon="inline-start" />
            Thêm danh mục
          </Button>
        )
      }
    </LazyDialogTrigger>
  );
}
