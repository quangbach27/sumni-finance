import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Tags } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

import { getCategoriesQueryOptions } from '../../api/get-categories';
import CategoryAccordion from './category-accordion';
import CategoryDetail from './category-detail';
import CategoryList from './category-list';

export default function CategoriesPage() {
  const { data, isPending, isError } = useQuery(getCategoriesQueryOptions());
  const [selectedUuid, setSelectedUuid] = useState<string>();

  if (isPending) return <Skeleton className="mt-6 h-64 w-full" />;
  if (isError) {
    return <p className="text-destructive mt-6">Không thể tải danh mục.</p>;
  }

  if (data.items.length === 0) {
    return (
      <Empty className="mt-6 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Tags />
          </EmptyMedia>
          <EmptyTitle>Chưa có danh mục</EmptyTitle>
          <EmptyDescription>
            Nhấn &quot;Thêm danh mục&quot; để tạo danh mục và thẻ đầu tiên.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Falls back to the first category when nothing (or a vanished one) is selected.
  const selected =
    data.items.find((c) => c.uuid === selectedUuid) ?? data.items[0];

  return (
    <>
      <div className="mt-6 lg:hidden">
        <CategoryAccordion categories={data.items} />
      </div>
      <div className="mt-6 hidden items-start gap-4 lg:grid lg:grid-cols-[minmax(260px,1fr)_2fr]">
        <CategoryList
          categories={data.items}
          selectedUuid={selected.uuid}
          onSelect={setSelectedUuid}
        />
        <CategoryDetail key={selected.uuid} category={selected} />
      </div>
    </>
  );
}
