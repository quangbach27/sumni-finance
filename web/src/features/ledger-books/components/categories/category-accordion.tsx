import { useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { CategoryTags, EditCategoryButton } from './category-detail';
import CreateCategoriesTrigger from './create-categories-trigger';

import type { CategoryResponse } from '../../api/get-categories';

type Props = { categories: CategoryResponse[] };

/** Mobile layout: one expandable card per category. */
export default function CategoryAccordion({ categories }: Props) {
  const [openUuid, setOpenUuid] = useState<string | undefined>(
    categories[0]?.uuid,
  );

  return (
    <div className="flex flex-col gap-3">
      {categories.map((category) => {
        const open = category.uuid === openUuid;
        return (
          <section
            key={category.uuid}
            className="bg-card overflow-hidden rounded-xl border shadow-sm"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenUuid(open ? undefined : category.uuid)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold">
                  {category.name}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {category.sub_categories.length} thẻ
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'text-muted-foreground size-5 shrink-0 transition-transform',
                  open && 'rotate-180',
                )}
              />
            </button>
            {open && (
              <div className="border-t">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-muted-foreground text-sm">
                    {category.description ?? 'Chưa có mô tả'}
                  </p>
                  <EditCategoryButton category={category} />
                </div>
                <div className="border-t">
                  <CategoryTags category={category} compact />
                </div>
              </div>
            )}
          </section>
        );
      })}
      <CreateCategoriesTrigger variant="outline" className="w-full" />
    </div>
  );
}
