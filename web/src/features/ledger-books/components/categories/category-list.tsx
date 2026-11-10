import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import CreateCategoriesTrigger from './create-categories-trigger';

import type { CategoryResponse } from '../../api/get-categories';

type Props = {
  categories: CategoryResponse[];
  selectedUuid: string;
  onSelect: (uuid: string) => void;
};

export default function CategoryList({
  categories,
  selectedUuid,
  onSelect,
}: Props) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold">Danh mục</h2>
        <span className="text-muted-foreground text-sm">
          {categories.length} danh mục
        </span>
      </div>
      <ul className="divide-y">
        {categories.map((category) => {
          const selected = category.uuid === selectedUuid;
          return (
            <li key={category.uuid}>
              <button
                type="button"
                aria-current={selected}
                onClick={() => onSelect(category.uuid)}
                className={cn(
                  'hover:bg-muted/50 flex w-full items-center justify-between gap-3 border-l-4 border-transparent px-5 py-3 text-left',
                  selected && 'border-primary bg-muted/60',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {category.name}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {category.sub_categories.length} thẻ
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t p-4">
        <CreateCategoriesTrigger variant="outline" className="w-full" />
      </div>
    </div>
  );
}
